import Schema from '../schema';
import MemberDef from '../types/memberdef';
import Definitions from '../../core/definitions';

/**
 * Result of inferring definitions from data
 */
export interface InferredDefs {
  definitions: Definitions;
  rootSchema: Schema;
}

/**
 * Infers Internet Object definitions from plain JavaScript data.
 *
 * This utility analyzes the structure and types of the input data
 * and generates proper Definitions with:
 * - `$schema` for the root object (default schema)
 * - Named schemas like `$borrowedBy`, `$membershipType` for nested objects
 *
 * @param data - The JavaScript data to infer definitions from
 * @returns InferredDefs containing Definitions and the root schema
 */
export function inferDefs(data: any): InferredDefs {
  const definitions = new Definitions();
  const schemaRegistry = new Map<string, Schema>();

  // Infer the root schema
  const rootSchema = inferSchemaWithDefs(data, '$schema', definitions, schemaRegistry);

  // Set the root schema as $schema (default schema)
  definitions.push('$schema', rootSchema, true, false);

  return { definitions, rootSchema };
}

/**
 * Infers a schema from data while collecting nested schemas into definitions
 */
function inferSchemaWithDefs(
  data: any,
  name: string,
  defs: Definitions,
  registry: Map<string, Schema>
): Schema {
  if (data === null || data === undefined) {
    const builder = Schema.create(name);
    builder.addMember('value', { type: 'any', optional: true });
    return builder.build();
  }

  if (Array.isArray(data)) {
    // For arrays, infer schema from objects if available
    if (data.length > 0 && typeof data[0] === 'object' && data[0] !== null && !Array.isArray(data[0])) {
      const objects = data.filter(item => typeof item === 'object' && item !== null && !Array.isArray(item));
      return inferSchemaFromObjectsWithDefs(objects, name, defs, registry);
    }
    // For arrays of primitives or empty arrays
    const builder = Schema.create(name);
    builder.addMember('items', { type: 'array' });
    return builder.build();
  }

  if (typeof data === 'object') {
    return inferSchemaFromObjectWithDefs(data, name, defs, registry);
  }

  // For primitive values
  const builder = Schema.create(name);
  builder.addMember('value', inferMemberDefWithDefs(data, 'value', defs, registry));
  return builder.build();
}

/**
 * Infers a schema from a single object, registering nested schemas
 */
function inferSchemaFromObjectWithDefs(
  obj: Record<string, any>,
  name: string,
  defs: Definitions,
  registry: Map<string, Schema>
): Schema {
  const builder = Schema.create(name);

  for (const [key, value] of Object.entries(obj)) {
    const memberDef = inferMemberDefWithDefs(value, key, defs, registry);
    builder.addMember(key, memberDef);
  }

  return builder.build();
}

/**
 * Infers a merged schema from multiple objects (for arrays of objects)
 */
function inferSchemaFromObjectsWithDefs(
  objects: Record<string, any>[],
  name: string,
  defs: Definitions,
  registry: Map<string, Schema>
): Schema {
  const memberDefs: Map<string, MemberDef> = new Map();
  const memberOrder: string[] = [];

  for (const obj of objects) {
    for (const [key, value] of Object.entries(obj)) {
      if (!memberDefs.has(key)) {
        memberDefs.set(key, inferMemberDefWithDefs(value, key, defs, registry));
        memberOrder.push(key);
      } else {
        const existingDef = memberDefs.get(key)!;
        const newDef = inferMemberDefWithDefs(value, key, defs, registry);

        // If types differ, use 'any'
        if (existingDef.type !== newDef.type) {
          existingDef.type = 'any';
        }

        // Merge nested schema references if both are objects
        if (existingDef.type === 'object' && newDef.type === 'object') {
          // If new one has a schema ref and existing doesn't, use the new one
          if (newDef.schemaRef && !existingDef.schemaRef) {
            existingDef.schemaRef = newDef.schemaRef;
          }
        }
      }
    }
  }

  // Mark members as optional if they don't appear in all objects
  for (const [key, def] of memberDefs) {
    const appearsInAll = objects.every(obj => key in obj);
    if (!appearsInAll) {
      def.optional = true;
    }
  }

  const builder = Schema.create(name);
  for (const key of memberOrder) {
    builder.addMember(key, memberDefs.get(key)!);
  }

  return builder.build();
}

/**
 * Infers a MemberDef from a JavaScript value, creating named schemas for nested objects
 */
function inferMemberDefWithDefs(
  value: any,
  path: string,
  defs: Definitions,
  registry: Map<string, Schema>
): MemberDef {
  if (value === null) {
    return { type: 'any', path, null: true, optional: true };
  }

  if (value === undefined) {
    return { type: 'any', path, optional: true };
  }

  const jsType = typeof value;

  switch (jsType) {
    case 'string':
      return { type: 'string', path };

    case 'number':
      return { type: 'number', path };

    case 'bigint':
      return { type: 'number', path };

    case 'boolean':
      return { type: 'bool', path };

    case 'object':
      if (Array.isArray(value)) {
        return inferArrayMemberDefWithDefs(value, path, defs, registry);
      }
      // Nested object - create a named schema
      return inferNestedObjectDef(value, path, defs, registry);

    default:
      return { type: 'any', path };
  }
}

/**
 * Infers a MemberDef for a nested object, creating a named schema definition
 */
function inferNestedObjectDef(
  obj: Record<string, any>,
  path: string,
  defs: Definitions,
  registry: Map<string, Schema>
): MemberDef {
  // Create schema name from path (e.g., borrowedBy -> $borrowedBy)
  const schemaName = `$${path}`;

  // Check if we already have this schema registered
  if (registry.has(schemaName)) {
    return { type: 'object', path, schemaRef: schemaName };
  }

  // Create the nested schema
  const nestedSchema = inferSchemaFromObjectWithDefs(obj, schemaName, defs, registry);

  // Register the schema
  registry.set(schemaName, nestedSchema);
  defs.push(schemaName, nestedSchema, true, false);

  return { type: 'object', path, schemaRef: schemaName };
}

/**
 * Infers a MemberDef for an array value
 */
function inferArrayMemberDefWithDefs(
  arr: any[],
  path: string,
  defs: Definitions,
  registry: Map<string, Schema>
): MemberDef {
  if (arr.length === 0) {
    return { type: 'array', path };
  }

  // Check if array contains objects
  const hasObjects = arr.some(item => typeof item === 'object' && item !== null && !Array.isArray(item));

  if (hasObjects) {
    // Infer schema from objects in the array
    const objects = arr.filter(item => typeof item === 'object' && item !== null && !Array.isArray(item));

    // Use singular form of path for item schema name
    const itemSchemaName = `$${singularize(path)}`;

    // Check if we already have this schema
    if (!registry.has(itemSchemaName)) {
      const itemSchema = inferSchemaFromObjectsWithDefs(objects, itemSchemaName, defs, registry);
      registry.set(itemSchemaName, itemSchema);
      defs.push(itemSchemaName, itemSchema, true, false);
    }

    return { type: 'array', path, schemaRef: itemSchemaName };
  }

  // For arrays of primitives
  return { type: 'array', path };
}

/**
 * Simple singularization for common cases
 * books -> book, subscribers -> subscriber, categories -> category
 */
function singularize(word: string): string {
  if (word.endsWith('ies')) {
    return word.slice(0, -3) + 'y';
  }
  if (word.endsWith('es') && (word.endsWith('sses') || word.endsWith('xes') || word.endsWith('zes') || word.endsWith('ches') || word.endsWith('shes'))) {
    return word.slice(0, -2);
  }
  if (word.endsWith('s') && !word.endsWith('ss')) {
    return word.slice(0, -1);
  }
  return word;
}

export default inferDefs;
