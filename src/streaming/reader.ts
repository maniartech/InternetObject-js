import Definitions from '../core/definitions';
import Schema from '../schema/schema';
import parse from '../parser/index';
import StreamTokenizer from '../parser/tokenizer/stream-tokenizer';
import TokenType from '../parser/tokenizer/token-types';
import IOValidationError from '../errors/io-validation-error';
import ErrorCodes from '../errors/io-error-codes';
import ErrorNode from '../parser/nodes/error';
import InternetObject from '../core/internet-object';
import { ChunkDecoder, normalizeNewlines, stripLeadingBom } from './text';
import { toAsyncIterable } from './source';
import { streamError, StreamErrorCode } from './errors';
import { IOStreamSource, StreamReaderOptions, StreamItem } from './types';

const SCHEMA_NAME_RE = /\$[\p{L}\p{M}\p{N}\-_]+/u;

/**
 * A streaming reader for Internet Object data.
 *
 * Record boundaries are detected at the token level via {@link StreamTokenizer}
 * (IMPLEMENTATION-GAPS.md Gap 21 / ADR 0006): a top-level `~` (COLLECTION_START) or
 * `---` (SECTION_SEP) token marks a frame boundary. The tokenizer is the single
 * lexical authority, so `~`/`---` inside strings, comments, or nested containers are
 * never mistaken for boundaries — there is no second hand-rolled scanner. Each frame's
 * text is then parsed by the existing core `parse()` path, preserving full
 * type/schema/validation semantics.
 */
export class IOStreamReader implements AsyncIterable<StreamItem> {
  private readonly source: AsyncIterable<any>;
  private readonly definitions: Definitions | null;
  private readonly options: StreamReaderOptions;
  private consumed = false;

  constructor(source: IOStreamSource, definitions?: Definitions | null, options?: StreamReaderOptions) {
    this.source = toAsyncIterable(source);
    this.definitions = definitions ?? null;
    this.options = options || {};
  }

  /**
   * Reads all items from the stream and returns them as an array.
   * WARNING: This buffers the entire stream into memory.
   */
  async collect(): Promise<StreamItem[]> {
    const items: StreamItem[] = [];
    for await (const item of this) {
      items.push(item);
    }
    return items;
  }

  async *[Symbol.asyncIterator](): AsyncIterator<StreamItem> {
    if (this.consumed) {
      throw new Error('IOStreamReader is single-consumption; create a new reader to read the source again.');
    }
    this.consumed = true;

    const maxBufferedChars = this.options.maxBufferedChars ?? 2_000_000;
    const signal = this.options.signal;
    const checkAbort = () => {
      if (signal?.aborted) throw streamError(StreamErrorCode.aborted, 'Stream reading was aborted.');
    };

    let streamIndex = 0;
    let defs: Definitions | null = this.definitions;
    let defaultSchemaName: string | undefined = this.options.defaultSchema;
    let headerDone = false;
    let depth = 0; // brace/bracket nesting; boundaries only count at depth 0

    // Active schema context for the current section.
    let activeSchema: Schema | null = null;        // schema to validate records against
    let activeSchemaName: string | undefined;       // explicit selector name, else undefined

    // The definitions a record is validated with, carrying the active schema as its default.
    //
    // A compiled schema does NOT hold its own references: a member declared `a: $Inner` keeps
    // `$Inner` as an unresolved token and looks it up in the DEFINITIONS at validation time.
    // Handing core the schema alone therefore breaks every `$Ref` in a streamed document —
    // `undefined-schema` on the first record — while the identical document parses correctly
    // through `parse()`, which passes definitions. The specification is explicit that a reader
    // delegates schema resolution to core rather than reimplementing it (schema-and-state.md).
    //
    // Rebuilt only when the section header changes, not per record, so the reader still reuses
    // resolved schema objects across records as it must.
    let activeDefs: Definitions | null = null;

    const decoder = new ChunkDecoder();
    const st = new StreamTokenizer();

    // Sliding raw-text window: raw holds text from absolute offset `windowBase`.
    let raw = '';
    let windowBase = 0;
    let frameStart = 0; // absolute offset where the current pending frame begins

    const sliceAbs = (a: number, b?: number): string =>
      raw.slice(a - windowBase, b === undefined ? undefined : b - windowBase);
    const advanceWindow = (toAbs: number): void => {
      if (toAbs > windowBase) {
        raw = raw.slice(toAbs - windowBase);
        windowBase = toAbs;
      }
    };

    // Resolve the active default schema (the fallback context), if any. A missing
    // default is not fatal — it just means schemaless default context (PROTOCOL §6).
    const resolveDefaultSchema = (): Schema | null => {
      if (!defs || !defaultSchemaName) return null;
      try {
        const s = defs.getV(defaultSchemaName);
        return s instanceof Schema ? s : null;
      } catch {
        return null;
      }
    };

    // Apply a `--- ...` section header. An explicit `$Schema` selector must resolve —
    // an unknown one is a FATAL stream error (PROTOCOL §7) and rejects the iterator.
    const applySectionHeader = (line: string | null): void => {
      const explicit = line ? line.match(SCHEMA_NAME_RE)?.[0] : undefined;
      if (explicit) {
        if (!defs) {
          throw new IOValidationError(ErrorCodes.undefinedSchema, `Schema ${explicit} is not defined.`);
        }
        const resolved = defs.getV(explicit); // throws schema-not-defined (fatal) if unknown
        activeSchema = resolved instanceof Schema ? resolved : resolveDefaultSchema();
        activeSchemaName = explicit;
      } else {
        activeSchema = resolveDefaultSchema();
        activeSchemaName = undefined;
      }
      activeDefs = defsForActiveSchema();
    };

    /**
     * Definitions to validate the next records with: everything the stream has defined, plus the
     * active schema installed as `$schema` so core selects it. Returns null when there is no
     * active schema, in which case the plain definitions are used and core applies its own default.
     */
    const defsForActiveSchema = (): Definitions | null => {
      if (!activeSchema) return null;
      const scoped = new Definitions();
      if (defs) {
        for (let i = 0; i < defs.length; i++) {
          const { key, value } = defs.at(i);
          scoped.push(key, value.value, value.isSchema, value.isVariable);
        }
      }
      scoped.set('$schema', activeSchema);
      return scoped;
    };

    const processHeader = (headerText: string): void => {
      const content = headerText.trimEnd();
      const text = content.length ? `${content}\n---\n` : '---\n';
      const headerErrors: Error[] = [];
      const headerDoc = defs ? parse(text, defs, headerErrors) : parse(text, null, headerErrors);
      // Invalid header definitions are FATAL (PROTOCOL §7.2, ADR 0012): a broken header would
      // make every subsequent record misvalidate, so reject now, preserving core error identity.
      if (headerErrors.length > 0) throw headerErrors[0];
      defs = headerDoc.header?.definitions ?? defs;
      // An in-stream $schema becomes the default context, overriding any fallback.
      if (headerDoc.header?.schema instanceof Schema) defaultSchemaName = '$schema';
    };

    // Read the `--- ...` section-header line starting at absolute pos P. Returns the
    // header string (or null for a bare `---`) and the absolute offset just past the line.
    const readSectionHeaderLine = (P: number): { header: string | null; next: number } => {
      const nlRel = raw.indexOf('\n', P - windowBase);
      const nlAbs = nlRel === -1 ? windowBase + raw.length : windowBase + nlRel;
      const line = sliceAbs(P, nlAbs).trim();
      return { header: line === '---' ? null : line, next: nlRel === -1 ? nlAbs : nlAbs + 1 };
    };

    // A failed record surfaces either as an ErrorNode (schema/parse failure within a
    // collection) or as an `__error`-flagged value; both carry the underlying IOError.
    const isErrorItem = (x: any): boolean =>
      x instanceof ErrorNode || !!(x && x.__error);
    const errorOf = (x: any): Error => {
      if (x instanceof ErrorNode) return x.error;
      if (x?.originalError instanceof Error) return x.originalError;
      return x;
    };
    const withName = (item: Partial<StreamItem>): any =>
      activeSchemaName !== undefined ? { ...item, schemaName: activeSchemaName } : item;
    const mkRecord = (data: any): StreamItem =>
      withName({ kind: 'record', recordIndex: streamIndex++, data }) as StreamItem;
    const mkError = (err: any): StreamItem =>
      withName({ kind: 'record-error', recordIndex: streamIndex++, data: null, error: errorOf(err) }) as StreamItem;

    // Parse one frame's text [a, b) as a section under the active schema and emit records.
    const emitFrame = (a: number, b: number): StreamItem[] => {
      const recordText = sliceAbs(a, b);
      if (recordText.trim().length === 0) return [];

      const text = `${recordText}\n`;
      const errors: Error[] = [];
      let doc: any;
      try {
        // Definitions FIRST, always: the active schema rides along as `$schema` inside them, so a
        // member's `$Ref` still has somewhere to resolve. Passing the bare schema loses that.
        doc = activeDefs
          ? parse(text, activeDefs, errors)
          : (defs ? parse(text, defs, errors) : parse(text, null, errors));
      } catch (err: any) {
        // On the no-`---` legacy flush (header never terminated — e.g. a `---` masked by an
        // unclosed brace), a `---`-bearing frame is a full document: core treats its first
        // section as the HEADER, so a throw here is an invalid-header/structural failure —
        // FATAL per PROTOCOL §7.2 / ADR 0012. (Data-record errors don't throw; they surface
        // as ErrorNodes inside the parsed document and stay recoverable.)
        if (!headerDone && /(^|\n)[ \t]*---/.test(text)) throw err;
        return [mkError(err)];
      }

      const out: StreamItem[] = [];
      let emitted = false;
      const sections = doc.sections;
      if (sections) {
        for (let si = 0; si < sections.length; si++) {
          const data = sections.get(si)?.data as any;
          if (data == null) continue;
          // A single record is one IOObject. Branch on the actual type, not generic
          // iterability — an IOObject is itself iterable over [key, value] entries, so a
          // heuristic would wrongly explode a single object into tuple "records" (Gap 1).
          if (data instanceof InternetObject || isErrorItem(data)) {
            out.push(isErrorItem(data) ? mkError(data) : mkRecord(data));
            emitted = true;
          } else if (typeof data[Symbol.iterator] === 'function') {
            for (const item of data as any) {
              out.push(isErrorItem(item) ? mkError(item) : mkRecord(item));
              emitted = true;
            }
          } else {
            out.push(mkRecord(data));
            emitted = true;
          }
        }
      }
      // Parse failure that produced no record (e.g. truncated/broken syntax).
      if (!emitted && errors.length > 0) out.push(mkError(errors[0]));
      return out;
    };

    // A fatal raised while APPLYING a section header, held until the records that preceded it
    // have been yielded. PROTOCOL §7.2: a fatal terminates iteration *after* any items already
    // produced — so an unknown `--- $Missing` must not swallow the records before it. Throwing
    // straight out of handleToken discarded the return value, and with it the whole frame.
    let pendingFatal: Error | null = null;

    /** Apply a section header, deferring a fatal so pending records survive it. */
    const applySectionHeaderDeferred = (header: string | null): void => {
      try {
        applySectionHeader(header);
      } catch (err: any) {
        pendingFatal = err;
      }
    };

    // Handle one committed token; returns any items to emit. May set `pendingFatal`, which the
    // caller MUST throw after yielding the returned items.
    const handleToken = (t: any): StreamItem[] => {
      const type = t.type;

      // Track container nesting so `~`/`---` only count as boundaries at top level.
      if (type === TokenType.CURLY_OPEN || type === TokenType.BRACKET_OPEN) { depth++; return []; }
      if (type === TokenType.CURLY_CLOSE || type === TokenType.BRACKET_CLOSE) { if (depth > 0) depth--; return []; }
      if (depth !== 0) return [];

      if (!headerDone) {
        if (type === TokenType.SECTION_SEP) {
          processHeader(sliceAbs(frameStart, t.pos));
          headerDone = true;
          const { header, next } = readSectionHeaderLine(t.pos);
          applySectionHeaderDeferred(header); // fatal on unknown explicit schema
          frameStart = next;
          advanceWindow(next);
        }
        // Header content (including `~` definition records) accumulates; ignore it.
        return [];
      }

      if (type === TokenType.COLLECTION_START) {
        const out = emitFrame(frameStart, t.pos);
        frameStart = t.pos;
        advanceWindow(t.pos);
        return out;
      }
      if (type === TokenType.SECTION_SEP) {
        const out = emitFrame(frameStart, t.pos);
        const { header, next } = readSectionHeaderLine(t.pos);
        applySectionHeaderDeferred(header); // fatal on unknown explicit schema
        frameStart = next;
        advanceWindow(next);
        return out;
      }
      return [];
    };

    // --- Main loop ---
    // Drive the source via its explicit iterator so we can (a) wrap source/transport
    // failures as `stream-source-error`, and (b) release the source on any exit
    // (normal, error, abort, or early `break`) via the finally below (Gap 11).
    checkAbort();
    const iter = this.source[Symbol.asyncIterator]();
    let firstChunk = true;
    try {
      while (true) {
        checkAbort();
        let res: IteratorResult<any>;
        try {
          res = await iter.next();
        } catch (srcErr) {
          throw streamError(StreamErrorCode.sourceError, 'Stream source failed.', srcErr);
        }
        if (res.done) break;
        checkAbort();

        let text = normalizeNewlines(decoder.decode(res.value));
        if (!text) continue;
        if (firstChunk) {
          text = stripLeadingBom(text); // strip a leading BOM on string sources (byte sources: decoder already did)
          firstChunk = false;
        }
        raw += text;
        if (raw.length > maxBufferedChars) {
          throw streamError(
            StreamErrorCode.bufferExceeded,
            `Stream reader exceeded maxBufferedChars (${maxBufferedChars}).`
          );
        }
        for (const t of st.feed(text)) {
          for (const item of handleToken(t)) yield item;
          if (pendingFatal) throw pendingFatal;
        }
      }
      for (const t of st.end()) {
        for (const item of handleToken(t)) yield item;
        if (pendingFatal) throw pendingFatal;
      }

      // Flush the final pending frame. If no `---` was ever seen, the accumulated
      // content is headerless data (it is reinterpreted as records here).
      const end = windowBase + raw.length;
      for (const item of emitFrame(frameStart, end)) yield item;
    } finally {
      // Release the underlying source on early termination / error / completion.
      try { await iter.return?.(); } catch { /* ignore release errors */ }
    }
  }
}

/**
 * Creates a new IOStreamReader instance.
 * @param source The source to read from (string, Iterable, AsyncIterable, ReadableStream).
 * @param definitions Optional initial definitions.
 * @param options Optional default-schema and buffer settings.
 */
export function createStreamReader(
  source: IOStreamSource,
  definitions?: Definitions | null,
  options?: StreamReaderOptions
): IOStreamReader {
  return new IOStreamReader(source, definitions, options);
}
