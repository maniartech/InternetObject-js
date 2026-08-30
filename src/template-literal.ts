import Decimal from './core/decimal/decimal';
import InternetObject from './core/internet-object';
import Collection from './core/collection';
import TypedefRegistry from './schema/typedef-registry';
import registerTypes from './schema/types';
import MemberDef from './schema/types/memberdef';

/**
 * Serializes a JavaScript value as an Internet Object **literal**, for interpolation into a
 * template tag.
 *
 * ## Why this exists
 *
 * The tags used to build their source by plain concatenation — `acc + str + args[i]` — which made
 * every interpolated value **source code** rather than a value. Ordinary data then changed the
 * document's structure:
 *
 * ```
 * name = 'Smith, John'    -> {"1":"John","name":"Smith","age":30}   surname split into a member
 * qty  = '1,000'          -> {"1":0,"qty":1}                        one thousand became one
 * site = 'https://x.com'  -> null                                   whole document lost
 * ```
 *
 * No attacker required: a name with a comma, a URL, a time, a formatted number. Three corrupt
 * silently, three return null, none throws.
 *
 * Every `${...}` now lands in exactly one slot, whatever it contains.
 *
 * ## Why not `stringifyAnyValue`
 *
 * That serializer covers the scalars correctly and is reused here through the same typedefs, but its
 * plain-object branch emits values **without keys** (`{NYC}`) because an `any`-typed member takes its
 * names from the schema. An interpolated object has no schema to recover them from, so it must carry
 * its own keys or the round trip is lost. This writer is a separate path: nothing about existing
 * serialization changes.
 */

/** Quote and escape a string so no character in it can be read as syntax. */
function quoteString(value: string): string {
  const stringDef = TypedefRegistry.get('string');
  if (stringDef && typeof (stringDef as any).stringify === 'function') {
    const memberDef = {
      type: 'string',
      path: '',
      optional: false,
      null: false,
      format: 'auto',      // the same smart quoting serialization already uses
      escapeLines: false,
      encloser: '"',
    } as unknown as MemberDef;
    const out = (stringDef as any).stringify(value, memberDef);
    // `auto` leaves an unambiguous string bare. A bare string is exactly what breaks here, so the
    // quotes go on regardless -- an interpolated value is never syntax.
    if (typeof out === 'string' && out.length > 0 && (out[0] === '"' || out[0] === "'")) return out;
  }
  return '"' + value.replace(/\\/g, '\\\\').replace(/"/g, '\\"').replace(/\n/g, '\\n').replace(/\r/g, '\\r') + '"';
}

/**
 * Format a Date losslessly — the parsed value must be the same instant that went in.
 *
 * Everything here is UTC, deliberately. A date-only literal parses back as UTC midnight, so
 * formatting from local time would shift the instant by the machine's offset: `new Date(2024, 2, 1)`
 * in UTC+5:30 is *not* `2024-03-01T00:00:00Z`, and emitting `d'2024-03-01'` for it would silently
 * move the value. The short form is therefore used only when the Date *is* exactly UTC midnight,
 * where the two are the same instant; otherwise the full ISO form carries it exactly.
 */
function dateLiteral(value: Date): string {
  const iso = value.toISOString();            // always UTC, always exact
  const isUtcMidnight = iso.endsWith('T00:00:00.000Z');
  return isUtcMidnight ? `d'${iso.slice(0, 10)}'` : `dt'${iso}'`;
}

/**
 * Serialize one value as an Internet Object literal.
 *
 * @param value - Any JavaScript value.
 * @returns Internet Object source for that value, and nothing more — it can never introduce a
 *          member, a section break, or any other structure.
 */
export function toIOLiteral(value: any): string {
  if (value === null || value === undefined) return 'N';
  if (typeof value === 'boolean') return value ? 'T' : 'F';

  if (typeof value === 'number') {
    if (Number.isNaN(value)) return 'NaN';
    if (value === Infinity) return 'Inf';
    if (value === -Infinity) return '-Inf';
    return String(value);
  }

  // The `n` and `m` markers are what keep these from decaying into plain numbers on the way back.
  if (typeof value === 'bigint') return value.toString() + 'n';
  if (value instanceof Decimal) return value.toString() + 'm';

  if (typeof value === 'string') return quoteString(value);
  if (value instanceof Date) return dateLiteral(value);

  if (Array.isArray(value)) return `[${value.map(toIOLiteral).join(', ')}]`;

  if (value instanceof Collection) {
    return `[${[...(value as any)].map(toIOLiteral).join(', ')}]`;
  }

  // Keys are carried explicitly: an interpolated object has no schema to recover them from.
  if (value instanceof InternetObject) {
    const parts: string[] = [];
    for (const [key, v] of value as any) {
      parts.push(key === undefined ? toIOLiteral(v) : `${quoteString(String(key))}: ${toIOLiteral(v)}`);
    }
    return `{${parts.join(', ')}}`;
  }

  if (typeof value === 'object') {
    const parts = Object.entries(value).map(
      ([k, v]) => `${quoteString(k)}: ${toIOLiteral(v)}`
    );
    return `{${parts.join(', ')}}`;
  }

  // Functions and symbols have no representation; quoting keeps them from becoming syntax.
  return quoteString(String(value));
}

/**
 * Build a tag's source text, serializing every interpolated value as a literal.
 *
 * This is the whole of the fix: the tags call this instead of concatenating raw.
 */
export function buildTemplateSource(strings: TemplateStringsArray, args: any[]): string {
  let out = '';
  for (let i = 0; i < strings.length; i++) {
    out += strings[i];
    if (i < args.length) out += toIOLiteral(args[i]);
  }
  return out;
}

/** Registering typedefs is idempotent; the string/date serializers are looked up above. */
registerTypes();
