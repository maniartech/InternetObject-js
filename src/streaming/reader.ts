import Definitions from '../core/definitions';
import Schema from '../schema/schema';
import parse from '../parser/index';
import { ChunkDecoder, normalizeNewlines, splitLinesKeepRemainder, updateStringState } from './text';
import { toAsyncIterable } from './source';
import { IOStreamSource, StreamReaderOptions, StreamItem } from './types';
import IODocument from '../core/document';

/**
 * A streaming reader for Internet Object data.
 * Reads chunked data from a source and parses it into IO objects.
 */
export class IOStreamReader implements AsyncIterable<StreamItem> {
  private readonly source: AsyncIterable<any>;
  private readonly definitions: Definitions | null;
  private readonly options: StreamReaderOptions;

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

  /**
   * Iterates over the stream, yielding parsed items (data, error, schemaName, etc.)
   */
  async *[Symbol.asyncIterator](): AsyncIterator<StreamItem> {
    const maxBufferedChars = this.options.maxBufferedChars ?? 2_000_000;

    let streamIndex = 0;
    let headerLines: string[] = [];
    let headerDone = false;

    let defs: Definitions | null = this.definitions;
    let defaultSchemaName: string | undefined = this.options.defaultSchema;

    // Data parsing state
    let currentSectionHeaderLine: string | null = null; // e.g. '--- $order'
    let pendingLines: string[] = [];
    let pendingSize = 0;
    let inString: string | null = null;
    let remainder = '';
    const decoder = new ChunkDecoder();

    // Helper to flush pending lines as a parsed section
    const flushPending = async (): Promise<StreamItem[]> => {
      if (pendingLines.length === 0) return [];

      const sectionText = [
        // If no explicit section header has been seen, omit it (default section)
        currentSectionHeaderLine ? `${currentSectionHeaderLine}\n` : '',
        pendingLines.join('\n'),
        '\n'
      ].join('');

      pendingLines = [];
      pendingSize = 0;

      const errors: Error[] = [];
      let doc: IODocument;
      try {
        // parse() will merge external defs into header.definitions
        doc = defs ? parse(sectionText, defs, errors) : parse(sectionText, null, errors);
      } catch (err: any) {
        // If parse throws (e.g. syntax error), yield an error item
        return [{
          data: null,
          schemaName: currentSectionHeaderLine ? (currentSectionHeaderLine.replace('---', '').trim() || '$schema') : (defaultSchemaName ?? '$schema'),
          index: streamIndex++,
          error: err
        }];
      }

      const out: StreamItem[] = [];
      const sections = doc.sections;

      // If parse produced errors but no sections (or empty sections), yield error
      if ((!sections || sections.length === 0) && errors.length > 0) {
         return [{
          data: null,
          schemaName: currentSectionHeaderLine ? (currentSectionHeaderLine.replace('---', '').trim() || '$schema') : (defaultSchemaName ?? '$schema'),
          index: streamIndex++,
          error: errors[0]
        }];
      }

      if (!sections || sections.length === 0) return out;

      for (let si = 0; si < sections.length; si++) {
        const section = sections.get(si);
        if (!section) continue;

        const schemaName = (section.schemaName
          ? (section.schemaName.startsWith('$') ? section.schemaName : `$${section.schemaName}`)
          : (defaultSchemaName ?? '$schema'));

        const data = section.data as any;

        // For collections, yield each item. For single objects, yield once.
        if (data && typeof (data as any)[Symbol.iterator] === 'function' && typeof data.toJSON === 'function') {
          // Likely IOCollection
          let idxInSection = 0;
          for (const item of data as any) {
            if (item && (item as any).__error) {
              out.push({
                data: null,
                schemaName,
                index: streamIndex++,
                error: item,
              });
            } else {
              out.push({
                data: item,
                schemaName,
                index: streamIndex++,
                error: undefined,
              });
            }
            idxInSection++;
          }
        } else if (data) {
          if ((data as any).__error) {
            out.push({ data: null, schemaName, index: streamIndex++, error: data });
          } else {
            out.push({ data, schemaName, index: streamIndex++, error: undefined });
          }
        }
      }

      // If parse produced errors, attach them to the last yielded item as a signal.
      if (errors.length > 0 && out.length > 0) {
        out[out.length - 1].error = errors[0];
      }

      return out;
    };

    // --- Main Loop ---
    for await (const chunk of this.source) {
      const text = normalizeNewlines(decoder.decode(chunk));
      remainder += text;

      if (remainder.length > maxBufferedChars) {
        throw new Error(`Stream reader exceeded maxBufferedChars (${maxBufferedChars}).`);
      }

      const { lines, remainder: newRemainder } = splitLinesKeepRemainder(remainder);
      remainder = newRemainder;

      for (const rawLine of lines) {
        const line = rawLine;
        const trimmed = line.trim();

        if (!headerDone) {
            if (trimmed.startsWith('---')) {
            headerDone = true;

            const headerText = headerLines.length ? `${headerLines.join('\n')}\n---\n` : `---\n`;
            headerLines = [];

            const headerErrors: Error[] = [];
            const headerDoc = defs ? parse(headerText, defs, headerErrors) : parse(headerText, null, headerErrors);

            defs = headerDoc.header?.definitions ?? defs;
            const schema = headerDoc.header?.schema;
            if (!defaultSchemaName && schema instanceof Schema) {
                defaultSchemaName = '$schema';
            }

            currentSectionHeaderLine = trimmed === '---' ? null : trimmed;
            continue;
            }

            headerLines.push(line);
            continue;
        }

        if (trimmed.startsWith('---')) {
            const flushed = await flushPending();
            for (const item of flushed) yield item;

            currentSectionHeaderLine = trimmed === '---' ? null : trimmed;
            inString = null;
            continue;
        }

        if (trimmed.length === 0) {
            if (inString !== null) {
            pendingLines.push(line);
            }
            continue;
        }

        if (inString === null && (trimmed.startsWith('~') || trimmed.startsWith('#'))) {
            const flushed = await flushPending();
            for (const item of flushed) yield item;
        }

        inString = updateStringState(line, inString);

        pendingLines.push(line);
        pendingSize += line.length;
        if (pendingSize > maxBufferedChars) {
            throw new Error(`Stream reader exceeded maxBufferedChars (${maxBufferedChars}) in pending lines.`);
        }
      }
    }

    if (remainder.trim().length > 0) {
      if (!headerDone) {
        headerLines.push(remainder);
      } else {
        pendingLines.push(remainder);
      }
    }

    if (!headerDone && headerLines.length > 0) {
      pendingLines = headerLines;
      headerLines = [];
      headerDone = true;
    }

    const flushed = await flushPending();
    for (const item of flushed) yield item;
  }
}

/**
 * Creates a new IOStreamReader instance.
 * @param source The source to read from (string, Iterable, AsyncIterable, ReadableStream).
 * @param definitions Optional initial definitions.
 * @param options Optional strictness and buffer settings.
 */
export function createStreamReader(
  source: IOStreamSource,
  definitions?: Definitions | null,
  options?: StreamReaderOptions
): IOStreamReader {
  return new IOStreamReader(source, definitions, options);
}
