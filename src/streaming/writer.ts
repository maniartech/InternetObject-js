import Definitions from '../core/definitions';
import Document from '../core/document';
import Header from '../core/header';
import SectionCollection from '../core/section-collection';
import { loadObject } from '../facade/load';
import { stringify } from '../facade/stringify';
import { stringifyDocument } from '../facade/stringify-document';
import { toAsyncIterable } from './source';
import { IOStreamSource, IOStreamTransport, StreamChunk, StreamWriterOptions } from './types';

const POISONED = 'IOStreamWriter is unusable after a transport failure; create a new writer.';
const CONCURRENT = 'IOStreamWriter does not support concurrent calls; await each call before the next.';

export class IOStreamWriter {
  private readonly transport: IOStreamTransport;
  private readonly defs: Definitions | null;
  private readonly options: { includeSchemas: boolean };

  private headerDefs: Definitions | null = null;
  private headerText: string | null = null;
  private currentSchemaName: string | null = null;
  private headerSent = false;
  private poisoned = false;
  private inCall = false;

  constructor(transport: IOStreamTransport, defs?: Definitions | null, options?: StreamWriterOptions) {
    this.transport = transport;
    this.defs = defs ?? null;
    this.options = { includeSchemas: options?.includeSchemas ?? true };
  }

  /** Sets header metadata (non-schema definitions). Must be called before the header is emitted. */
  setHeader(header: Definitions | null): void {
    this.headerDefs = header;
    this.headerText = null; // invalidate cache
  }

  /** Returns the full header chunk including the terminating `---`. */
  getHeader(): string {
    if (this.headerText) return this.headerText;

    const header = new Header();
    if (this.headerDefs) header.definitions.merge(this.headerDefs, true);
    if (this.options.includeSchemas && this.defs) header.definitions.merge(this.defs, false);

    const doc = new Document(header, new SectionCollection());
    // stringifyDocument includes header definitions but does NOT add the required terminator.
    const headerBody = stringifyDocument(doc, { includeHeader: true });
    const normalized = headerBody ? headerBody.trimEnd() : '';

    this.headerText = normalized.length > 0 ? `${normalized}\n---\n` : `---\n`;
    this.currentSchemaName = '$schema'; // after the header, the default schema is active
    return this.headerText;
  }

  /** Emits a schema switch marker. Use `$schema` or omit to switch back to default. */
  section(schemaName?: string): string {
    const s = schemaName ? `--- ${schemaName}\n` : `---\n`;
    this.currentSchemaName = schemaName ?? '$schema';
    return s;
  }

  /**
   * Serializes one item to its framed text. Does NOT talk to the transport. Throws if
   * the value fails validation/serialization (error handling is the caller's concern).
   * If the effective schema differs from the active one, prepends a section switch marker.
   */
  write(data: any, schemaName?: string): string {
    const effectiveSchema = schemaName ?? '$schema';
    const parts: string[] = [];

    if (this.currentSchemaName !== effectiveSchema) {
      parts.push(this.section(schemaName));
    }

    const ioObj = this.defs
      ? loadObject(data, this.defs, { schemaName: effectiveSchema })
      : loadObject(data as any);
    const row = this.defs
      ? stringify(ioObj as any, this.defs, { schemaName: effectiveSchema })
      : stringify(ioObj as any);

    parts.push(`~ ${row}\n`);
    return parts.join('');
  }

  /** Writes a batch of items to framed text (switches schema once if all share it). */
  writeBatch(items: object[], schemaName?: string): string {
    let out = '';
    for (const item of items) out += this.write(item, schemaName);
    return out;
  }

  /** Send one item via the transport. Emits the header first if not already sent. */
  async send(data: object, schemaName?: string): Promise<void> {
    this.begin();
    try {
      await this.ensureHeader();
      const chunk = this.write(data, schemaName);
      if (chunk) await this.transmit(chunk);
    } finally {
      this.inCall = false;
    }
  }

  /** Send a batch via the transport. Emits the header first if not already sent. */
  async sendBatch(items: object[], schemaName?: string): Promise<void> {
    this.begin();
    try {
      await this.ensureHeader();
      const chunk = this.writeBatch(items, schemaName);
      if (chunk) await this.transmit(chunk);
    } finally {
      this.inCall = false;
    }
  }

  /** Emits the canonical header via the transport (at most once per stream). */
  async sendHeader(): Promise<void> {
    this.begin();
    try {
      await this.ensureHeader();
    } finally {
      this.inCall = false;
    }
  }

  /**
   * Forwards raw pre-formatted IO text to the transport without serialization. The caller
   * owns framing. A raw forward makes the writer's schema tracking unreliable, so the next
   * structured `send()` re-emits a section marker (PROTOCOL §8). Calling `sendRaw()` marks
   * the header as already managed by the caller (no auto-header afterward).
   *
   * - With header: the text is a complete IO document; do not also call `sendHeader()`.
   * - Records only: call `sendHeader()` first so the receiver has the schema context.
   */
  async sendRaw(ioText: string): Promise<void> {
    this.begin();
    try {
      this.headerSent = true; // caller owns framing
      if (ioText) await this.transmit(ioText);
      this.currentSchemaName = null; // schema tracking is now unreliable
    } finally {
      this.inCall = false;
    }
  }

  /** Forwards raw IO text from any source to the transport chunk by chunk (proxy/forwarding). */
  async pipeRaw(source: IOStreamSource): Promise<void> {
    this.begin();
    try {
      this.headerSent = true; // caller owns framing
      for await (const chunk of toAsyncIterable(source)) {
        if (chunk instanceof ArrayBuffer) {
          await this.transmit(new Uint8Array(chunk));
        } else {
          await this.transmit(chunk as string | Uint8Array);
        }
      }
      this.currentSchemaName = null; // schema tracking is now unreliable
    } finally {
      this.inCall = false;
    }
  }

  // --- internals ---

  private begin(): void {
    if (this.poisoned) throw new Error(POISONED);
    if (this.inCall) throw new Error(CONCURRENT);
    this.inCall = true;
  }

  private async ensureHeader(): Promise<void> {
    if (!this.headerSent) {
      this.headerSent = true;
      await this.transmit(this.getHeader());
    }
  }

  private async transmit(chunk: StreamChunk): Promise<void> {
    try {
      await this.transport.send(chunk as string | Uint8Array);
    } catch (err) {
      this.poisoned = true; // a failed transport leaves framing in an unknown state
      throw err;
    }
  }
}

export function createStreamWriter(
  transport: IOStreamTransport | { write: (chunk: any) => boolean | void },
  defs?: Definitions | null,
  options?: StreamWriterOptions
): IOStreamWriter {
  // Duck-type a Node.js Writable stream and honor its backpressure (Gap 3): when
  // write() returns false, resolve send() only after the 'drain' event.
  if (transport && typeof (transport as any).write === 'function' && typeof (transport as any).send !== 'function') {
    const writable = transport as any;
    transport = {
      send: (chunk: string | Uint8Array): void | Promise<void> => {
        const ok = writable.write(chunk);
        if (ok !== false || typeof writable.once !== 'function') return;
        return new Promise<void>((resolve, reject) => {
          const cleanup = () => {
            if (typeof writable.removeListener === 'function') {
              writable.removeListener('drain', onDrain);
              writable.removeListener('error', onError);
            }
          };
          const onDrain = () => { cleanup(); resolve(); };
          const onError = (e: Error) => { cleanup(); reject(e); };
          writable.once('drain', onDrain);
          writable.once('error', onError);
        });
      },
    };
  }

  return new IOStreamWriter(transport as IOStreamTransport, defs ?? null, options);
}
