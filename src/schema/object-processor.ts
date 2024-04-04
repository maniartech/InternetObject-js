import Definitions        from '../core/definitions';
import InternetObject     from '../core/internet-object';
import ErrorCodes         from '../errors/io-error-codes';
import SyntaxError        from '../errors/io-syntax-error';
import ValidationError    from '../errors/io-validation-error';
import MemberNode         from '../parser/nodes/members';
import ObjectNode         from '../parser/nodes/objects';
import MemberDef          from '../types/memberdef';
import TokenNode          from '../parser/nodes/tokens';
import assertNever        from '../errors/asserts/asserts';
import TypedefRegistry    from './typedef-registry';
import Schema             from './schema';

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

  // Process positional schema members
  let i=0;
  for (; i<schema.names.length; i++) {
    let member = data.children[i] as MemberNode;
    let name = schema.names[i];
    let memberDef = schema.defs[name];

    if (member) {
      if (member.key) {
        positional = false;
        break;
      }

      processedNames.add(name);

      const val = processMember(member, memberDef, defs);
      if (val !== undefined) o[name] = val;
    } else {
      if (!memberDef.optional) {
        throw new ValidationError(ErrorCodes.valueRequired, `Expecting a value for ${memberDef.path}.`);
      }
    }
  }

  // Process remaining positional members
  if (positional) {
    for (; i<data.children.length; i++) {
      const member = data.children[i] as MemberNode;
      if (member.key) {
        positional = false;
        break;
      }

      const val = member.value.toValue(defs)
      o.push(val);
    }
  }

  // Process remaining keyed members
  for (; i<data.children.length; i++) {
    let member = data.children[i] as MemberNode;

    if (!member.key) {
      throw new SyntaxError(ErrorCodes.unexpectedPositionalMember, "Positional members must not be allowed after the keyed member is found.", member);
    }

    let name = member.key.value;
    let memberDef = schema.defs[name];

    if (processedNames.has(name)) {
      throw new SyntaxError(ErrorCodes.duplicateMember, `Member ${name} is already defined.`, member);
    }

    // When the member is not found check if the schema is open to allow
    // additional properties. If not throw an error.
    if (!memberDef && !schema.open) {
      throw new SyntaxError(
        ErrorCodes.unknownMember, `Member ${name} is not defined in the schema.`, member);
    }

    processedNames.add(name);

    const val = processMember(member, memberDef, defs);
    o[name] = val;
  }

  return o;
}

function processMember(member: MemberNode, memberDef: MemberDef, defs?: Definitions): any {
  const typeDef = TypedefRegistry.get(memberDef.type);

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
