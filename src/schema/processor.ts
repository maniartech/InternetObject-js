import Collection       from '../core/collection';
import Definitions      from '../core/definitions';
import InternetObject   from '../core/internet-object';
import CollectionNode   from '../parser/nodes/collections';
import ObjectNode       from '../parser/nodes/objects';
import processObject    from './object-processor';
import Schema           from './schema';

export default function processSchema(data:ObjectNode | CollectionNode | null, schema: Schema, defs?: Definitions) {
  if (!data) {
    return null;
  }

  if (data instanceof ObjectNode) {
    return processObject(data, schema, defs);
  }

  if (data instanceof CollectionNode) {
    return processCollection(data, schema, defs);
  }
}

function processCollection(data: CollectionNode, schema: Schema, defs?: Definitions) {
  const coll = new Collection<InternetObject>();
  for (let i=0; i<data.children.length; i++) {
    const member = data.children[i] as ObjectNode;
    coll.push(processObject(member, schema, defs));
  }

  return coll;
}
