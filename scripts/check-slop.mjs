import fs from 'node:fs';
import path from 'node:path';

const WEB_SRC = path.resolve('apps/web/src');
const EMOJI_REGEX = /[\u{1F300}-\u{1F9FF}\u{2600}-\u{26FF}\u{2700}-\u{27BF}]/u;
const EMDASH_REGEX = /—/;

const FORBIDDEN_CSS_PATTERNS = [
  { pattern: /--gradient-glow/, message: 'Forbidden token --gradient-glow' },
  { pattern: /--gradient-text/, message: 'Forbidden token --gradient-text' },
  { pattern: /--shadow-glow/, message: 'Forbidden token --shadow-glow' },
  { pattern: /text-transform:\s*uppercase/, message: 'Forbidden text-transform: uppercase (use sentence case)' },
  { pattern: /backdrop-filter:\s*blur/, message: 'Forbidden backdrop-filter: blur (use solid surface tokens)' },
];

function getAllFiles(dir, extensions) {
  let results = [];
  const list = fs.readdirSync(dir);
  for (const file of list) {
    const fullPath = path.join(dir, file);
    const stat = fs.statSync(fullPath);
    if (stat.isDirectory()) {
      results = results.concat(getAllFiles(fullPath, extensions));
    } else if (extensions.some(ext => fullPath.endsWith(ext))) {
      results.push(fullPath);
    }
  }
  return results;
}

let violations = [];

// 1. Check TSX / JSX files for emojis and em-dashes
const tsxFiles = getAllFiles(WEB_SRC, ['.tsx', '.jsx']);
for (const file of tsxFiles) {
  const content = fs.readFileSync(file, 'utf8');
  const lines = content.split('\n');

  lines.forEach((line, index) => {
    // Skip single-line comments
    const trimmed = line.trim();
    if (trimmed.startsWith('//') || trimmed.startsWith('/*')) return;

    if (EMOJI_REGEX.test(line)) {
      violations.push({
        file: path.relative(process.cwd(), file),
        line: index + 1,
        message: 'Raw Unicode emoji detected in JSX. Use Lucide icons instead.',
        content: trimmed,
      });
    }

    if (EMDASH_REGEX.test(line)) {
      violations.push({
        file: path.relative(process.cwd(), file),
        line: index + 1,
        message: 'Em-dash (—) detected in JSX. Use commas, colons, or parentheses instead.',
        content: trimmed,
      });
    }
  });
}

// 2. Check CSS Modules for forbidden patterns
const cssFiles = getAllFiles(WEB_SRC, ['.module.css']);
for (const file of cssFiles) {
  const content = fs.readFileSync(file, 'utf8');
  const lines = content.split('\n');

  lines.forEach((line, index) => {
    const trimmed = line.trim();
    if (trimmed.startsWith('/*')) return;

    for (const rule of FORBIDDEN_CSS_PATTERNS) {
      if (rule.pattern.test(line)) {
        violations.push({
          file: path.relative(process.cwd(), file),
          line: index + 1,
          message: rule.message,
          content: trimmed,
        });
      }
    }
  });
}

if (violations.length > 0) {
  console.error('\n❌ AI-Slop Guardrail Check FAILED with ' + violations.length + ' violation(s):\n');
  violations.forEach((v) => {
    console.error(`  ${v.file}:${v.line} - ${v.message}`);
    console.error(`    > ${v.content}\n`);
  });
  process.exit(1);
} else {
  console.log('✓ AI-Slop Guardrail Check PASSED (0 emojis, 0 em-dashes, 0 forbidden styles in apps/web/src)');
  process.exit(0);
}
