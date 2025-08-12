import Collection from '../../core/collection';
import Definitions from '../../core/definitions';
import InternetObject from '../../core/internet-object';
import CollectionNode from '../../parser/nodes/collections';
import ObjectNode from '../../parser/nodes/objects';
import TokenNode from '../../parser/nodes/tokens';
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

  // Process items
  for (let i = 0; i < length; i++) {
    const item = data.children[i] as ObjectNode;
    collection.push(processObject(item, resolvedSchema, defs, i));
  }

  return collection;
}
