const request = require('request');

const mongodb = require('mongodb');
const mongodb_url = 'mongodb://localhost:27017/fb-devrel';

const github_api_base_url = 'https://api.github.com';

var db;
var collection;

mongodb.connect(mongodb_url, (err, mongo_client) => {
  
  if (err) {
    console.log('Error connecting to Mongo: ' + err);
  }

  console.log("Connected successfully to server");
  
  db = mongo_client.db('fb-devrel');
  db.collection('github', (err, coll) => {
    collection = coll;
    getRepoData('fbsamples', 'messenger-platform-samples');
    
  })  
  
});

function getRepoData(org, repo) {

  let request_options = {
    "url": `${github_api_base_url}/repos/${org}/${repo}`,
    "method": "GET",
    "headers": {
      "User-agent": "Github Stats Client"
    }
  }

  request(request_options, (err, res, body) => {

    body = JSON.parse(body);
    
    let date = new Date().setHours(0,0,0,0);

    let stars = body.stargazers_count;
    let forks = body.forks_count;
    let watchers = body.subscribers_count;

    let stats = {
      "watchers": watchers,
      "stars": stars,
      "forks": forks          
    }

    collection.findOne({_id: date}).then(doc => {
      let document = {};
      document[repo] = stats;
      if (!doc) {
        document["_id"] = date;
        document[repo] = stats;
        collection.insertOne(document);
      } else {
        document[repo] = stats;
        collection.updateOne({_id: date}, {$set: document});
      }
    });    
  })

}

function writeDocument (document) {

}