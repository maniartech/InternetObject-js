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
 * Represents a schema instance with its full path for conflict detection
 */
interface SchemaInstanceInfo {
  baseName: string;      // The simple name (e.g., 'address')
  fullPath: string[];    // Full path (e.g., ['employee', 'manager', 'address'])
  instance: Record<string, any>;
  resolvedName?: string; // Final resolved name after conflict resolution
}

/**
 * Context for tracking schema instances during deep multi-pass inference
 */
interface InferenceContext {
  definitions: Definitions;
  schemaRegistry: Map<string, Schema>;
  // Collect ALL instances of each schema type globally with path info
  schemaInstances: Map<string, SchemaInstanceInfo[]>;
  // Track resolved names after conflict resolution
  resolvedNames: Map<string, string>; // fullPath.join('.') -> resolved schema name
  // Track which schemas need re-merging after collection
  pendingMerge: Set<string>;
}

/**
 * Infers Internet Object definitions from plain JavaScript data.
 *
 * This utility analyzes the structure and types of the input data
 * and generates proper Definitions with:
 * - `$schema` for the root object (default schema)
 * - Named schemas like `$borrowedBy`, `$membershipType` for nested objects
 *
 * Implements Deep Multi-Pass Inference:
 * - Phase 1: Discovery - traverse data and identify all schema types
 * - Phase 2: Collection - gather ALL instances of each schema globally
 * - Phase 3: Conflict Resolution - resolve name conflicts for same key at different paths
 * - Phase 4: Merging - merge all instances to build comprehensive schemas
 * - Phase 5: Finalization - set up definitions with proper ordering
 *
 * @param data - The JavaScript data to infer definitions from
 * @returns InferredDefs containing Definitions and the root schema
 */
export function inferDefs(data: any): InferredDefs {
  const ctx: InferenceContext = {
    definitions: new Definitions(),
    schemaRegistry: new Map(),
    schemaInstances: new Map(),
    resolvedNames: new Map(),
    pendingMerge: new Set()
  };

  // Phase 1 & 2: Discovery and Collection
  // First pass to identify schema types and collect all instances with paths
  collectSchemaInstances(data, '$schema', [], ctx);

  // Phase 3: Resolve schema name conflicts
  resolveSchemaNameConflicts(ctx);

  // Phase 4: Merge all collected instances for each resolved schema
  mergeAllSchemaInstances(ctx);

  // Phase 5: Build the root schema with all nested schemas properly set up
  const rootSchema = buildFinalSchema(data, '$schema', [], ctx);

  // Set the root schema as $schema (default schema)
  ctx.definitions.push('$schema', rootSchema, true, false);

  return { definitions: ctx.definitions, rootSchema };
}

/**
 * Phase 1 & 2: Recursively traverse data to collect all schema instances with paths
 */
function collectSchemaInstances(
  data: any,
  baseName: string,
  currentPath: string[],
  ctx: InferenceContext
): void {
  if (data === null || data === undefined) {
    return;
  }

  if (Array.isArray(data)) {
    // For arrays of objects, collect all objects as instances of the item schema
    const objects = data.filter(item =>
      typeof item === 'object' && item !== null && !Array.isArray(item)
    );

    if (objects.length > 0) {
      // All objects in this array are instances of the same schema
      for (const obj of objects) {
        addSchemaInstance(baseName, currentPath, obj, ctx);
        // Recursively collect nested instances
        collectNestedInstances(obj, currentPath, ctx);
      }
    }
    return;
  }

  if (typeof data === 'object') {
    // Single object - add as instance and collect nested
    addSchemaInstance(baseName, currentPath, data, ctx);
    collectNestedInstances(data, currentPath, ctx);
  }
}

/**
 * Recursively collect schema instances from nested properties
 */
function collectNestedInstances(
  obj: Record<string, any>,
  parentPath: string[],
  ctx: InferenceContext
): void {
  for (const [key, value] of Object.entries(obj)) {
    if (value === null || value === undefined) continue;

    const currentPath = [...parentPath, key];

    if (Array.isArray(value)) {
      // Array property - collect instances with singularized schema name
      const itemBaseName = `$${singularize(key)}`;
      const objects = value.filter(item =>
        typeof item === 'object' && item !== null && !Array.isArray(item)
      );

      for (const item of objects) {
        addSchemaInstance(itemBaseName, currentPath, item, ctx);
        // Recursively collect from nested arrays
        collectNestedInstances(item, currentPath, ctx);
      }
    } else if (typeof value === 'object') {
      // Nested object - collect with key as schema name
      const nestedBaseName = `$${key}`;
      addSchemaInstance(nestedBaseName, currentPath, value, ctx);
      // Recursively collect from nested objects
      collectNestedInstances(value, currentPath, ctx);
    }
  }
}

/**
 * Add an object as an instance of a schema type with path tracking
 */
function addSchemaInstance(
  baseName: string,
  fullPath: string[],
  obj: Record<string, any>,
  ctx: InferenceContext
): void {
  if (!ctx.schemaInstances.has(baseName)) {
    ctx.schemaInstances.set(baseName, []);
  }

  const instanceInfo: SchemaInstanceInfo = {
    baseName,
    fullPath: [...fullPath],
    instance: obj
  };

  ctx.schemaInstances.get(baseName)!.push(instanceInfo);
  ctx.pendingMerge.add(baseName);
}

/**
 * Phase 3: Resolve schema name conflicts
 * When the same base name appears at different paths with different structures,
 * generate qualified names using parent path components.
 */
function resolveSchemaNameConflicts(ctx: InferenceContext): void {
  for (const [baseName, instances] of ctx.schemaInstances) {
    if (baseName === '$schema') {
      // Root schema doesn't need conflict resolution
      for (const info of instances) {
        info.resolvedName = '$schema';
        ctx.resolvedNames.set(pathKey(info.fullPath, baseName), '$schema');
      }
      continue;
    }

    // Group instances by their path signature
    const pathGroups = groupInstancesByPath(instances);

    if (pathGroups.size === 1) {
      // All instances at same path - no conflict, use base name
      for (const info of instances) {
        info.resolvedName = baseName;
        ctx.resolvedNames.set(pathKey(info.fullPath, baseName), baseName);
      }
    } else {
      // Multiple paths - check if structures differ
      const structuresByPath = new Map<string, Set<string>>();

      for (const [pathSig, groupInstances] of pathGroups) {
        const structureKeys = new Set<string>();
        for (const info of groupInstances) {
          structureKeys.add(getStructureSignature(info.instance));
        }
        structuresByPath.set(pathSig, structureKeys);
      }

      // Check if all paths have the same structure
      const allStructures = new Set<string>();
      for (const structures of structuresByPath.values()) {
        for (const s of structures) allStructures.add(s);
      }

      if (allStructures.size === 1) {
        // Same structure at all paths - can share schema name
        for (const info of instances) {
          info.resolvedName = baseName;
          ctx.resolvedNames.set(pathKey(info.fullPath, baseName), baseName);
        }
      } else {
        // Different structures - need qualified names
        resolveConflictingNames(baseName, pathGroups, ctx);
      }
    }
  }
}

/**
 * Group instances by their path signature
 */
function groupInstancesByPath(
  instances: SchemaInstanceInfo[]
): Map<string, SchemaInstanceInfo[]> {
  const groups = new Map<string, SchemaInstanceInfo[]>();

  for (const info of instances) {
    // Create a normalized path signature (remove array indices conceptually)
    const pathSig = info.fullPath.join('.');

    if (!groups.has(pathSig)) {
      groups.set(pathSig, []);
    }
    groups.get(pathSig)!.push(info);
  }

  return groups;
}

/**
 * Get a signature representing the structure of an object (keys and their types)
 */
function getStructureSignature(obj: Record<string, any>): string {
  const entries = Object.entries(obj)
    .map(([key, value]) => {
      const type = value === null ? 'null' :
                   Array.isArray(value) ? 'array' :
                   typeof value;
      return `${key}:${type}`;
    })
    .sort();
  return entries.join(',');
}

/**
 * Resolve conflicting names by generating qualified names from path
 */
function resolveConflictingNames(
  baseName: string,
  pathGroups: Map<string, SchemaInstanceInfo[]>,
  ctx: InferenceContext
): void {
  // Sort paths by length (shorter paths get simpler names)
  const sortedPaths = Array.from(pathGroups.keys()).sort((a, b) => {
    const aLen = a.split('.').length;
    const bLen = b.split('.').length;
    return aLen - bLen;
  });

  // First path (shortest/root level) keeps the base name
  const usedNames = new Set<string>();

  for (let i = 0; i < sortedPaths.length; i++) {
    const pathSig = sortedPaths[i];
    const groupInstances = pathGroups.get(pathSig)!;

    let resolvedName: string;

    if (i === 0) {
      // First/shortest path keeps base name
      resolvedName = baseName;
    } else {
      // Generate qualified name from path
      resolvedName = generateQualifiedName(baseName, groupInstances[0].fullPath, usedNames);
    }

    usedNames.add(resolvedName);

    // Apply resolved name to all instances in this path group
    for (const info of groupInstances) {
      info.resolvedName = resolvedName;
      ctx.resolvedNames.set(pathKey(info.fullPath, baseName), resolvedName);
    }
  }
}

/**
 * Generate a qualified schema name from the path
 * e.g., ['employee', 'manager', 'address'] -> '$employeeManagerAddress'
 */
function generateQualifiedName(
  baseName: string,
  fullPath: string[],
  usedNames: Set<string>
): string {
  // Remove the $ prefix from baseName for manipulation
  const simpleName = baseName.startsWith('$') ? baseName.slice(1) : baseName;

  // Build qualified name from path components (excluding the last one which is the property name)
  // e.g., path=['employee', 'manager', 'address'] -> 'employeeManagerAddress'
  const pathParts = fullPath.slice(0, -1); // Exclude the last element (the property itself)

  if (pathParts.length === 0) {
    // No parent path, keep base name (shouldn't happen in conflict case)
    return baseName;
  }

  // Build camelCase qualified name
  const qualifiedParts = pathParts.map((part, index) => {
    // Singularize array parent names
    const singularPart = singularize(part);
    if (index === 0) {
      return singularPart.toLowerCase();
    }
    return capitalize(singularPart);
  });

  let qualifiedName = `$${qualifiedParts.join('')}${capitalize(simpleName)}`;

  // Ensure uniqueness
  let counter = 1;
  let uniqueName = qualifiedName;
  while (usedNames.has(uniqueName)) {
    uniqueName = `${qualifiedName}${counter++}`;
  }

  return uniqueName;
}

/**
 * Create a unique key for path + baseName combination
 */
function pathKey(fullPath: string[], baseName: string): string {
  return `${fullPath.join('.')}::${baseName}`;
}

/**
 * Capitalize first letter of a string
 */
function capitalize(str: string): string {
  if (!str) return str;
  return str.charAt(0).toUpperCase() + str.slice(1);
}

/**
 * Phase 4: Merge all collected instances for each resolved schema type
 */
function mergeAllSchemaInstances(ctx: InferenceContext): void {
  // Group instances by their resolved name
  const resolvedGroups = new Map<string, SchemaInstanceInfo[]>();

  for (const instances of ctx.schemaInstances.values()) {
    for (const info of instances) {
      const resolvedName = info.resolvedName || info.baseName;
      if (!resolvedGroups.has(resolvedName)) {
        resolvedGroups.set(resolvedName, []);
      }
      resolvedGroups.get(resolvedName)!.push(info);
    }
  }

  // Build merged schema for each resolved name
  for (const [resolvedName, instances] of resolvedGroups) {
    if (instances.length === 0) continue;

    // Get the representative path for this schema (from first instance)
    const representativePath = instances[0].fullPath;

    // Extract just the instance objects for merging
    const objects = instances.map(info => info.instance);

    // Build merged schema from all instances, passing the parent path context
    const mergedSchema = buildMergedSchema(objects, resolvedName, representativePath, ctx);
    ctx.schemaRegistry.set(resolvedName, mergedSchema);

    // Don't add $schema to definitions yet (handled separately)
    if (resolvedName !== '$schema') {
      ctx.definitions.push(resolvedName, mergedSchema, true, false);
    }
  }

  ctx.pendingMerge.clear();
}

/**
 * Build a merged schema from multiple object instances using multi-pass rules
 */
function buildMergedSchema(
  objects: Record<string, any>[],
  schemaName: string,
  parentPath: string[],
  ctx: InferenceContext
): Schema {
  const memberDefs: Map<string, MemberDef> = new Map();
  const memberOrder: string[] = [];
  const seenInIteration: Map<string, number> = new Map();

  for (let i = 0; i < objects.length; i++) {
    const obj = objects[i];
    const keysInThisObject = new Set(Object.keys(obj));

    // Process each key in current object
    for (const [key, value] of Object.entries(obj)) {
      if (!memberDefs.has(key)) {
        // First time seeing this key
        // Pass the full path (parentPath + key) for proper schema ref resolution
        const memberDef = inferMemberDefSimple(value, key, [...parentPath, key], ctx);

        // Rule 2 & 3: New key in later iteration → optional
        if (i > 0) {
          memberDef.optional = true;
        }

        // Rule 1 & 3: Null value → nullable
        if (value === null) {
          memberDef.null = true;
          memberDef.type = 'any';
        }

        memberDefs.set(key, memberDef);
        memberOrder.push(key);
        seenInIteration.set(key, i);
      } else {
        // Key already exists - merge/update
        const existingDef = memberDefs.get(key)!;
        mergeIntoMemberDef(existingDef, value, key, [...parentPath, key], ctx);
      }
    }

    // Rule 4: Mark keys missing in this object as optional
    for (const [key, def] of memberDefs) {
      if (!keysInThisObject.has(key) && seenInIteration.get(key)! < i) {
        def.optional = true;
      }
    }
  }

  const builder = Schema.create(schemaName);
  for (const key of memberOrder) {
    builder.addMember(key, memberDefs.get(key)!);
  }

  return builder.build();
}

/**
 * Merge a new value into an existing MemberDef (Rules 5 & 6)
 */
function mergeIntoMemberDef(
  existingDef: MemberDef,
  value: any,
  key: string,
  fullPath: string[],
  ctx: InferenceContext
): void {
  // Rule 6: Null in later iteration → add nullable
  if (value === null) {
    existingDef.null = true;
    return;
  }

  if (value === undefined) {
    existingDef.optional = true;
    return;
  }

  const newDef = inferMemberDefSimple(value, key, fullPath, ctx);

  // Rule 5: Type mismatch → any
  if (existingDef.type !== newDef.type && existingDef.type !== 'any') {
    // Real type mismatch (not just null handling)
    existingDef.type = 'any';
    // Clear schemaRef when becoming 'any'
    delete existingDef.schemaRef;
  }

  // Preserve schemaRef if both are objects with same schema
  if (existingDef.type === 'object' && newDef.type === 'object') {
    if (newDef.schemaRef && !existingDef.schemaRef) {
      existingDef.schemaRef = newDef.schemaRef;
    }
  }

  // Preserve schemaRef for arrays
  if (existingDef.type === 'array' && newDef.type === 'array') {
    if (newDef.schemaRef && !existingDef.schemaRef) {
      existingDef.schemaRef = newDef.schemaRef;
    }
  }
}

/**
 * Simple MemberDef inference for merge phase (uses resolved schema names based on path)
 * This is used during schema merging where we need basic type information
 * and the schema names are resolved based on the path context.
 */
function inferMemberDefSimple(
  value: any,
  path: string,
  fullPath: string[],
  ctx: InferenceContext
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
        return inferArrayMemberDefSimple(value, path, fullPath, ctx);
      }
      // Nested object - look up the resolved name based on the full path
      const baseName = `$${path}`;
      const resolvedName = ctx.resolvedNames.get(pathKey(fullPath, baseName)) || baseName;
      return { type: 'object', path, schemaRef: resolvedName };

    default:
      return { type: 'any', path };
  }
}

/**
 * Simple array MemberDef inference for merge phase
 */
function inferArrayMemberDefSimple(
  arr: any[],
  path: string,
  fullPath: string[],
  ctx: InferenceContext
): MemberDef {
  if (arr.length === 0) {
    return { type: 'array', path };
  }

  // Check if array contains objects
  const hasObjects = arr.some(item =>
    typeof item === 'object' && item !== null && !Array.isArray(item)
  );

  if (hasObjects) {
    const baseName = `$${singularize(path)}`;
    const resolvedName = ctx.resolvedNames.get(pathKey(fullPath, baseName)) || baseName;
    return { type: 'array', path, schemaRef: resolvedName };
  }

  // Check if array has mixed primitive types
  const types = new Set(arr.map(item => typeof item));
  if (types.size > 1 || arr.some(item => item === null)) {
    return { type: 'array', path };
  }

  // For arrays of same-type primitives
  return { type: 'array', path };
}

/**
 * Phase 5: Build the final schema structure using pre-merged schemas
 */
function buildFinalSchema(
  data: any,
  schemaName: string,
  currentPath: string[],
  ctx: InferenceContext
): Schema {
  // Use the pre-merged schema if available
  if (ctx.schemaRegistry.has(schemaName)) {
    return ctx.schemaRegistry.get(schemaName)!;
  }

  // Fallback for edge cases
  if (data === null || data === undefined) {
    const builder = Schema.create(schemaName);
    builder.addMember('value', { type: 'any', path: 'value', optional: true });
    return builder.build();
  }

  if (Array.isArray(data)) {
    const objects = data.filter(item =>
      typeof item === 'object' && item !== null && !Array.isArray(item)
    );
    if (objects.length > 0 && ctx.schemaRegistry.has(schemaName)) {
      return ctx.schemaRegistry.get(schemaName)!;
    }
  }

  if (typeof data === 'object') {
    if (ctx.schemaRegistry.has(schemaName)) {
      return ctx.schemaRegistry.get(schemaName)!;
    }
  }

  // For primitives at root (unlikely case)
  const builder = Schema.create(schemaName);
  builder.addMember('value', inferMemberDef(data, 'value', currentPath, ctx));
  return builder.build();
}

/**
 * Infers a MemberDef from a JavaScript value
 */
function inferMemberDef(
  value: any,
  path: string,
  currentPath: string[],
  ctx: InferenceContext
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
        return inferArrayMemberDef(value, path, currentPath, ctx);
      }
      // Nested object - reference the resolved schema name
      const baseName = `$${path}`;
      const fullPath = [...currentPath, path];
      const resolvedName = ctx.resolvedNames.get(pathKey(fullPath, baseName)) || baseName;
      return { type: 'object', path, schemaRef: resolvedName };

    default:
      return { type: 'any', path };
  }
}

/**
 * Infers a MemberDef for an array value
 */
function inferArrayMemberDef(
  arr: any[],
  path: string,
  currentPath: string[],
  ctx: InferenceContext
): MemberDef {
  if (arr.length === 0) {
    return { type: 'array', path };
  }

  // Check if array contains objects
  const hasObjects = arr.some(item =>
    typeof item === 'object' && item !== null && !Array.isArray(item)
  );

  if (hasObjects) {
    const baseName = `$${singularize(path)}`;
    const fullPath = [...currentPath, path];
    const resolvedName = ctx.resolvedNames.get(pathKey(fullPath, baseName)) || baseName;
    return { type: 'array', path, schemaRef: resolvedName };
  }

  // Check if array has mixed primitive types
  const types = new Set(arr.map(item => typeof item));
  if (types.size > 1 || arr.some(item => item === null)) {
    return { type: 'array', path };
  }

  // For arrays of same-type primitives
  return { type: 'array', path };
}

/**
 * Simple singularization for common cases
 * books -> book, subscribers -> subscriber, categories -> category
 */
function singularize(word: string): string {
  // Handle common irregular plurals
  const irregulars: Record<string, string> = {
    'children': 'child',
    'people': 'person',
    'men': 'man',
    'women': 'woman',
    'mice': 'mouse',
    'geese': 'goose',
    'teeth': 'tooth',
    'feet': 'foot',
    'data': 'datum',
    'criteria': 'criterion',
    'analyses': 'analysis',
    'indices': 'index'
  };

  const lower = word.toLowerCase();
  if (irregulars[lower]) {
    // Preserve original case of first letter
    const singular = irregulars[lower];
    return word[0] === word[0].toUpperCase()
      ? singular.charAt(0).toUpperCase() + singular.slice(1)
      : singular;
  }

  // Regular patterns
  if (word.endsWith('ies') && word.length > 3) {
    return word.slice(0, -3) + 'y';
  }
  if (word.endsWith('ves')) {
    return word.slice(0, -3) + 'f';
  }
  if (word.endsWith('es') && (
    word.endsWith('sses') ||
    word.endsWith('xes') ||
    word.endsWith('zes') ||
    word.endsWith('ches') ||
    word.endsWith('shes')
  )) {
    return word.slice(0, -2);
  }
  if (word.endsWith('s') && !word.endsWith('ss') && word.length > 1) {
    return word.slice(0, -1);
  }

  return word;
}

export default inferDefs;
