getTranctionHistory = require('./transactionHistory');

// walletId, page, offset
getTranctionHistory("0x88d6F234b6327b7a9d9d23014EFd6E05b6Dc8943",1,5)
    .then(console.log)
    .catch(console.log);