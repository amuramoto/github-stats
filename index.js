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

  let document = {}
  document[repo] = {};
  let repo_data = {};
  let stats = getStats(org, repo);   
  let traffic = getTraffic(org, repo);

  Promise.all([stats, traffic]).then(values => {
    Object.assign(document[repo], values[0], values[1]);
console.log('ok')
console.log(document[repo])
  });

    // writeDocument(document);    
  

}

function getStats (org, repo) {
  return new Promise((resolve, reject) => {
    let request_options = {
      "url": `${github_api_base_url}/repos/${org}/${repo}`,
      "method": "GET",
      "headers": {
        "User-agent": "Github Stats Client"
      }
    }

    request(request_options, (err, res, body) => {

      body = JSON.parse(body);
      
      let stars = body.stargazers_count;
      let forks = body.forks_count;
      let watchers = body.subscribers_count;
      let stats =  {
        "watchers": watchers,
        "stars": stars,
        "forks": forks          
      };

      resolve(stats);
    });
  });

}

function getTraffic (org, repo) {
  return new Promise((resolve, reject) => {


    let token = env.github_token;
    let request_options = {
      "url": `${github_api_base_url}/repos/${org}/${repo}/traffic/views?per=day`,
      "method": "GET",
      "headers": {
        "User-agent": "Github Stats Client",
        'Authorization': 'token ' + token 
      }
    }

    request(request_options, (err, res, body) => {
      body = JSON.parse(body);
      let views = {
        'views': {
          'total': body.views[body.views.length-2].count,
          'unique': body.views[body.views.length-2].uniques
        }        
      }
      resolve(views);
    })
  })

}

function writeDocument (document) {
  let date = new Date().setHours(0,0,0,0);
  collection.findOne({_id: date}).then(doc => {    
    if (!doc) {
      document["_id"] = date;    
      collection.insertOne(document);
    } else {
      collection.updateOne({_id: date}, {$set: document});
    }
  });
}