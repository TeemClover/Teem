#!/usr/bin/env node
/**
 * CI helper: wait for the Vercel deployment of one commit and print `url=<deployment url>` for $GITHUB_OUTPUT.
 * Reads the GitHub Deployment that Vercel creates for the commit; if Vercel only reported a commit status,
 * falls back to the branch alias (teem-git-<branch>-teemclover.vercel.app), which points at the same build.
 * Env: GITHUB_TOKEN, GITHUB_REPOSITORY, SHA, BRANCH. Waits up to 20 minutes.
 */
const {GITHUB_TOKEN, GITHUB_REPOSITORY, SHA, BRANCH} = process.env;
if (!GITHUB_TOKEN || !GITHUB_REPOSITORY || !SHA) { console.error('GITHUB_TOKEN, GITHUB_REPOSITORY and SHA are required'); process.exit(2); }
const api = path => fetch(`https://api.github.com/repos/${GITHUB_REPOSITORY}${path}`, {headers: {authorization: `Bearer ${GITHUB_TOKEN}`, accept: 'application/vnd.github+json'}}).then(r => r.ok ? r.json() : []);
const sleep = ms => new Promise(r => setTimeout(r, ms));
const alias = () => `https://teem-git-${String(BRANCH || '').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '')}-teemclover.vercel.app`;

for (let i = 0; i < 80; i++) {
  for (const deployment of await api(`/deployments?sha=${SHA}&per_page=20`)) {
    const statuses = await api(`/deployments/${deployment.id}/statuses?per_page=20`);
    const done = statuses.find(s => s.state === 'success' && /vercel\.app/.test(s.environment_url || ''));
    if (done) { console.log(`url=${done.environment_url.replace(/\/$/, '')}`); process.exit(0); }
    if (statuses.some(s => ['failure', 'error'].includes(s.state))) { console.error(`Vercel deployment ${deployment.id} failed`); process.exit(1); }
  }
  const {statuses = []} = await api(`/commits/${SHA}/status`);
  const vercel = statuses.find(s => /^vercel/i.test(s.context));
  if (vercel?.state === 'success' && BRANCH) { console.log(`url=${alias()}`); process.exit(0); }
  if (vercel && ['failure', 'error'].includes(vercel.state)) { console.error(`Vercel status: ${vercel.state} ${vercel.description}`); process.exit(1); }
  await sleep(15000);
}
console.error('No Vercel deployment for this commit after 20 minutes');
process.exit(1);
