const { githubRequest } = require('./_helpers.cjs');

async function main() {
  // Step 1: Create GitHub repo
  console.log('=== Step 1: Creating GitHub repo ===');
  const createRes = await githubRequest('POST', '/user/repos', {
    name: 'aif-seismic-anomaly-radar-b56adf82',
    description: 'Seismic Anomaly Radar',
    private: false
  });
  console.log('Create repo status:', createRes.status);
  if (createRes.status === 422) {
    console.log('Repo already exists, continuing...');
  } else if (createRes.status === 201) {
    console.log('Repo created successfully');
  } else {
    console.log('Unexpected response:', createRes.text);
  }

  // Verify repo exists
  const checkRes = await githubRequest('GET', '/repos/runsmlee/aif-seismic-anomaly-radar-b56adf82');
  console.log('Repo check status:', checkRes.status);
  if (checkRes.json) {
    console.log('Repo URL:', checkRes.json.html_url);
  }
}

main().catch(e => { console.error(e); process.exit(1); });
