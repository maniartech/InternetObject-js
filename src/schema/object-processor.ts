import Definitions        from '../core/definitions';
import InternetObject     from '../core/internet-object';
import MemberNode         from '../parser/nodes/members';
import ObjectNode         from '../parser/nodes/objects';
import MemberDef          from '../types/memberdef';
import TypedefRegistry    from '../types/typedef-registry';
import Schema             from './schema';

export default function processObject(data: ObjectNode, schema: Schema, defs?: Definitions) {
  const o: InternetObject = new InternetObject();
  for (let i=0; i<schema.names.length; i++) {
    const name = schema.names[i];
    const memberDef = schema.defs[name];
    const member = data.children[i] as MemberNode;

    const val = processMember(member, memberDef, defs);
    if (val !== undefined) o[name] = val;
  }

  return o
}

function processMember(member: MemberNode, memberDef: MemberDef, defs?: Definitions): any {
  const typeDef = TypedefRegistry.get(memberDef.type);

  if (!typeDef) {
    throw new Error(`Type ${memberDef.type} is not registered.`);
  }

  return typeDef.parse(member?.value, memberDef, defs);
}
