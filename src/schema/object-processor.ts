import Definitions        from '../core/definitions';
import InternetObject     from '../core/internet-object';
import ErrorCodes         from '../errors/io-error-codes';
import SyntaxError        from '../errors/io-syntax-error';
import ValidationError    from '../errors/io-validation-error';
import MemberNode         from '../parser/nodes/members';
import ObjectNode         from '../parser/nodes/objects';
import TokenNode          from '../parser/nodes/tokens';
import assertNever        from '../errors/asserts/asserts';
import TypedefRegistry    from './typedef-registry';
import Schema             from './schema';
import MemberDef          from './types/memberdef';
import { processMember }  from './member-processor';

export default function processObject(data: ObjectNode, schema: Schema | TokenNode, defs?: Definitions, collectionIndex?: number) {
  if (schema instanceof TokenNode) {
    const schemaName = schema.value as string;
    schema = defs?.getV(schemaName);
  }

  if (schema instanceof Schema === false) {
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
      if (val !== undefined) o.set(name, val);
    } else {
      if (!memberDef.optional) {
        throw new ValidationError(ErrorCodes.valueRequired, `Expecting a value for ${memberDef.path}.`, data);
      }
    }
  }

  // Process remaining positional members
  if (positional) {
    for (; i<data.children.length; i++) {
      const member = data.children[i] as MemberNode;
      if (!schema.open) {
        throw new SyntaxError(ErrorCodes.additionalValuesNotAllowed, `Additional values are not allowed in the ${schema.name}. The ${schema.name} schema is not open.`, member.value);
      }
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
        ErrorCodes.unknownMember, `The ${schema.name ? `${schema.name} ` : ''}schema does not define a member named '${name}'.`, member.key)
    }

    // In an open schema, the memberDef is not found. Use schema.open constraints if available, else type 'any'.
    if (!memberDef && schema.open) {
      if (typeof schema.open === 'object' && schema.open.type) {
        memberDef = { ...schema.open, path: name };
      } else {
        memberDef = { type: 'any', path: name };
      }
    }

    processedNames.add(name);
    const val = processMember(member, memberDef, defs);
    o.set(name, val);
  }

  // Check for missing required members and if the missing member has a
  // default value, then set the default value. Otherwise, throw an error.
  // But before throwing an error reset the position to the data node.
  for (const name in schema.defs) {
  // Skip the wildcard additional property definition ('*').
  // It's not an actual member and must not participate in required checks.
  if (name === '*') continue;

    const memberDef = schema.defs[name];
    if (!processedNames.has(name)) {
      const member = data.children.find((m) => (m as any).key?.value === name)

      try {
        const val = processMember(member as any, memberDef, defs);
        if (val !== undefined) {
          o.set(name, val);
        }
      } catch (err) {
        if (err instanceof ValidationError) {
          // in case of missing member, set the position to the parent object.
          err.positionRange = data;
        }
        throw err
      }
    }
  }

  // Fallback: if schema is open and result is empty, process all data members as type 'any' or using schema.open constraints
  if ((schema.open === true || (typeof schema.open === 'object' && schema.open.type)) && o.isEmpty()) {
    for (const member of data.children) {
      if (!member) continue;
      const memberNode = member as any;
      let name = memberNode.key ? memberNode.key.value : undefined;
      if (!name) continue;
      let memberDef: MemberDef;
      if (typeof schema.open === 'object' && schema.open.type) {
        memberDef = { ...schema.open, path: name };
      } else {
        memberDef = { type: 'any', path: name };
      }
      const val = processMember(memberNode, memberDef, defs);
      o.set(name, val);
    }
    return o;
  }

  return o;
}
