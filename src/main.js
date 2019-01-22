const Database = require('./database');
const Contract = require('./contract');

const contract = new Contract("../etc/contractConfig.json");
const db = new Database("../etc/dbConfig.json");
db.createIndex("from").catch(console.log);
// db.find({},'limit(1)')).then(console.log).catch(console.log)
let checkpoint = {
    get: function() {
        return db.getCheckPoint().then(obj=>obj["checkpoint"])
    },
    set: function (newVal) {
        return db.setCheckPoint(newVal)
    }
};

// checkpoint is default to be db.initialCheckpoint at the beginning
// will start from checkpoint, unless initial=true,
// when initial = true, checkpoint will be set to db.initialCheckpoint
startListening(1000,inital = false);


async function startListening(interval,initial = false) {
    if(initial) {
        await checkpoint.set(db.initialCheckpoint);
    }
    while(1) {
        try {
            await contract.getHistoryTxFromCheckPoint(checkpoint,callback);
        } catch (err) {
            console.log(err.message);
        }
        await sleep(interval)
    }
}

function callback(txs) {
    if(txs.length!==0) {
        return Database.prototype.insertMany.bind(db)(txs);
    }
}

function sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}