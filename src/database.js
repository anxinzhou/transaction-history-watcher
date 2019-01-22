const MongoClient = require('mongodb').MongoClient;
const util = require('util');
const _=require('lodash');

function Database(config) {
    if(!(this instanceof Database)) {
        throw new Error("Database can only be new");
    }
    const dbConfig = require(config);
    this.url = `mongodb://${dbConfig.host}:${dbConfig.port}`;
    this.db = MongoClient.connect(this.url,{ useNewUrlParser: true }).then(client=> client.db(dbConfig.database));
    this.collection = this.getCollection(dbConfig.collectionName);
    this.checkPointCollection = this.getCollection(dbConfig.checkPointCollection);
    this.initialCheckpoint = "10147500";
}

Database.prototype.getCollection = function(collectionName) {
   return this.db.then(db=> db.collection(collectionName));
};

Database.prototype.insertOne = function(document) {
    return this.collection.then(c => c.insertOne(document));
};

Database.prototype.insertMany = function(documents) {
    return this.collection.then(c => c.insertMany(documents))
};

Database.prototype.createIndex = function(index,opts) {
    return this.collection.then(c=> c.createIndex(index,opts))
};

Database.prototype.find = function(query,...funcs) {
    return this.collection.then(c=>
            eval(['c.find(query)',...funcs].join('.'))
        .toArray())
};

Database.prototype.setCheckPoint = function(val) {
    return this.checkPointCollection.then(c=> c.findOneAndUpdate({},{$set: {
            checkpoint: val
        }}))
};

Database.prototype.getCheckPoint = async function() {
    try {
        let c = await this.checkPointCollection;
        let checkPoints = await c.find().toArray();
        if(checkPoints.length === 0) {
            await c.insertOne({
                checkpoint: this.initialCheckPoint
            });
            return this.initialCheckPoint;
        } else {
            return checkPoints[0];
        }
    } catch (e) {
        throw e
    }
};

module.exports = Database;