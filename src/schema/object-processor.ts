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
import { processMember }  from './processing/member-processor';

/**
 * Resolves variable references in memberDef fields like default, min, max, choices.
 * Variables are strings starting with @ that reference definitions.
 */
function _resolveMemberDefVariables(memberDef: MemberDef, defs?: Definitions): MemberDef {
  if (!memberDef || !defs) return memberDef;

  const resolved = { ...memberDef };

  // Resolve default value if it's a variable reference
  if (typeof resolved.default === 'string' && resolved.default.startsWith('@')) {
    resolved.default = defs.getV(resolved.default);
    // Unwrap TokenNode if needed
    if (resolved.default instanceof TokenNode) {
      resolved.default = resolved.default.value;
    }
  }

  // Resolve choices if they contain variable references
  if (Array.isArray(resolved.choices)) {
    resolved.choices = resolved.choices.map(choice => {
      if (typeof choice === 'string' && choice.startsWith('@')) {
        let resolved = defs.getV(choice);
        return resolved instanceof TokenNode ? resolved.value : resolved;
      }
      return choice;
    });
  }

  // Resolve min/max if they're variable references
  if (typeof resolved.min === 'string' && resolved.min.startsWith('@')) {
    resolved.min = defs.getV(resolved.min);
    if (resolved.min instanceof TokenNode) {
      resolved.min = resolved.min.value;
    }
  }
  if (typeof resolved.max === 'string' && resolved.max.startsWith('@')) {
    resolved.max = defs.getV(resolved.max);
    if (resolved.max instanceof TokenNode) {
      resolved.max = resolved.max.value;
    }
  }

  return resolved;
}

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

  // Special case: if schema has exactly one field and first data member has a key that doesn't match,
  // treat the entire data object as the value for that single schema field
  if (schema.names.length === 1 && data.children.length > 0) {
    const firstMember = data.children[0] as MemberNode;
    if (firstMember?.key && firstMember.key.value !== schema.names[0]) {
      const name = schema.names[0];
      const memberDef = _resolveMemberDefVariables(schema.defs[name], defs);
      // Create a synthetic member with the entire data ObjectNode as its value
      const syntheticMember = { key: null, value: data } as any;
      const val = processMember(syntheticMember, memberDef, defs);
      if (val !== undefined) o.set(name, val);
      return o;
    }
  }

  // Process positional schema members
  let i=0;
  for (; i<schema.names.length; i++) {
    let member = data.children[i] as MemberNode;
    let name = schema.names[i];
    let memberDef = _resolveMemberDefVariables(schema.defs[name], defs);

    if (member) {
      if (member.key) {
        positional = false;
        break;
      }

      const val = processMember(member, memberDef, defs);
      // Only mark as processed if we actually obtained a value (or a default was applied)
      if (val !== undefined) {
        processedNames.add(name);
        o.set(name, val);
      } else {
        // If optional and no default, allow later keyed assignment without triggering duplicate-member
        if (!memberDef.optional && memberDef.default === undefined) {
          // Required but undefined value – throw
          throw new ValidationError(ErrorCodes.valueRequired, `Expecting a value for ${memberDef.path}.`, data);
        }
        // Optional missing: skip adding to processedNames now so a later keyed value may fill it.
      }
    } else {
      // Member node entirely missing
      if (!memberDef.optional && memberDef.default === undefined) {
        throw new ValidationError(ErrorCodes.valueRequired, `Expecting a value for ${memberDef.path}.`, data);
      }
      const dummyMember = { key: null, value: undefined } as any;
      const val = processMember(dummyMember, memberDef, defs);
      if (val !== undefined) {
        processedNames.add(name);
        o.set(name, val);
      }
      // If val is undefined and optional with no default, deliberately do not mark processedNames
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

    let name = member.key.value as string;
    let memberDef = _resolveMemberDefVariables(schema.defs[name], defs);

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
        memberDef = { ...schema.open, path: name as string };
      } else {
        memberDef = { type: 'any', path: name as string };
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

    const memberDef = _resolveMemberDefVariables(schema.defs[name], defs);
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
