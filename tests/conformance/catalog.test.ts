import { describe, it, expect } from 'vitest';
import { corpusDir, corpusPath, specsDir , requireSibling } from '../../tools/corpus/sibling-repos'
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import parse from '../../src/parser/index';
import { runFile, kindOf, ELSEWHERE, isSuiteFile } from '../../tools/corpus/runner';

/**
 * The corpus CATALOGUE must describe the corpus that exists.
 *
 * `catalog.io` is what a port reads to select and report on subsets — "run the tokenizer suites,
 * say validation is not attempted yet". It is generated from the suites, so it cannot drift by
 * being edited; it CAN drift by not being regenerated after cases are added, and then a port is
 * quietly told the wrong shape. These tests catch exactly that.
 *
 * Regenerate with:  npx tsx tools/corpus/catalog.ts
 */

const here = path.dirname(fileURLToPath(import.meta.url));
const CORPUS = corpusDir() ?? '';
const CATALOG = path.join(CORPUS, 'catalog.io');

const present = fs.existsSync(CATALOG);

/** Every `.io` suite file — the index itself is not one. */
function corpusFiles(dir: string): string[] {
  const out: string[] = [];
  for (const entry of fs.readdirSync(dir, { withFileTypes: true }).sort((a, b) => a.name < b.name ? -1 : 1)) {
    if (entry.name.startsWith('.') || entry.name === 'node_modules') continue;
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) out.push(...corpusFiles(full));
    else if (isSuiteFile(entry.name)) out.push(full);
  }
  return out;
}

// In CI this must FAIL rather than skip: a skipped conformance suite is
// indistinguishable from a passing one, and that is how all 1,769 of these went unrun.
requireSibling('corpus', present);

describe.skipIf(!present)('corpus catalogue', () => {
  const doc: any = present ? parse(fs.readFileSync(CATALOG, 'utf8'), null) : null;

  it('is itself a valid Internet Object document', () => {
    expect((doc.getErrors?.() ?? []).map((e: any) => e.errorCode)).toEqual([]);
  });

  const rows: any[] = present ? (doc.toObject()?.data ?? doc.toObject() ?? []) : [];
  const files = present ? corpusFiles(CORPUS) : [];
  const rel = (f: string) => path.relative(CORPUS, f).replace(/\\/g, '/');

  it('lists every suite file, and only those', () => {
    expect(rows.map(r => r.path).sort()).toEqual(files.map(rel).sort());
  });

  it('gives each file the kind its runner will actually use', () => {
    for (const r of rows) {
      expect(kindOf('/' + r.path), r.path).toBe(r.kind);
    }
  });

  it('counts each file correctly, and valid + invalid add up', async () => {
    for (const r of rows) {
      expect(r.valid + r.invalid, `${r.path}: total`).toBe(r.total);
    }

    // Cross-check the counts against the RUNNER rather than against another scan of the same
    // text: a shared miscount would agree with itself. Suites run elsewhere are skipped here.
    for (const f of files) {
      const row = rows.find(r => r.path === rel(f));
      expect(row, `${rel(f)} missing from catalog`).toBeDefined();
      if (ELSEWHERE.has(kindOf('/' + rel(f)))) continue;
      const result = await runFile(f);
      expect(result.cases.length, `${rel(f)}: case count`).toBe(row!.total);
    }
  });

  it('reports the same grand total as the corpus holds', () => {
    const catalogued = rows.reduce((n, r) => n + r.total, 0);
    expect(catalogued).toBeGreaterThan(0);
    // The header states the total in prose; a mismatch there misleads a human reader.
    const stated = /(\d+)\s+cases/.exec(fs.readFileSync(CATALOG, 'utf8'));
    expect(stated, 'catalog.io description should state the case count').not.toBeNull();
    expect(Number(stated![1])).toBe(catalogued);
  });
});
