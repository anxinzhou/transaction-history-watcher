const _=require('lodash');
const axios = require('axios');
const config = require('../etc/contractConfig');
const contractAddress = config.contractAddress;
const maxIteration = 100000;

module.exports = {
    getEthTransactionHistory: getEthTransactionHistory,
    getTokenTransactionHistory: getTokenTransactionHistory,
};

async function getEthTransactionHistory(walletId, page, offset) {
    const uri = getUri(walletId,page,offset);
    try {
        const res = await axios.get(uri);
        return _.chain(res.data.result).map(tx=>{
            return {
                date: formatBlockTimestamp(tx.timeStamp),
                hash: tx.hash,
                from: tx.from,
                to: tx.to,
                value: tx.value/10**18,
                isError: tx.isError!=='0',
                gasFee: eval(tx.cumulativeGasUsed)*eval(tx.gasPrice)/10**18,
                isContractCreation:  isContractCreation(tx),
                contractAddress: tx.contractAddress,
                isSlot: isSlot(tx),
            }
        }).value();
    } catch(e) {
        throw e
    }
}

async function getTokenTransactionHistory(walletId, page, offset) {
    let start = (page-1) * offset;
    let end = page*offset;
    let count = 0;
    let result = [];
    for(let i =1; i<maxIteration; ++i) {
        try {
            let uri = getUri(walletId,i,offset);
            const res = await axios.get(uri);
            console.log("data length: "+res.data.result.length);
            if(res.data.result.length === 0) {
                break;
            }
            _.forEach(res.data.result,(tx=>{
                if(isSlot(tx)) {
                    if(count>=start) {
                        result.push({
                            date: formatBlockTimestamp(tx.timeStamp),
                            hash: tx.hash,
                            from: tx.from,
                            to: tx.to,
                            value: tx.value/10**18,
                            isError: tx.isError!=='0',
                            gasFee: eval(tx.cumulativeGasUsed)*eval(tx.gasPrice)/10**18,
                            isContractCreation:  isContractCreation(tx),
                            contractAddress: tx.contractAddress,
                            isSlot: isSlot(tx),
                        });
                    }
                    count+=1;
                }
                if(count === end) {
                    return false;
                }
            }))
            if(count === end) {
                break;
            }
        } catch(e) {
            throw e
        }
    }
    return result;
}

function isSlot(tx) {
    return tx.to === contractAddress || tx.from === contractAddress || tx.contractAddress === contractAddress;
}

function isTokenRelated(tx, tokenAddress) {
    return tx.to === tokenAddress || tx.from === tokenAddress || tx.contractAddress === tokenAddress;
}

function isContractCreation(tx) {
    return tx.to===''
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

function getUri(walletId, page, offset) {
    let queryParas = {
        module: "account",
        action: "txlist",
        address: walletId,
        startblock: 0,
        endblock: 99999999,
        page: page,
        offset: offset, // transactions per page
        sort: "desc",
        apikey: config.apiKey,
    };
    const paras = _.chain(queryParas)
        .reduce((paras,v,k)=>{
            paras.push(`${k}=${v}`);
            return paras;
        },[])
        .value()
        .join('&');
    return config.apiHost + '?' + paras;
}