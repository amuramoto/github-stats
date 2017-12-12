const request = require('request-promise');
const mongodb = require('mongodb');
const env = require('./env');


const mongodb_url = 'mongodb://localhost:27017/fb-devrel';

mongodb.connect(mongodb_url, (err, mongo_client) => {

  const repos = env.repos;
  
  if (err) {
    console.log('Error connecting to Mongo: ' + err);
  }

  const db = mongo_client.db(env.mongo_db);
  console.log("Connected successfully to server");
  
  
  repos.forEach(repo_info => {    

    let date = new Date().setUTCHours(0,0,0,0);
    db.collection(repo_info.name, {'strict': true}, (err, collection) => {
      
      getRepoData(repo_info.owner, repo_info.name).then(repo_data => {
        console.log(repo_data)
        // writeDocument(repo_data, collection);
      });

      if (err) {

      } else {

      }
          
    })  
  });
  
});

async function getRepoData(owner, name) {
  let repo_data = {};
  let stats = await getStats(owner, name);   
  let traffic = await getTraffic(owner, name);
  let clones = await getClones(owner, name);
  let paths = await getPaths(owner, name);
  let referrers = await getReferrers(owner, name);
  return Object.assign(repo_data, stats, traffic, clones, paths, referrers);     
}

async function getStats (owner, repo) {
    let github_path = `/repos/${owner}/${repo}`
    let repo_info = await callGitHubAPI(github_path);
    
    repo_info = JSON.parse(repo_info);      
    let stars = repo_info.stargazers_count;
    let forks = repo_info.forks_count;
    let watchers = repo_info.subscribers_count;
    return  {
      "watchers": watchers,
      "stars": stars,
      "forks": forks          
    };
}

async function getTraffic (owner, repo) {
    let github_path = `/repos/${owner}/${repo}/traffic/views?per=day`
    let traffic = await callGitHubAPI(github_path);    
    return JSON.parse(traffic);

}

async function getClones (owner, repo) {
    
    let github_path = `/repos/${owner}/${repo}/traffic/clones?per=day`;
    let clones = await callGitHubAPI(github_path);    
    return JSON.parse(clones);
}

async function getPaths (owner, repo) {
  let github_path = `/repos/${owner}/${repo}/traffic/popular/paths`;
  let paths = await callGitHubAPI(github_path);    
  paths = JSON.parse(paths)
  return { 'paths': paths };
}

async function getReferrers (owner, repo) {
  let github_path = `/repos/${owner}/${repo}/traffic/popular/referrers`;
  let referrers = await callGitHubAPI(github_path);
  referrers = JSON.parse(referrers);      
  return { 'referrers': referrers };
}

function parseDaily(data_arr) {
  
  let date = new Date().setUTCHours(0,0,0,0);  
  let daily_stats = {
    'total': 0,
    'uniques': 0
  }

  for (let i = data_arr.length - 1; i >= 0; i--) {    
    if (new Date(data_arr[i].timestamp).getTime() === date - 86400000) {
      daily_stats.total = data_arr[i].count;
      daily_stats.unique = data_arr[i].uniques;      
      break;
    }
  }
  
  return daily_stats;
}

async function callGitHubAPI (path) {
  const github_api_base_url = 'https://api.github.com';
  const token = env.github_token;
  let request_options = {
      "url": `${github_api_base_url}${path}`,
      "method": "GET",
      "headers": {
        "User-agent": "Github Stats Client",
        'Authorization': 'token ' + token 
      }
    }

    let response = await request(request_options);    
    return response;
}

function createDocument () {

}


function writeDocument (repo_data, collection) {
  
 
  // for (let i = 0; i < repo_data.length; i ++) {
  //   let views = parseRepoData(repo_data[i], date);
  //   repo_data[i].views = views;
  // }

  collection.findOne({_id: date}).then(doc => {    
    if (!doc) {
      document["_id"] = date;
      collection.insertOne(document);
    } else {
      collection.updateOne({_id: date}, {$set: document});
    }
  });
}