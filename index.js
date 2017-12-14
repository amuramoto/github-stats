const request = require('request-promise'),
      mongodb = require('mongodb'),      
      env = require('./env'),
      mongodb_info = 'mongodb://' + env.mongo.address;

// connect to mongodb
mongodb.connect(mongodb_info, async (err, mongo_client) => {

  if (err) {
    console.log('Error connecting to Mongo: ' + err);
    return;
  }

  console.log("Connected successfully to server");
  let collection
  let db = mongo_client.db(env.mongo.db_name);
  let repo_data = await getRepos();
  for (let name in repo_data) {    
    let documents;
    collection = await db.collection(name);
    documents = createDocuments(repo_data[name]);      

    try {
      // collection already exists
      await collection.stats()  
      //create document for yesterday
      collection.insertOne(documents.pop(), (err, res) => {console.log('ok')});      
    } catch (err) {
        // collection is new - create documents for all dates
        documents.forEach(document => {
          collection.insertOne(document, (err, res) => {console.log('ok')}); 
       
        })
    }
    
    // writeDocuments(documents, collection);
  }  
});

async function getRepos() {
  const repos = env.repos;
  const repo_data = {};
  for (let repo_info of repos) {    
    repo_data[repo_info.name] = await getRepoData(repo_info.owner, repo_info.name);    
  }  
  return repo_data;
}

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
  let total_count;
  let total_uniques;
  let github_path = `/repos/${owner}/${repo}/traffic/views?per=day`
  let traffic = await callGitHubAPI(github_path);    
  traffic = JSON.parse(traffic);
  total_count = traffic.count;
  total_uniques = traffic.uniques;
  
  for (let i = traffic.views.length - 1; i >=0; i--) {
    
    traffic.views[i]['total_count'] = total_count;
    traffic.views[i]['total_uniques'] = total_uniques;

    // decrement totals
    total_count -= traffic.views[i].count;
    total_uniques -= traffic.views[i].uniques;
  }

  // remove today since it is not complete
  traffic.views.pop();

  return { 'traffic': traffic.views };

}

async function getClones (owner, repo) {    
  let clones; 
  let total_count;
  let total_uniques;
  let github_path = `/repos/${owner}/${repo}/traffic/clones?per=day`;
  let res = await callGitHubAPI(github_path);    
  res = JSON.parse(res); 
  total_count = res.count;
  total_uniques = res.uniques;
  clones = res.clones;    
  
  for (let i = clones.length - 1; i >=0; i--) {
    
    clones[i]['total_count'] = total_count;
    clones[i]['total_uniques'] = total_uniques;

    // decrement totals
    total_count -= clones[i].count;
    total_uniques -= clones[i].uniques;
  }

  // remove today since it is not complete
  clones.pop();    
  return { 'clones': clones };
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

function createDocuments (repo_data) {
  let documents = [];

  for (let i = 0; i < repo_data.traffic.length; i++) {    
    let document = JSON.parse(JSON.stringify(repo_data));
    document.traffic = repo_data.traffic[i];
    document.clones = repo_data.clones[i];
    document._id = new Date(repo_data.traffic[i].timestamp).getTime();
    documents.push(document);
  }

  return documents;
}

function writeDocuments (documents, collection) {
 
  // documents.forEach(document => collection.insertOne(document);)
 
}