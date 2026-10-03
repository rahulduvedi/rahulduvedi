import { writeFile } from 'node:fs/promises';

const username = 'rahulduvedi';
const headers = { Accept: 'application/vnd.github+json' };
if (process.env.GITHUB_TOKEN) headers.Authorization = `Bearer ${process.env.GITHUB_TOKEN}`;

async function search(query, page = 1) {
  const params = new URLSearchParams({ q: query, per_page: '100', page: String(page) });
  const response = await fetch(`https://api.github.com/search/issues?${params}`, { headers });
  if (!response.ok) throw new Error(`GitHub search failed: ${response.status}`);
  const result = await response.json();
  if (result.incomplete_results) throw new Error('GitHub returned incomplete search results');
  return result;
}

const mergedQuery = `author:${username} is:pr is:merged is:public`;
const [merged, open] = await Promise.all([
  search(mergedQuery),
  search(`author:${username} is:pr is:open is:public`),
]);
const mergedItems = [...merged.items];
for (let page = 2; mergedItems.length < merged.total_count; page++) {
  const next = await search(mergedQuery, page);
  if (!next.items.length) throw new Error('GitHub did not return all merged pull requests');
  mergedItems.push(...next.items);
}
const projects = new Set(mergedItems.map(pr => pr.repository_url)).size;
const date = new Date().toISOString().slice(0, 10);
const metrics = [
  [merged.total_count, 'merged public PRs', '#22d3ee'],
  [projects, 'upstream projects', '#34d399'],
  [open.total_count, 'open public PRs', '#a78bfa'],
];
const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="900" height="190" viewBox="0 0 900 190" role="img" aria-labelledby="title description">
<title id="title">Rahul's open source activity</title>
<desc id="description">${merged.total_count} merged public pull requests across ${projects} projects, and ${open.total_count} open public pull requests. Updated ${date}.</desc>
<defs><linearGradient id="edge"><stop stop-color="#22d3ee"/><stop offset=".5" stop-color="#34d399"/><stop offset="1" stop-color="#a78bfa"/></linearGradient></defs>
<rect x="1" y="1" width="898" height="188" rx="18" fill="#0b1220" stroke="#25324c"/>
<path d="M30 37H870" stroke="url(#edge)" stroke-width="2" opacity=".7"/>
<text x="30" y="26" fill="#94a3b8" font-family="monospace" font-size="14" letter-spacing="2">OPEN SOURCE SIGNAL</text>
${metrics.map(([value, label, color], i) => `<g transform="translate(${150 + i * 300} 0)"><text x="0" y="108" text-anchor="middle" fill="${color}" font-family="system-ui,sans-serif" font-size="54" font-weight="750">${value}</text><text x="0" y="140" text-anchor="middle" fill="#cbd5e1" font-family="system-ui,sans-serif" font-size="23">${label}</text></g>`).join('')}
<text x="450" y="171" text-anchor="middle" fill="#64748b" font-family="monospace" font-size="13">Public GitHub data · refreshed ${date} UTC</text>
</svg>`;
await writeFile('assets/oss-signal.svg', svg + String.fromCharCode(10));
console.log(`Updated public OSS signal: ${merged.total_count} merged PRs, ${projects} projects, ${open.total_count} open PRs`);
