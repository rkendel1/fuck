const fs = require('fs');
const path = require('path');
const { Octokit } = require('@octokit/rest');

const octokit = new Octokit({
  auth: process.env.GITHUB_TOKEN // add your personal access token to env
});

async function pushFileToGitHub(filePath, repoOwner, repoName, branch = 'main') {
  const content = fs.readFileSync(filePath, 'utf-8');
  const relativePath = path.relative(process.cwd(), filePath);

  // Get SHA if file exists
  let sha;
  try {
    const { data } = await octokit.repos.getContent({
      owner: repoOwner,
      repo: repoName,
      path: relativePath,
      ref: branch
    });
    sha = data.sha;
  } catch (err) {
    if (err.status !== 404) throw err;
  }

  await octokit.repos.createOrUpdateFileContents({
    owner: repoOwner,
    repo: repoName,
    path: relativePath,
    message: `Update ${relativePath} via embedify`,
    content: Buffer.from(content).toString('base64'),
    sha,
    branch
  });
  console.log(`✅ Pushed ${relativePath} to GitHub`);
}

module.exports = { pushFileToGitHub };