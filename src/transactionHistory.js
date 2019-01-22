const _=require('lodash');
const Web3 = require('web3');
const web3 = new Web3(new Web3.providers.WebsocketProvider("wss://kovan.infura.io/ws"));
const axios = require('axios');
const config = require('../etc/contractConfig');
const contractAddress = config.contractAddress;

module.exports = async function getTranctionHistory(walletId, page, offset) {
    const host = "https://api-kovan.etherscan.io/api";
    let queryParas = {
        module: "account",
        action: "txlist",
        address: walletId,
        startblock: 0,
        endblock: 99999999,
        page: page,
        offset: offset, // transactions per page
        sort: "desc",
        apikey: "PPMC2BNNWMGHYVJ1N8GSGNJB9ED34A2T3Y"
    };
    const paras = _.chain(queryParas)
        .reduce((paras,v,k)=>{
            paras.push(`${k}=${v}`);
            return paras;
        },[])
        .value()
        .join('&');
    const uri = host + '?' + paras;
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
};

function isSlot(tx) {
    return tx.to === contractAddress || tx.from === contractAddress;
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

