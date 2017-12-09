const request = require('request-promise');
const mongodb = require('mongodb');
const env = require('./env');
const repos = env.repos;

const mongodb_url = 'mongodb://localhost:27017/fb-devrel';

mongodb.connect(mongodb_url, (err, mongo_client) => {
  
  if (err) {
    console.log('Error connecting to Mongo: ' + err);
  }

  let db = mongo_client.db(env.mongo.db);
  console.log("Connected successfully to server");
  
  
  db.collection(env.mongo.collection, (err, collection) => {
    getRepoData().then(repo_data => {
      console.log(repo_data)
      // writeDocument(repo_data, collection);
    });    
  })  
  
});

async function getRepoData() {

  return new Promise ((resolve, reject) => {    
    let promise_arr = [];

    repos.forEach(repo_info => {    
      let repo_data = {};
      repo_data[repo_info.name] = { 'owner': repo_info.owner };

      let stats = getStats(repo_info.owner, repo_info.name);   
      let traffic = getTraffic(repo_info.owner, repo_info.name);
      let clones = getClones(repo_info.owner, repo_info.name);
      let paths = getPaths(repo_info.owner, repo_info.name);
      let referrers = getReferrers(repo_info.owner, repo_info.name);
      let data_promise = new Promise((resolve, reject) => {
        Promise.all([stats, traffic, clones, paths, referrers]).then(data => {        
          Object.assign(repo_data[repo_info.name], data[0], data[1], data[2], data[3], data[4]);       
          resolve(repo_data)
        })
      });

      promise_arr.push(data_promise);
    
    })  
    Promise.all(promise_arr).then(data => resolve(data))

  })
}

function parseRepoData (repo_data) {  
  let document = {};  
  
  for (i = 0; i < repo_data.length; i++) {
    for (let repo in repo_data[i]) {            
      // repo_data[i][repo].views = parseViewsData(repo_data[i][repo].views);
    }
  }
  // console.log(repo_data)
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
    traffic = JSON.parse(traffic);
    return { 
      'traffic': {
        'total': traffic.count,
        'uniques': traffic.uniques,
        'daily': parseYesterday(traffic.views)
      }
    }

}

async function getClones (owner, repo) {
    
    let github_path = `/repos/${owner}/${repo}/traffic/clones?per=day`;
    let clones = await callGitHubAPI(github_path);    
    clones = JSON.parse(clones)
    return { 
      'clones': {
        'total': clones.count,
        'uniques': clones.uniques,
        'daily': parseYesterday(clones.clones)
      }
    }
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

function parseYesterday(data_arr) {
  
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

function writeDocument (repo_data, collection) {
  let date = new Date().setUTCHours(0,0,0,0);
 
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