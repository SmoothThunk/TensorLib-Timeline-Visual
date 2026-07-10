#!/usr/bin/env node
// Updates data.json with latest PR merge status from GitHub
// Run locally: GH_TOKEN=your_token node scripts/update-data.js
// Or via GitHub Actions (token provided automatically)

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const DATA_PATH = path.join(__dirname, '..', 'data.json');

async function main() {
  const data = JSON.parse(fs.readFileSync(DATA_PATH, 'utf8'));

  // Update timestamp
  data.meta.lastUpdated = new Date().toISOString();

  // Fetch merged PRs
  try {
    const prsRaw = execSync(
      'gh api repos/leanprover/TensorLib/pulls?state=closed&per_page=50 --jq "[.[] | select(.merged_at != null) | {number, title, merged_at}]"',
      { encoding: 'utf8' }
    );
    const prs = JSON.parse(prsRaw);

    // For each node with a PR reference, check if it's merged
    for (const node of data.nodes) {
      if (node.pr) {
        const pr = prs.find(p => p.number === node.pr);
        if (pr && pr.merged_at) {
          node.status = 'complete';
        }
      }
    }

    console.log(`Updated ${data.nodes.length} nodes, checked ${prs.length} PRs`);
  } catch (e) {
    console.error('Failed to fetch PRs (gh CLI needed):', e.message);
    console.log('Updating timestamp only.');
  }

  fs.writeFileSync(DATA_PATH, JSON.stringify(data, null, 2) + '\n');
  console.log('data.json updated');
}

main();
