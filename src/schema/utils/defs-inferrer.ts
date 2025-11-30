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
  // Track which property paths have been identified as dynamic collections
  // This allows us to treat single-item instances consistently
  dynamicPaths: Set<string>;
}

/**
 * Detects if an object has dynamic keys (acts like a collection/map).
 *
 * Pattern: An object has dynamic keys if:
 * 1. All values are non-null objects (not arrays, not primitives)
 * 2. All objects share at least one common key
 *
 * Examples of dynamic keys:
 * - { "1": {recode:"0"}, "2": {recode:"1"} }  - numeric keys, share "recode"
 * - { "QID1": {name:"Q1"}, "QID2": {name:"Q2"} }  - ID keys, share "name"
 *
 * Examples of static keys (NOT dynamic):
 * - { name: "John", age: 30 }  - values are primitives
 * - { user: {name}, settings: {theme} }  - no common keys
 */
function isDynamicKeyObject(obj: Record<string, any>): boolean {
  const keys = Object.keys(obj);
  if (keys.length < 2) return false;

  const values = keys.map(k => obj[k]);

  // Check 1: All values must be non-null objects (not arrays)
  const allObjects = values.every(v =>
    v !== null &&
    typeof v === 'object' &&
    !Array.isArray(v)
  );

  if (!allObjects) return false;

  // Check 2: Find common keys across ALL objects
  const allValueKeys = values.map(v => new Set(Object.keys(v)));
  const firstKeys = allValueKeys[0];

  // Find keys that exist in ALL objects
  const commonKeys = [...firstKeys].filter(key =>
    allValueKeys.every(keySet => keySet.has(key))
  );

  return commonKeys.length >= 1;
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
    pendingMerge: new Set(),
    dynamicPaths: new Set()
  };

  // Phase 0: Pre-scan to identify ALL dynamic paths across the entire data structure
  // This ensures that even single-item siblings are treated as dynamic if any sibling has multiple items
  preScanDynamicPaths(data, [], ctx);

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
 * Phase 0: Pre-scan to identify all dynamic paths before main collection.
 * This ensures that all sibling paths are treated consistently - if ANY instance
 * at a path has dynamic keys, ALL instances at that path will be treated as dynamic.
 */
function preScanDynamicPaths(
  data: any,
  currentPath: string[],
  ctx: InferenceContext
): void {
  if (data === null || data === undefined) return;

  if (Array.isArray(data)) {
    // Scan array items
    for (const item of data) {
      if (typeof item === 'object' && item !== null && !Array.isArray(item)) {
        preScanDynamicPaths(item, currentPath, ctx);
      }
    }
    return;
  }

  if (typeof data === 'object') {
    for (const [key, value] of Object.entries(data)) {
      if (value === null || value === undefined) continue;

      const childPath = [...currentPath, key];
      const pathKey = childPath.join('.');

      if (Array.isArray(value)) {
        // Scan array items
        for (const item of value) {
          if (typeof item === 'object' && item !== null && !Array.isArray(item)) {
            preScanDynamicPaths(item, childPath, ctx);
          }
        }
      } else if (typeof value === 'object') {
        // Check if this looks like a dynamic-key object
        if (isDynamicKeyObject(value)) {
          ctx.dynamicPaths.add(pathKey);
        }

        // Recursively scan into the object's values
        // For dynamic objects, we scan into each value but NOT include the dynamic key in path
        // Pass childPath (the dynamic object's path) so nested properties have correct paths
        if (ctx.dynamicPaths.has(pathKey) || isDynamicKeyObject(value)) {
          for (const childValue of Object.values(value)) {
            if (typeof childValue === 'object' && childValue !== null && !Array.isArray(childValue)) {
              preScanDynamicPaths(childValue, childPath, ctx);
            }
          }
        } else {
          // Regular object - scan with full path
          preScanDynamicPaths(value, childPath, ctx);
        }
      }
    }
  }
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
      // Check if this path is marked as dynamic (from pre-scan phase)
      // OR if it currently looks like a dynamic-key object
      const pathKey = currentPath.join('.');
      const isDynamic = ctx.dynamicPaths.has(pathKey) || isDynamicKeyObject(value);

      if (isDynamic) {
        // Ensure this path is marked as dynamic
        ctx.dynamicPaths.add(pathKey);

        // Treat as collection - all values are instances of the same schema
        const itemBaseName = `$${singularize(key)}`;

        for (const [dynamicKey, dynamicValue] of Object.entries(value)) {
          if (dynamicValue !== null && typeof dynamicValue === 'object' && !Array.isArray(dynamicValue)) {
            // Add each dynamic-keyed object as an instance of the singularized schema
            addSchemaInstance(itemBaseName, currentPath, dynamicValue, ctx);
            // Recursively collect from nested objects within dynamic values
            // IMPORTANT: Do NOT include dynamicKey in path - this ensures all nested
            // objects merge into the same schema regardless of which dynamic key they're under
            collectNestedInstances(dynamicValue, currentPath, ctx);
          }
        }
      } else {
        // Regular nested object - collect with key as schema name
        const nestedBaseName = `$${key}`;
        addSchemaInstance(nestedBaseName, currentPath, value, ctx);
        // Recursively collect from nested objects
        collectNestedInstances(value, currentPath, ctx);
      }
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
 * instead of creating qualified names, we fall back to plain 'object' type.
 *
 * Strategy:
 * - Same path, varying structures → merge into ONE schema (multi-pass handles optionality)
 * - Different paths, same structure → share schema name
 * - Different paths, different structures → mark as conflicted (use plain 'object')
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
      // Multi-pass merging will handle structural variations (optional fields)
      for (const info of instances) {
        info.resolvedName = baseName;
        ctx.resolvedNames.set(pathKey(info.fullPath, baseName), baseName);
      }
    } else {
      // Multiple paths - check if structures are COMPATIBLE (have common keys)
      // If they share at least one key, they can merge with optional fields
      // If they share NO keys, they're truly incompatible → CONFLICT

      // Collect all key sets from all instances
      const allKeySets: Set<string>[] = [];
      for (const info of instances) {
        allKeySets.push(new Set(Object.keys(info.instance)));
      }

      // Find keys that exist in ALL instances
      const firstKeys = allKeySets[0];
      const commonKeys = [...firstKeys].filter(key =>
        allKeySets.every(keySet => keySet.has(key))
      );

      if (commonKeys.length > 0) {
        // Compatible structures - share at least one key
        // Multi-pass merging will handle variations (optional fields)
        for (const info of instances) {
          info.resolvedName = baseName;
          ctx.resolvedNames.set(pathKey(info.fullPath, baseName), baseName);
        }
      } else {
        // No common keys at all → truly incompatible structures → CONFLICT
        // These will fall back to plain 'object' type without schemaRef
        for (const info of instances) {
          info.resolvedName = `${baseName}::CONFLICTED`;
          ctx.resolvedNames.set(pathKey(info.fullPath, baseName), `${baseName}::CONFLICTED`);
        }
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

    // Skip conflicted schemas - they won't be referenced anyway
    if (resolvedName.endsWith('::CONFLICTED')) {
      continue;
    }

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
      // Check if this is a dynamic key object (collection-like)
      // Also check dynamicPaths for single-item objects that were identified as dynamic
      // because a sibling has multiple items
      const fullPathKey = fullPath.join('.');
      if (isDynamicKeyObject(value) || ctx.dynamicPaths.has(fullPathKey)) {
        // Dynamic-keyed objects (maps) should NOT have a schemaRef
        // The schemaRef would describe the VALUE type, not the container itself
        // When stringifying, the container should be treated as a plain object
        // and each value will be validated/stringified according to the item schema
        return { type: 'object', path };
      }
      // Regular nested object - look up the resolved name based on the full path
      const baseName = `$${path}`;
      const resolvedName = ctx.resolvedNames.get(pathKey(fullPath, baseName)) || baseName;
      // If conflicted, fall back to plain object without schemaRef
      if (resolvedName.endsWith('::CONFLICTED')) {
        return { type: 'object', path };
      }
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
    // If conflicted, fall back to plain array without schemaRef
    if (resolvedName.endsWith('::CONFLICTED')) {
      return { type: 'array', path };
    }
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
      // Check if this is a dynamic key object (collection-like)
      // Also check dynamicPaths for single-item objects that were identified as dynamic
      // because a sibling has multiple items
      // Note: currentPath already includes 'path' at the end (passed from caller)
      const fullPathKey = currentPath.join('.');
      if (isDynamicKeyObject(value) || ctx.dynamicPaths.has(fullPathKey)) {
        // Dynamic-keyed objects (maps) should NOT have a schemaRef
        // The schemaRef would describe the VALUE type, not the container itself
        return { type: 'object', path };
      }
      // Regular nested object - reference the resolved schema name
      const baseName = `$${path}`;
      const resolvedName = ctx.resolvedNames.get(pathKey(currentPath, baseName)) || baseName;
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
