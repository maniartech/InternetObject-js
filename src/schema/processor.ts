import Collection       from '../core/collection';
import Definitions      from '../core/definitions';
import InternetObject   from '../core/internet-object';
import CollectionNode   from '../parser/nodes/collections';
import MemberNode       from '../parser/nodes/members';
import ObjectNode       from '../parser/nodes/objects';
import MemberDef        from '../types/memberdef';
import TypedefRegistry  from '../types/typedef-registry';
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

function processObject(data: ObjectNode, schema: Schema, defs?: Definitions) {
  const o: InternetObject = new InternetObject();
  for (let i=0; i<schema.names.length; i++) {
    const name = schema.names[i];
    const memberDef = schema.defs[name];
    const member = data.children[i] as MemberNode;

    o[name] = processMember(member, memberDef, defs);
  }

  return o
}

function processMember(member: MemberNode, memberDef: MemberDef, defs?: Definitions): any {
  const typeDef = TypedefRegistry.get(memberDef.type);

  if (!typeDef) {
    throw new Error(`Type ${memberDef.type} is not registered.`);
  }

  return typeDef.parse(member.value, memberDef, defs);
}
