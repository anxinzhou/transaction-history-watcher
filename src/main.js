historyGetter = require('./transactionHistory');

// paras: walletId, page, offset
// return: promise txs array
historyGetter.getEthTransactionHistory("0x88d6F234b6327b7a9d9d23014EFd6E05b6Dc8943",1,10)
    .then(txs=>console.log(txs.length))
    .catch(console.log);

historyGetter.getTokenTransactionHistory("0x88d6F234b6327b7a9d9d23014EFd6E05b6Dc8943",4,10)
.then(txs=>console.log(txs.length))
    .catch(console.log);
