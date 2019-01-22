const _=require('lodash');
const Web3 = require('web3');

function Contract(config) {
    if(!(this instanceof Contract)) {
        throw new Error("Contract can only be new");
    }
    const chainConfig = require(config);
    this.abi = chainConfig.abi;
    this.web3 = new Web3(new Web3.providers.WebsocketProvider(chainConfig.uri));
    this.contractAddress = chainConfig.contractAddress;
    this.subscribeEventsConfig = chainConfig.subscribeEventsConfig;
    let events = new Set(_.keys(this.subscribeEventsConfig));
    this.topicEventMap = bindEventsWithTopics(this.web3,this.abi,events);
    this.eventIndexedParasMap = bindEventsWithIndexedPara(this.abi,events);
    this.fetchTransactionInterval = 100;
}

function bindEventsWithTopics(web3,abi, events) {
    return _.chain(abi)
        .filter(v=> v.type === "event" && events.has(v.name)
        )
        .map(v=> {
            let funcParas=[];
            v.inputs.forEach(v=>{
                funcParas.push(v.type)
            });
            let topic = `${v.name}(${funcParas.join(',')})`;
            return [web3.utils.keccak256(topic),v.name]
        })
        .reduce((mapping, pair)=>{
            mapping[pair[0]] = pair[1];
            return mapping
        },{})
        .value();
}

function bindEventsWithIndexedPara(abi,events) {
    return  _.chain(abi)
        .filter(v=>
            v.type==="event" && events.has(v.name)
        )
        .map(v=> [v.name,_.chain(v.inputs).filter(input=> input.indexed)
            .map(input=>input.name).value()] )
        .reduce((mapping,pair)=>{
            mapping[pair[0]] = pair[1];
            return mapping
        },{})
        .value();
}

function formatBlockTimestamp(timestamp) {
    let d = new Date(timestamp*1000);
    let hour = timePadding(d.getHours(),2);
    let miniute = timePadding(d.getMinutes(),2);
    let second = timePadding(d.getSeconds(),2);
    let year = timePadding(d.getFullYear(),4);
    let month = timePadding(d.getMonth()+1,2);
    let date = timePadding(d.getDate(),2);
    return `${hour}:${miniute}:${second}T${year}${month}${date}`
}

function timePadding(time, digit){
    return (Array(digit).fill(0).join('') + time).slice(-digit);
}

Contract.prototype.saveLog = async function(log) {
    let receipt =await this.web3.eth.getTransactionReceipt(log.transactionHash);
    if (!receipt.status){
        return   //skip fail transaction
    }

    let tx = await this.web3.eth.getTransaction(log.transactionHash);
    let block = await this.web3.eth.getBlock(log.blockHash);
    let event = this.topicEventMap[log.topics[0]];
    let indexedParas = this.eventIndexedParasMap[event];
    let indexedParasMapping = _.zipObject(indexedParas,log.topics.slice(1));

    const messageBase = 10**18;
    let fromAmountAlias = this.subscribeEventsConfig[event].fromAmountAlias;

    let txToStore = {
        _id: tx.hash,   // mongodb primary key
        date: formatBlockTimestamp(block.timestamp),
        hash:tx.hash,
        fromType: this.subscribeEventsConfig[event].fromType,
        from: tx.from,
        amount: indexedParasMapping[fromAmountAlias]/ messageBase,  // divide decimal which is defined as 10^18
        to: tx.to,
        toType: this.subscribeEventsConfig[event].toType,
        gasFee: eval(receipt.cumulativeGasUsed) * eval(tx.gasPrice) / messageBase // messured by ether
    };
    return txToStore
};

Contract.prototype.subscribeTx = function (callback) {

    this.web3.eth.subscribe('logs', {
        address: this.contractAddress,
        topics: [_.keys(this.topicEventMap)]
    })
        .on('data', log=>{
            Contract.prototype.saveLog.call(this,log,callback)
                .then(tx=>callback(tx))
                .catch(console.log);
        })
};

Contract.prototype.getHistoryTxFromCheckPoint= async function (checkpoint,callback) {
    let cp = eval(await checkpoint.get());
    let latestBlock = eval(await this.web3.eth.getBlockNumber());
    if(cp === latestBlock) {
        return;
    }
    console.log("get transaction history start from checkpoint "+cp);
    console.log("latestBlock:", latestBlock);

    try {
        const interval = this.fetchTransactionInterval;
        for(let i=cp;i<=latestBlock;i+=interval) {
            if(i>latestBlock) {
                break;
            }
            let logs = await this.web3.eth.getPastLogs({
                fromBlock: i.toString(),
                toBlock: (i+interval)>latestBlock? latestBlock.toString():(i+interval).toString(),
                address: this.contractAddress,
                topics: [_.keys(this.topicEventMap)],
            });
            if(logs.length === 0) {
                continue;
            }
            let txs = await Promise.all(_.chain(logs).map(
                log=> Contract.prototype.saveLog.call(this,log)
            ).value());
            console.log(`writing ${txs.length} transactions to db`);
            await callback(txs);
        }
    } catch (err){
        throw(err);
    } finally {
        await checkpoint.set(latestBlock+1);
    }
};

module.exports = Contract;