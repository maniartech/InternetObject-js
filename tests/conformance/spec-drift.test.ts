import { describe, it, expect } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';
import { specsDir, requireSibling } from '../../tools/corpus/sibling-repos';
import '../../src/schema/types/index';
import TypedefRegistry from '../../src/schema/typedef-registry';

/**
 * The specification and the implementation must not drift apart.
 *
 * `io-specs` is the **authority**; this library is a derivation of it (CONFORMANCE.md). So a name
 * the implementation knows and the specification has never heard of is a defect — either the
 * feature was built and never written down, or the specification is stale. Neither is allowed to
 * sit unnoticed, and neither is resolved by preferring whichever is more convenient.
 *
 * **What this catches, and what it cannot.** This is a *mechanical* check over names: error codes,
 * registered type names, and the keywords the schema layer reads. It is exact and cheap, and it is
 * the shallowest of the three drift surfaces:
 *
 *   1. names          — here, and now gated;
 *   2. spec examples   — `io-specs: npm run check:examples`, 240 executed against this parser;
 *   3. **prose**       — ungated. A page can be fully covered by cases and still contain a stale
 *                        sentence. Nothing detects that but reading it.
 *
 * So a green run here means "no name drifted", never "the spec is accurate".
 *
 * **Adding to `KNOWN` is a decision, not a silencer.** Every entry carries the reason it is not a
 * defect. An entry with no reason, or one whose reason has expired, is worse than a failing test.
 */
const SPECS = specsDir() ?? '';
const present = fs.existsSync(SPECS);
requireSibling('specs', present);

/** Names that are legitimately absent from the specification, each with why. */
const KNOWN: Record<string, string> = {
  // OPEN — awaiting a decision. Raised by the drift audit, 2026-09-01.
  // Thrown when serializing a document that holds a failed record. The question is whether that is
  // a FORMAT rule ("a file must not contain error nodes" — normative, belongs in io-specs) or a
  // LIBRARY rule ("this API refuses to write one" — implementation concern, belongs in the README).
  // Until that is decided it stays here, visible, rather than silently missing.
  'forbidden-error-node': 'OPEN: format rule or library rule? See FUTURE.md.',
};

function specText(): string {
  let out = '';
  (function walk(d: string) {
    for (const f of fs.readdirSync(d)) {
      // `.claude` holds git worktrees — scanning them doubles the corpus of text and can mask a
      // real gap by matching a copy of a page that is no longer live.
      if (f === 'node_modules' || f === '.git' || f === '.claude' || f === '.github') continue;
      const p = path.join(d, f);
      if (fs.statSync(p).isDirectory()) walk(p);
      else if (f.endsWith('.md')) out += fs.readFileSync(p, 'utf8');
    }
  })(SPECS);
  return out;
}

describe.skipIf(!present)('the specification and the implementation do not drift', () => {
  const text = specText();

  it('every error code the implementation can emit appears in io-specs', () => {
    const dir = path.resolve(__dirname, '../../src/errors');
    const src = fs.readdirSync(dir).filter((f) => f.endsWith('-codes.ts'))
      .map((f) => fs.readFileSync(path.join(dir, f), 'utf8')).join('\n');
    const codes = [...new Set([...src.matchAll(/['"]([a-z]+(?:-[a-z0-9]+)+)['"]/g)].map((m) => m[1]))];

    const missing = codes.filter((c) => !text.includes(c) && !(c in KNOWN));
    expect(missing, `error codes not documented in io-specs: ${missing.join(', ')}`).toEqual([]);
    expect(codes.length).toBeGreaterThan(50);   // the check is worthless if the scrape returns nothing
  });

  it('every registered schema type appears in io-specs', () => {
    const types = [...TypedefRegistry.types];
    const missing = types.filter((t) => !text.includes(`\`${t}\``) && !(t in KNOWN));
    expect(missing, `types registered but undocumented: ${missing.join(', ')}`).toEqual([]);
    expect(types.length).toBeGreaterThan(20);
  });

  it('the KNOWN list has a reason for every entry', () => {
    for (const [name, why] of Object.entries(KNOWN)) {
      expect(why.length, `${name} is allowlisted with no reason`).toBeGreaterThan(20);
    }
  });
});
