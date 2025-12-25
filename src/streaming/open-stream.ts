import Definitions from '../core/definitions';
import Schema from '../schema/schema';
import parse from '../parser/index';
import { ChunkDecoder, normalizeNewlines, splitLinesKeepRemainder, updateStringState } from './text';
import { toAsyncIterable } from './source';
import { IOStreamSource, OpenStreamOptions, StreamItem } from './types';
import IODocument from '../core/document';

/**
 * Opens a stream and yields parsed items.
 *
 * Design note: this is a pragmatic streaming reader built using the existing `parse()` API.
 * It buffers by line and flushes on section boundaries (`--- ...`).
 * Signature and buffering strategy can be refined later.
 */
export async function* openStream(
  source: IOStreamSource,
  definitions?: Definitions | null,
  options?: OpenStreamOptions
): AsyncIterable<StreamItem> {
  const maxBufferedChars = options?.maxBufferedChars ?? 2_000_000;

  let streamIndex = 0;
  let headerLines: string[] = [];
  let headerDone = false;

  let defs: Definitions | null = definitions ?? null;
  let defaultSchemaName: string | undefined = options?.defaultSchema;

  // Data parsing state
  let currentSectionHeaderLine: string | null = null; // e.g. '--- $order'
  let pendingLines: string[] = [];
  let pendingSize = 0;
  let inString: string | null = null;
  let remainder = '';
  const decoder = new ChunkDecoder();

  async function flushPending(): Promise<StreamItem[]> {
    if (pendingLines.length === 0) return [];

    const sectionText = [
      // If no explicit section header has been seen, omit it (default section)
      currentSectionHeaderLine ? `${currentSectionHeaderLine}\n` : '',
      pendingLines.join('\n'),
      '\n'
    ].join('');

    pendingLines = [];
    pendingSize = 0;

    pendingLines = [];

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
  }

  for await (const chunk of toAsyncIterable(source)) {
    const text = normalizeNewlines(decoder.decode(chunk));
    // console.log('openStream chunk:', text.length, 'chars');
    remainder += text;

    if (remainder.length > maxBufferedChars) {
      throw new Error(`openStream exceeded maxBufferedChars (${maxBufferedChars}).`);
    }

    const { lines, remainder: newRemainder } = splitLinesKeepRemainder(remainder);
    remainder = newRemainder;

    for (const rawLine of lines) {
      const line = rawLine; // already normalized
      const trimmed = line.trim();
      // console.log('openStream line:', trimmed);
      if (!headerDone) {
        // Header ends at the first section separator line.
        // In this protocol, header content often starts with `~` (definitions),
        // so we must not treat `~` as a signal for "no header".
        if (trimmed.startsWith('---')) {
          headerDone = true;

          const headerText = headerLines.length ? `${headerLines.join('\n')}\n---\n` : `---\n`;
          headerLines = [];

          // Parse header using existing parser so schema defs behave consistently.
          const headerErrors: Error[] = [];
          const headerDoc = defs ? parse(headerText, defs, headerErrors) : parse(headerText, null, headerErrors);

          // Merge parsed header defs with external defs
          defs = headerDoc.header?.definitions ?? defs;

          // Resolve default schema name if not provided
          const schema = headerDoc.header?.schema;
          if (!defaultSchemaName && schema instanceof Schema) {
            defaultSchemaName = '$schema';
          }

          // This '---' line may also be a schema switch (e.g. '--- $order').
          // In that case, it begins the first data section.
          currentSectionHeaderLine = trimmed === '---' ? null : trimmed;
          continue;
        }

        headerLines.push(line);
        continue;
      }

      // Data section handling
      if (trimmed.startsWith('---')) {
        // flush previous section before switching
        const flushed = await flushPending();
        for (const item of flushed) yield item;

        currentSectionHeaderLine = trimmed === '---' ? null : trimmed;
        inString = null;
        continue;
      }

      if (trimmed.length === 0) {
        // keep empty lines only if inside a string
        if (inString !== null) {
          pendingLines.push(line);
        }
        continue;
      }

      // If this line starts a new record (or comment), flush the accumulated previous record.
      if (inString === null && (trimmed.startsWith('~') || trimmed.startsWith('#'))) {
        const flushed = await flushPending();
        for (const item of flushed) yield item;
      }

      // console.log('Calling updateStringState for:', line);
      inString = updateStringState(line, inString);

      // Collect data and comment lines.
      pendingLines.push(line);
      pendingSize += line.length;
      if (pendingSize > maxBufferedChars) {
        throw new Error(`openStream exceeded maxBufferedChars (${maxBufferedChars}) in pending lines.`);
      }
    }
  }

  // End-of-stream: consume remainder as a final line
  if (remainder.trim().length > 0) {
    // treat remainder as a last line
    if (!headerDone) {
      headerLines.push(remainder);
    } else {
      pendingLines.push(remainder);
    }
  }

  // If we reached EOF and never saw a section separator,
  // everything in headerLines is actually data (or mixed).
  if (!headerDone && headerLines.length > 0) {
    pendingLines = headerLines;
    headerLines = [];
    headerDone = true;
  }

  const flushed = await flushPending();
  for (const item of flushed) yield item;
}
