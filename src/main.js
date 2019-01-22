getTranctionHistory = require('./transactionHistory');

// paras: walletId, page, offset
// return: promise txs array
getTranctionHistory("0x88d6F234b6327b7a9d9d23014EFd6E05b6Dc8943",1,10)
    .then(console.log)
    .catch(console.log);