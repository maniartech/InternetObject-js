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
import { ProcessingContext } from './processing-context';

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
      // Also annotate the underlying error with collectionIndex for consistency
      try {
        (item as any).error.collectionIndex = i;
      } catch {}
      collection.push(item as unknown as any);
    } else {
      // Create a ProcessingContext for this object to collect all its errors
      const ctx = new ProcessingContext();

      try {
        // Pass context - processObject will add ALL validation errors to it
        const result = processObject(item as ObjectNode, resolvedSchema, defs, i, ctx);

        // If there were validation errors, create an ErrorNode but still have the result
        if (ctx.hasErrors()) {
          const errors = ctx.getErrors();
          // Attach collectionIndex to each error
          for (const error of errors) {
            (error as any).collectionIndex = i;
            // Add to document-level error collector if provided
            if (errorCollector) {
              errorCollector.push(error);
            }
            // Add to collection's own errors
            collection.errors.push(error);
          }
          // Create error node with the first error for display
          const errorNode = new ErrorNode(
            errors[0],
            (item as ObjectNode).getStartPos(),
            (item as ObjectNode).getEndPos()
          );
          collection.push(errorNode as unknown as any);
        } else {
          // No errors - push the result directly
          collection.push(result);
        }
      } catch (error) {
        // Syntax errors and other critical errors are still thrown
        if (error instanceof Error) {
          // Attach boundary context for downstream serializers/UI
          (error as any).collectionIndex = i;
          const errorNode = new ErrorNode(
            error,
            (item as ObjectNode).getStartPos(),
            (item as ObjectNode).getEndPos()
          );
          // Add error to error collector if provided
          if (errorCollector) {
            errorCollector.push(error);
          }
          // Add to collection's own errors
          collection.errors.push(error);
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
