const request = require('request');
const mongodb = require('mongodb');
const mongodb_url = 'mongodb://localhost:27017/fb-devrel';
var db;

mongodb.connect(mongodb_url, (err, mongo_client) => {
  let collection;
  if (err) {
    console.log('Error connecting to Mongo: ' + err);
  }

  console.log("Connected successfully to server");
  db = mongo_client.db('fb-devrel');
  collection = db.collection('github')
  mongo_client.close();
});

