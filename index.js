const request = require('request');
const mongodb = require('mongodb');
const env = require('./env');
const repos = env.repos;

const mongodb_url = 'mongodb://localhost:27017/fb-devrel';
const github_api_base_url = 'https://api.github.com';

var collection;

mongodb.connect(mongodb_url, (err, mongo_client) => {
  
  if (err) {
    console.log('Error connecting to Mongo: ' + err);
  }

  let db = mongo_client.db('fb-devrel');
  console.log("Connected successfully to server");
  
  
  db.collection('github', (err, coll) => {
    collection = coll;
    repos.forEach(repo_info => {
      getRepoData(repo_info.org, repo_info.name);  
    })
    
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