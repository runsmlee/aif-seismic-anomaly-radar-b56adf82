// Helper for making HTTP requests using Node.js built-in fetch
const fs = require('fs');

async function githubRequest(method, path, body) {
  const opts = {
    method,
    headers: {
      'Authorization': `token ${process.env.GITHUB_TOKEN}`,
      'Content-Type': 'application/json',
      'User-Agent': 'deploy-script'
    }
  };
  if (body) opts.body = JSON.stringify(body);
  const res = await fetch(`https://api.github.com${path}`, opts);
  const text = await res.text();
  let json = null;
  try { json = JSON.parse(text); } catch {}
  return { status: res.status, json, text };
}

async function vercelRequest(method, path, body) {
  const teamId = process.env.VERCEL_TEAM_ID;
  const token = process.env.VERCEL_API_TOKEN;
  const url = new URL(`https://api.vercel.com${path}`);
  if (teamId && !url.searchParams.has('teamId')) {
    url.searchParams.set('teamId', teamId);
  }
  const opts = {
    method,
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json'
    }
  };
  if (body) opts.body = JSON.stringify(body);
  const res = await fetch(url.toString(), opts);
  const text = await res.text();
  let json = null;
  try { json = JSON.parse(text); } catch {}
  return { status: res.status, json, text };
}

module.exports = { githubRequest, vercelRequest };
