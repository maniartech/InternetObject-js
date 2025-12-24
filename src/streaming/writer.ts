import Definitions from '../core/definitions';
import Document from '../core/document';
import Header from '../core/header';
import SectionCollection from '../core/section-collection';
import { loadObject } from '../facade/load';
import { stringify } from '../facade/stringify';
import { stringifyDocument } from '../facade/stringify-document';
import { IOStreamTransport, StreamWriterOptions } from './types';

export class IOStreamWriter {
  private readonly transport: IOStreamTransport;
  private readonly defs: Definitions | null;
  private readonly options: StreamWriterOptions;

  private headerDefs: Definitions | null = null;
  private headerText: string | null = null;
  private currentSchemaName: string | null = null;

  constructor(transport: IOStreamTransport, defs?: Definitions | null, options?: StreamWriterOptions) {
    this.transport = transport;
    this.defs = defs ?? null;
    this.options = {
      includeSchemas: options?.includeSchemas ?? true,
      defsId: options?.defsId,
      onError: options?.onError,
    };
  }

  /** Sets header metadata (non-schema definitions). Must be called before getHeader(). */
  setHeader(header: Definitions | null): void {
    this.headerDefs = header;
    this.headerText = null; // invalidate cache
  }

  /** Returns the full header chunk including the terminating `---`. */
  getHeader(): string {
    if (this.headerText) return this.headerText;

    const header = new Header();

    // 1) metadata header first
    if (this.headerDefs) {
      header.definitions.merge(this.headerDefs, true);
    }

    // 2) optional defs identifier (design hook)
    if (this.options.defsId) {
      header.definitions.set('defsId', this.options.defsId);
    }

    // 3) schema definitions (if configured)
    if (this.options.includeSchemas && this.defs) {
      header.definitions.merge(this.defs, false);
    }

    const doc = new Document(header, new SectionCollection());

    // stringifyDocument includes header definitions but does NOT add the required terminator.
    const headerBody = stringifyDocument(doc, { includeHeader: true });
    const normalized = headerBody ? headerBody.trimEnd() : '';

    this.headerText = normalized.length > 0 ? `${normalized}\n---\n` : `---\n`;

    // initialize current schema from defs ($schema) if present
    this.currentSchemaName = '$schema';

    return this.headerText;
  }

  /** Sends header immediately via transport. */
  async sendHeader(): Promise<void> {
    const h = this.getHeader();
    await this.transport.send(h);
  }

  /** Emits a schema switch marker. Use `$schema` or omit to switch back to default. */
  section(schemaName?: string): string {
    const s = schemaName ? `--- ${schemaName}\n` : `---\n`;
    this.currentSchemaName = schemaName ?? '$schema';
    return s;
  }

  /**
   * Serializes one item.
   * If schemaName changes, prepends a section switch marker automatically.
   */
  write(data: object, schemaName?: string): string {
    const effectiveSchema = schemaName ?? '$schema';
    const parts: string[] = [];

    try {
      if (this.currentSchemaName !== effectiveSchema) {
        // only include schema marker for non-default schema
        parts.push(this.section(schemaName));
      }

      // Validate+wrap into InternetObject if schema available.
      // If defs is not provided, loadObject will be schemaless.
      const ioObj = this.defs
        ? loadObject(data, this.defs, { schemaName: effectiveSchema })
        : loadObject(data as any);

      // stringify() outputs record without '~'
      const row = this.defs
        ? stringify(ioObj as any, this.defs, { schemaName: effectiveSchema })
        : stringify(ioObj as any);

      parts.push(`~ ${row}\n`);
      return parts.join('');
    } catch (err: any) {
      const action = this.options.onError ?? 'throw';

      if (action === 'throw') {
        throw err;
      }

      if (action === 'ignore') {
        return '';
      }

      if (action === 'emit') {
        // Switch to $error section to avoid schema validation issues on client
        // We don't update this.currentSchemaName to '$error' permanently because
        // we want the next write() to switch back to its intended schema if needed.
        // However, write() logic checks this.currentSchemaName.
        // So we MUST update this.currentSchemaName so the next write knows we are in $error.
        parts.push(this.section('$error'));

        // Simple error object
        const errorObj = {
          code: err.errorCode || 'error',
          message: err.message || String(err)
        };

        // We use JSON.stringify for safety, assuming simple error structure
        // IO format is compatible with JSON for simple objects
        parts.push(`~ ${JSON.stringify(errorObj)}\n`);

        return parts.join('');
      }

      return '';
    }
  }
}

export function createStreamWriter(
  transport: IOStreamTransport,
  defs?: Definitions | null,
  options?: StreamWriterOptions
): IOStreamWriter {
  return new IOStreamWriter(transport, defs ?? null, options);
}
