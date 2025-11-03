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
  defs?: Definitions
): Collection<InternetObject> {
  // Pre-resolve schema once for better performance
  const resolvedSchema = SchemaResolver.resolve(schema, defs);

  // Pre-allocate collection with known size
  const collection = new Collection<InternetObject>();
  const length = data.children.length;

  // Process items, skipping ErrorNode objects from failed parsing
  for (let i = 0; i < length; i++) {
    const item = data.children[i];

    // Skip ErrorNode - these are parsing errors that were recovered from
    if (item instanceof ErrorNode) {
      continue;
    }

    collection.push(processObject(item as ObjectNode, resolvedSchema, defs, i));
  }

  return collection;
}
