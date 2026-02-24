import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { performance } from 'node:perf_hooks';

// Importing directly from the local build to measure real performance
import { pruneCss, resolveContentFiles, scanContentForClassUsage } from '../dist/index.js';

/**
 * Simplified benchmark for BonsaiCSS.
 * Goal: Measure cache impact and AST processing speed.
 */

// Args with defaults.
const FILES_COUNT = parseInt(process.argv.find(a => a.startsWith('--files='))?.split('=')[1]) || 300;
const CLASSES_COUNT = parseInt(process.argv.find(a => a.startsWith('--classes='))?.split('=')[1]) || 2500;
const ITERATIONS = 5;

// Helpers for generating bulk test data
const buildCss = (count) => 
  Array.from({ length: count }, (_, i) => [
    `.u-${i} { padding: ${(i % 8) + 1}px; }`,
    `.x-${i} { margin: ${(i % 10) + 1}px; }`
  ].join('\n')).join('\n');

const buildHtml = (idx, count) => {
  // Simulating real files
  const classes = Array.from({ length: 20 }, () => `u-${Math.floor(Math.random() * count)}`);
  return `
    <section class="container ${classes.join(' ')}">
      <div class="card">
        <button class="u-1 u-2">Action</button>
      </div>
    </section>
  `;
};

function setupFixture() {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'bonsai-bench-'));
  const src = path.join(root, 'src');
  
  fs.mkdirSync(src, { recursive: true });
  
  for (let i = 0; i < FILES_COUNT; i++) {
    fs.writeFileSync(path.join(src, `page-${i}.html`), buildHtml(i, CLASSES_COUNT));
  }
  
  fs.writeFileSync(path.join(root, 'styles.css'), buildCss(CLASSES_COUNT));
  return root;
}

function runBenchmark(cwd) {
  const start = performance.now();
  
  const files = resolveContentFiles(['src/**/*.html'], cwd);
  const scan = scanContentForClassUsage(files, { cwd, keepDynamicPatterns: true });
  
  const css = fs.readFileSync(path.join(cwd, 'styles.css'), 'utf8');
  const result = pruneCss(css, scan, { minify: true });
  
  const end = performance.now();

  return {
    total: parseFloat((end - start).toFixed(2)),
    files: files.length,
    classes: scan.classes.size,
    reduction: `${((1 - result.stats.prunedSize / result.stats.originalSize) * 100).toFixed(1)}%`
  };
}

// Main Execution
const tempDir = setupFixture();
console.log(`\n🚀 Starting benchmark at: ${tempDir}`);
console.log(`Config: ${FILES_COUNT} files, ${CLASSES_COUNT} classes\n`);

try {
  const coldResults = [];
  const warmResults = [];

  // Cold runs: V8 still optimizing and no disk cache
  for (let i = 0; i < ITERATIONS; i++) {
    coldResults.push(runBenchmark(tempDir));
  }

  // Warm runs: BonsaiCSS internal cache and Node JIT should be warmed up
  for (let i = 0; i < ITERATIONS; i++) {
    warmResults.push(runBenchmark(tempDir));
  }

  console.log('--- COLD RUNS (No cache / cold JIT) ---');
  console.table(coldResults);

  console.log('\n--- WARM RUNS (With scan cache) ---');
  console.table(warmResults);

  // Final calculation
  const avgCold = coldResults.reduce((a, b) => a + b.total, 0) / coldResults.length;
  const avgWarm = warmResults.reduce((a, b) => a + b.total, 0) / warmResults.length;
  const benchResult = ((1 - avgWarm / avgCold) * 100).toFixed(1);

  console.log('\n--- RESULT ---');
  if (benchResult > 0) {
    console.log(`\nCache reduced execution time by ${benchResult}% on average.`);
  } else {
    const diff = Math.abs(benchResult).toFixed(1);
    console.log(`\nExecution time INCREASED by ${diff}% (potential overhead detected).`);
  }

} catch (err) {
  console.error('Benchmark failed:', err.message);
} finally {
  // Silent cleanup
  fs.rmSync(tempDir, { recursive: true, force: true });
}
