import Definitions        from '../core/definitions';
import InternetObject     from '../core/internet-object';
import ErrorCodes         from '../errors/io-error-codes';
import SyntaxError        from '../errors/io-syntax-error';
import ValidationError    from '../errors/io-validation-error';
import MemberNode         from '../parser/nodes/members';
import ObjectNode         from '../parser/nodes/objects';
import TokenNode          from '../parser/nodes/tokens';
import assertNever        from '../errors/asserts/asserts';
import Schema             from './schema';
import MemberDef          from './types/memberdef';
import { processMember }  from './processing/member-processor';
import { ProcessingContext } from './processing/processing-context';
import { undeclaredMemberDef } from './utils/member-utils';

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

export default function processObject(
  data: ObjectNode,
  schema: Schema | TokenNode,
  defs?: Definitions,
  collectionIndex?: number,
  context?: ProcessingContext
) {
  if (schema instanceof TokenNode) {
    const schemaName = schema.value as string;
    schema = defs?.getV(schemaName);
  }

  if (schema instanceof Schema === false) {
    assertNever("Invalid schema type");
  }

  return _processObject(data, schema as Schema, defs, collectionIndex, context);
}

function _processObject(
  data: ObjectNode,
  schema: Schema,
  defs?: Definitions,
  collectionIndex?: number,
  context?: ProcessingContext
) {
  const o: InternetObject = new InternetObject();
  let positional = true;
  const processedNames = new Set<string>();

  // Use provided context or create a local one for error collection
  const ctx = context ?? new ProcessingContext();
  const isTopLevel = !context; // True if we created the context (not passed in)

  // Helper to handle errors: add to context
  const handleError = (error: Error): void => {
    ctx.addError(error);
  };

  // Helper to collect errors from nested InternetObjects
  const collectNestedErrors = (val: any): void => {
    if (val instanceof InternetObject && val.errors.length > 0) {
      ctx.addErrors(val.errors);
      // Clear nested errors after collecting to prevent double-counting
      val.errors.length = 0;
    }
  };

  // Fill in every schema member not yet bound: applies `default`, permits `optional`, and raises
  // `value-required` for the rest. Shared by the normal path and the lone-object absorption path
  // below, so required members and defaults are honored either way.
  //
  // `lookupInData` is false for the absorption path: there the ENTIRE row was consumed as member
  // 0's value, so re-reading a key out of it would bind the same data twice.
  const fillMissingMembers = (lookupInData: boolean): void => {
    for (const name in schema.defs) {
      // Skip the wildcard additional property definition ('*') - not an actual member.
      if (name === '*') continue;
      if (processedNames.has(name)) continue;

      const memberDef = _resolveMemberDefVariables(schema.defs[name], defs);
      const member = lookupInData
        ? data.children.find((m) => (m as any).key?.value === name)
        : undefined;

      try {
        const val = processMember(member as any, memberDef, defs);
        collectNestedErrors(val);
        if (val !== undefined) o.set(name, val);
      } catch (err) {
        if (err instanceof ValidationError) {
          // in case of missing member, set the position to the parent object.
          err.positionRange = data;
          handleError(err);
        } else {
          throw err;
        }
      }
    }
  };

  // Lone-object record: when the row's first member is KEYED with a name the schema does not
  // declare, the row cannot be the record itself, so it is the value of the first schema member.
  // Applied at every arity for CLOSED schemas, so the reading no longer depends on how many
  // members a schema happens to declare (io-test-cases ISSUE-15). An OPEN schema is excluded:
  // there an undeclared key is a legal extra member, so there is nothing to disambiguate — except
  // in the single-declared-member case, whose long-standing behavior is preserved.
  if (data.children.length > 0 && (!schema.open || schema.names.length === 1)) {
    const firstMember = data.children[0] as MemberNode;
    // Cast (not convert): keeps strict-equality semantics identical to the previous
    // `key.value !== names[0]` comparison, so a numeric key never matches a string member name.
    if (firstMember?.key && !schema.names.includes(firstMember.key.value as unknown as string)) {
      const name = schema.names[0];
      const memberDef = _resolveMemberDefVariables(schema.defs[name], defs);
      // Create a synthetic member with the entire data ObjectNode as its value
      const syntheticMember = { key: null, value: data } as any;
      try {
        const val = processMember(syntheticMember, memberDef, defs);
        // Collect errors from nested InternetObjects
        collectNestedErrors(val);
        if (val !== undefined) o.set(name, val);
      } catch (err) {
        if (err instanceof ValidationError) {
          handleError(err);
        } else {
          throw err;
        }
      }
      // The row was consumed as member 0's value; every OTHER schema member is absent, so it must
      // still get its default / optional / value-required treatment (it used to be skipped).
      processedNames.add(name);
      fillMissingMembers(false);
      // If top-level call (no context passed), throw the first error (backward compatible)
      if (isTopLevel && ctx.hasErrors()) {
        throw ctx.getErrors()[0];
      }
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

      try {
        const val = processMember(member, memberDef, defs);
        // Collect errors from nested InternetObjects
        collectNestedErrors(val);
        // Only mark as processed if we actually obtained a value (or a default was applied)
        if (val !== undefined) {
          processedNames.add(name);
          o.set(name, val);
        } else {
          // If optional and no default, allow later keyed assignment without triggering duplicate-member
          if (!memberDef.optional && memberDef.default === undefined) {
            // Required but undefined value – collect error
            handleError(new ValidationError(ErrorCodes.valueRequired, `Expecting a value for ${memberDef.path}.`, data));
          }
          // Optional missing: skip adding to processedNames now so a later keyed value may fill it.
        }
      } catch (err) {
        if (err instanceof ValidationError) {
          handleError(err);
          processedNames.add(name); // Mark as processed to avoid duplicate errors
        } else {
          throw err;
        }
      }
    } else {
      // Member node entirely missing
      if (!memberDef.optional && memberDef.default === undefined) {
        handleError(new ValidationError(ErrorCodes.valueRequired, `Expecting a value for ${memberDef.path}.`, data));
        processedNames.add(name); // Mark as processed to avoid duplicate errors
      } else {
        try {
          const dummyMember = { key: null, value: undefined } as any;
          const val = processMember(dummyMember, memberDef, defs);
          // Collect errors from nested InternetObjects
          collectNestedErrors(val);
          if (val !== undefined) {
            processedNames.add(name);
            o.set(name, val);
          }
        } catch (err) {
          if (err instanceof ValidationError) {
            handleError(err);
            processedNames.add(name);
          } else {
            throw err;
          }
        }
      }
      // If val is undefined and optional with no default, deliberately do not mark processedNames
    }
  }

  // Process remaining positional members
  if (positional) {
    for (; i<data.children.length; i++) {
      const member = data.children[i] as MemberNode;
      if (!schema.open) {
        // A surplus positional value is the same fault as a surplus named member: a closed schema
        // was given something it does not declare. One code, two messages -- and a VALIDATION
        // error, matching the named case, because the data is at fault rather than the text.
        throw new ValidationError(
          ErrorCodes.unknownMember,
          `The ${schema.name ? `${schema.name} ` : ''}schema declares ${schema.names.length} member(s); this value has no member to bind to.`,
          member.value);
      }
      if (member.key) {
        positional = false;
        break;
      }

      const val = member.value.toValue(defs)

      o.pushValue(val);   // positional value — pushValue, not push (push would destructure an array value)
    }
  }

  // Process remaining keyed members
  for (; i<data.children.length; i++) {
    let member = data.children[i] as MemberNode;

    if (!member.key) {
      // Syntax error - throw immediately
      throw new SyntaxError(ErrorCodes.unexpectedPositionalMember, "Positional members must not be allowed after the keyed member is found.", member);
    }

    let name = member.key.value as string;
    let memberDef = _resolveMemberDefVariables(schema.defs[name], defs);

    if (processedNames.has(name)) {
      // Syntax error - throw immediately
      throw new SyntaxError(ErrorCodes.duplicateMember, `Member ${name} is already defined.`, member);
    }

    // When the member is not found check if the schema is open to allow
    // additional properties. If not throw an error.
    if (!memberDef && !schema.open) {
      // A VALIDATION error: the text is well-formed, the DATA carries a member the schema does not
      // declare. This site used to raise it as a syntax error while the load path raised the same
      // condition as a validation error, so one code surfaced under two categories depending on
      // how the data arrived. CONFORMANCE.md 5.1 groups membership faults under validation.
      throw new ValidationError(
        ErrorCodes.unknownMember, `The ${schema.name ? `${schema.name} ` : ''}schema does not define a member named '${name}'.`, member.key)
    }

    // In an open schema, the memberDef is not found. Use schema.open constraints if available, else type 'any'.
    if (!memberDef && schema.open) {
      memberDef = undeclaredMemberDef(name as string, schema.open);
    }

    processedNames.add(name);
    try {
      const val = processMember(member, memberDef, defs);
      // Collect errors from nested InternetObjects
      collectNestedErrors(val);
      o.set(name, val);
    } catch (err) {
      if (err instanceof ValidationError) {
        handleError(err);
      } else {
        throw err;
      }
    }
  }

  // Check for missing required members and if the missing member has a
  // default value, then set the default value. Otherwise, throw an error.
  // But before throwing an error reset the position to the data node.
  fillMissingMembers(true);

  // Fallback: if schema is open and result is empty, process all data members as type 'any' or using schema.open constraints
  if ((schema.open === true || (typeof schema.open === 'object' && schema.open.type)) && o.isEmpty()) {
    for (const member of data.children) {
      if (!member) continue;
      const memberNode = member as any;
      let name = memberNode.key ? memberNode.key.value : undefined;
      if (!name) continue;
      const memberDef: MemberDef = undeclaredMemberDef(name, schema.open);
      try {
        const val = processMember(memberNode, memberDef, defs);
        // Collect errors from nested InternetObjects
        collectNestedErrors(val);
        o.set(name, val);
      } catch (err) {
        if (err instanceof ValidationError) {
          handleError(err);
        } else {
          throw err;
        }
      }
    }
    // If top-level call (no context passed), throw the first error (backward compatible)
    if (isTopLevel && ctx.hasErrors()) {
      throw ctx.getErrors()[0];
    }
    return o;
  }

  // If top-level call (no context passed), throw the first error (backward compatible)
  // When context IS provided, errors are already in it - don't throw
  if (isTopLevel && ctx.hasErrors()) {
    throw ctx.getErrors()[0];
  }

  return o;
}
