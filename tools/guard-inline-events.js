#!/usr/bin/env node
const fs = require('fs');
const path = require('path');

const ROOT = process.cwd();
// Strict guard: only fail on risky inline calls that previously caused outages (toggleRecall)
const HTML_EVENT_ATTR_PATTERN = /\sonclick\s*=\s*(["']).*?toggleRecall\(.*?\1/gi;
const FILES_TO_SCAN = [
  'index.html',
  'dynapharm-complete-system.html',
  'dynapharm-complete-system-with-data.html',
  'stock-management-portal.html',
  'gm-portal.html',
  'mis-portal.html',
  'standalone.html'
];

function scanFile(filePath) {
  if (!fs.existsSync(filePath)) return [];
  const content = fs.readFileSync(filePath, 'utf8');
  const hits = [];
  let match;
  while ((match = HTML_EVENT_ATTR_PATTERN.exec(content))) {
    const snippet = content.substr(Math.max(0, match.index - 60), Math.min(120, content.length - match.index));
    hits.push({ index: match.index, snippet });
  }
  return hits;
}

let foundIssues = false;
const report = [];

for (const rel of FILES_TO_SCAN) {
  const file = path.join(ROOT, rel);
  const hits = scanFile(file);
  if (hits.length > 0) {
    foundIssues = true;
    report.push(`\n[${rel}] Found ${hits.length} risky inline handler(s) (toggleRecall):`);
    hits.slice(0, 5).forEach((h, i) => {
      report.push(`  ${i + 1}) ...${h.snippet.replace(/\n/g, ' ')}...`);
    });
    if (hits.length > 5) report.push(`  (and ${hits.length - 5} more)`);
  }
}

if (foundIssues) {
  console.error('\n❌ Guard failed: Inline event handlers detected. Use data-attributes + addEventListener instead.');
  console.error(report.join('\n'));
  process.exit(1);
}

console.log('✅ Guard passed: No risky inline handlers found.');

