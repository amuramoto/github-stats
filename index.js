const request = require('request');
const mongodb = require('mongodb');
const env = require('./env');
const repos = env.repos;

const mongodb_url = 'mongodb://localhost:27017/fb-devrel';
const github_api_base_url = 'https://api.github.com';

mongodb.connect(mongodb_url, (err, mongo_client) => {
  
  if (err) {
    console.log('Error connecting to Mongo: ' + err);
  }

  let db = mongo_client.db(env.mongo.db);
  console.log("Connected successfully to server");
  
  
  db.collection(env.mongo.collection, (err, coll) => {
    getRepoData().then(repo_data => {
      console.log(repo_data)  
    });
    
    
  })  
  
});

function getRepoData() {

  return new Promise ((resolve, reject) => {    
    let promise_arr = [];

    repos.forEach(repo_info => {    
      let repo_data = {};
      repo_data[repo_info.name] = { 'owner': repo_info.owner };

      let stats = getStats(repo_info.owner, repo_info.name);   
      let traffic = getTraffic(repo_info.owner, repo_info.name);
      
      let data_promise = new Promise((resolve, reject) => {
        Promise.all([stats, traffic]).then(data => {        
          Object.assign(repo_data[repo_info.name], data[0], data[1]);       
          resolve(repo_data)
        })
      });

      promise_arr.push(data_promise);
    
    })  
    Promise.all(promise_arr).then(data => resolve(data))

  })
}


function getStats (owner, repo) {
  return new Promise((resolve, reject) => {
    let request_options = {
      "url": `${github_api_base_url}/repos/${owner}/${repo}`,
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

function getTraffic (owner, repo) {
  return new Promise((resolve, reject) => {
    let token = env.github_token;
    let request_options = {
      "url": `${github_api_base_url}/repos/${owner}/${repo}/traffic/views?per=day`,
      "method": "GET",
      "headers": {
        "User-agent": "Github Stats Client",
        'Authorization': 'token ' + token 
      }
    }

    request(request_options, (err, res, body) => {      
      let total_views;
      let unique_views;
      body = JSON.parse(body);

      if (body.views.length >= 2) {
        total_views = body.views[body.views.length-2].count;
        unique_views = body.views[body.views.length-2].uniques;
      } else {
        total_views = unique_views = 0;
      }

      let views = {
        'views': {
          'total': total_views,
          'unique': unique_views
        }        
      }
      resolve(views);
    })
  })

}

function writeDocument (document, collection) {
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