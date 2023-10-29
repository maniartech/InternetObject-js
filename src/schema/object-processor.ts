import Definitions        from '../core/definitions';
import InternetObject     from '../core/internet-object';
import MemberNode         from '../parser/nodes/members';
import ObjectNode         from '../parser/nodes/objects';
import MemberDef          from '../types/memberdef';
import TypedefRegistry    from '../types/typedef-registry';
import Schema             from './schema';

export default function processObject(data: ObjectNode, schema: Schema, defs?: Definitions) {
  const o: InternetObject = new InternetObject();
  let positional = true;
  for (let i=0; i<schema.names.length; i++) {
    let member = data.children[i] as MemberNode;
    let name = schema.names[i];
    let memberDef = schema.defs[name];

    if (member) {
      if (member.key) {
        if (positional) positional = false;
        name = member.key.value;
        memberDef = schema.defs[name];
      } else {
        // Once the keyed member is found after the positional flag is set to
        // false, the positional members must not be allowed.
        if (positional === false) {
          throw new Error(`Invalid member ${name} found in the object.`);
        }
      }
    }


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
