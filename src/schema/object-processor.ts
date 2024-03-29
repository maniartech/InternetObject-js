import Definitions        from '../core/definitions';
import InternetObject     from '../core/internet-object';
import ErrorCodes         from '../errors/io-error-codes';
import SyntaxError        from '../errors/io-syntax-error';
import MemberNode         from '../parser/nodes/members';
import ObjectNode         from '../parser/nodes/objects';
import MemberDef          from '../types/memberdef';
import TypedefRegistry    from './typedef-registry';
import Schema             from './schema';
import TokenNode          from '../parser/nodes/tokens';
import assertNever        from '../errors/asserts/asserts';

export default function processObject(data: ObjectNode, schema: Schema | TokenNode, defs?: Definitions, collectionIndex?: number) {
  if (schema instanceof TokenNode) {
    const schemaName = schema.value as string;
    schema = defs?.getV(schemaName);
  }

  if (schema instanceof Schema === false) {
    console.log("::", schema)
    assertNever("Invalid schema type");
  }

  return _processObject(data, schema as Schema, defs, collectionIndex);
}

function _processObject(data: ObjectNode, schema: Schema, defs?: Definitions, collectionIndex?: number) {
  const o: InternetObject = new InternetObject();
  let positional = true;

  const processedNames = new Set<string>();
  for (let i=0; i<schema.names.length; i++) {
    let member = data.children[i] as MemberNode;
    let name = schema.names[i];
    let memberDef = schema.defs[name];

    if (member) {
      if (member.key) {
        if (positional) positional = false;
        name = member.key.value;
        memberDef = schema.defs[name];
        processedNames.add(name);
      } else {
        // Once the keyed member is found after the positional flag is set to
        // false, the positional members must not be allowed.
        if (positional === false) {
          throw new SyntaxError(ErrorCodes.unexpectedPositionalMember, "Positional members must not be allowed after the keyed member is found.", member);
        }
      }
    } else {
      // TODO: If the member is not found, then we must provide way to
      // show the current object in the error state.
    }

    const val = processMember(member, memberDef, defs);
    if (val !== undefined) o[name] = val;
  }

  // If schema supports additional properties, then add them to the object
  // if any. Otherwise  ignore the additional properties if any,
  // and return the object as it is.
  if (!schema.open) return o

  for (let i=schema.names.length; i < data.children.length; i += 1) {
    const member = data.children[i] as MemberNode;
    if (member) {
      if (member.key) {
        const name = member.key.value;
        o[name] = member.value.toValue(defs);
      } else {
        o.push(member.value.toValue(defs));
      }
    }
  }

  return o
}

function processMember(member: MemberNode, memberDef: MemberDef, defs?: Definitions): any {
  const typeDef = TypedefRegistry.get(memberDef.type);

  // console.log(member, memberDef)
  if (memberDef.path === 'of') {
    debugger
  }

  if (!typeDef) {
    throw new Error(`Type ${memberDef.type} is not registered.`);
  }

  // Check if the values is present and it is a variable that starts
  // with @. If so, then unwrap the variable and return the value.
  let valueNode = member?.value

  // if (valueNode instanceof TokenNode && valueNode.type === TokenType.STRING) {
  //   const variable = valueNode.value as string;
  //   if (variable.startsWith('@')) {
  //     valueNode = defs?.getV(variable);
  //   }
  // }

  return typeDef.parse(valueNode, memberDef, defs);
}
