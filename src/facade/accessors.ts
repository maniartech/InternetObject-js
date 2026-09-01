/**
 * The functional forms (ADR 0005 §7.3.4, A4).
 *
 * Property access is the ergonomic path — `doc.sections.employees[0].name` — and it is shadowable by
 * construction: a section really called `length`, or a member really called `get`, resolves to the
 * *data*, because that is what an own property does to a prototype method in JavaScript. These are
 * the reads that cannot be shadowed, for the code that must not break when the data happens to be
 * named like the API.
 *
 * They accept a proxied document or a bare one, so the same call works either side of
 * {@link proxyDocument}.
 */
import IODocument from '../core/document';
import IOErrorItem from '../core/error-item';
import IOHeader from '../core/header';
import IOSection from '../core/section';
import ErrorNode from '../parser/nodes/error';
import { unwrap, wrap } from '../proxy';

/** Reaches the core node behind a proxy — the layer where every method is reachable by name. */
export function node<T = any>(value: T): T {
  return unwrap(value);
}

/**
 * The section **object** — its name, schema name and errors — by name or by position.
 *
 * `doc.sections.employees` gives the section's *data*; this gives the section. They are different
 * questions and the API answers them separately rather than overloading one.
 */
export function section(doc: any, nameOrIndex: string | number): IOSection | undefined {
  const d = unwrap(doc) as IODocument;
  return d?.sections?.get(nameOrIndex as any);
}

/**
 * Every section's data, **always keyed by section name** — never unwrapped.
 *
 * This is the escape from the unwrapping hazard: `toObject()` hands back the lone section's data
 * directly, which is what application code wants and what the playground shows, but means code
 * written against a one-section document changes shape the day a second section appears. Library and
 * tooling code takes this instead.
 */
export function sections(doc: any): Record<string, any> {
  const d = unwrap(doc) as IODocument;
  const out: Record<string, any> = {};
  const list = d?.sections;
  if (!list) return out;
  for (let i = 0; i < list.length; i++) {
    const s = list.getAt(i)!;
    out[s.name ?? String(i)] = wrap(s.data);
  }
  return out;
}

/** The document header — definitions and variables. Not part of the projection (§3.1). */
export function header(doc: any): IOHeader | undefined {
  return (unwrap(doc) as IODocument)?.header;
}

/**
 * True for a failed record, in either shape it arrives in.
 *
 * Errors embed by default, and they embed as an `ErrorNode` on the node side and as a plain
 * `{ __error: true, … }` on the projected side. One predicate covers both, which is what makes the
 * one-liner people reach for actually work:
 *
 * ```ts
 * rows.filter(r => !io.isError(r))
 * ```
 */
export function isError(value: any): value is IOErrorItem {
  const v = unwrap(value);
  // instanceof on purpose, with no property fallback: `{ __error: true }` is writable as DATA (a
  // schema may declare an `__error` member), and a fallback would let that data impersonate a
  // failure — or worse, get dropped by `skipErrors`. A prototype cannot be written in a document.
  return v instanceof ErrorNode || v instanceof IOErrorItem;
}
