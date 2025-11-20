import Collection from '../../core/collection';
import Definitions from '../../core/definitions';
import InternetObject from '../../core/internet-object';
import CollectionNode from '../../parser/nodes/collections';
import ObjectNode from '../../parser/nodes/objects';
import TokenNode from '../../parser/nodes/tokens';
import ErrorNode from '../../parser/nodes/error';
import processObject from '../object-processor';
import Schema from '../schema';
import { SchemaResolver } from '../utils/schema-resolver';

export default function processCollection(
  data: CollectionNode,
  schema: Schema | TokenNode,
  defs?: Definitions,
  errorCollector?: Error[]
): Collection<any> {
  // Pre-resolve schema once for better performance
  const resolvedSchema = SchemaResolver.resolve(schema, defs);

  // Pre-allocate collection with known size
  const collection = new Collection<InternetObject>();
  const length = data.children.length;

  // Process items; include ErrorNode so UI can surface error info objects
  for (let i = 0; i < length; i++) {
    const item = data.children[i];

    // If parsing produced an ErrorNode, preserve it in the collection
    // so that downstream consumers (toJSON/UI) can render error info.
    // NOTE: Parser errors are already in document._errors, so we don't add them to errorCollector.
    if (item instanceof ErrorNode) {
      // Push ErrorNode directly; IOCollection.toJSON handles toValue()
      // which serializes error details with positions.
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      // Also annotate the underlying error with collectionIndex for consistency
      try {
        (item as any).error.collectionIndex = i;
      } catch {}
      collection.push(item as unknown as any);
    } else {
      try {
        collection.push(processObject(item as ObjectNode, resolvedSchema, defs, i));
      } catch (error) {
        // Validation error occurred - convert to ErrorNode and collect the error
        if (error instanceof Error) {
          // Attach boundary context for downstream serializers/UI
          (error as any).collectionIndex = i;
          const errorNode = new ErrorNode(
            error,
            (item as ObjectNode).getStartPos(),
            (item as ObjectNode).getEndPos()
          );
          // Add validation error to error collector if provided
          if (errorCollector) {
            errorCollector.push(error);
          }
          // Add to collection's own errors
          collection.errors.push(error);
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          collection.push(errorNode as unknown as any);
        } else {
          // Re-throw non-Error exceptions
          throw error;
        }
      }
    }
  }

  return collection;
}
