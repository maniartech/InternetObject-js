/**
 * Constants and configurations for Internet Object serialization.
 * Centralizes magic strings, standard properties, and format markers
 * to ensure consistency across serialization modules.
 */

/**
 * Standard MemberDef properties that should NOT be treated as constraints.
 * These are structural/metadata properties inherent to the MemberDef type.
 */
export const STANDARD_MEMBERDEF_PROPS = new Set([
  'type',
  'optional',
  'null',
  'path',
  'name',
  'schema',
  // Type-specific internal properties
  're',          // Compiled regex for pattern validation
  '__memberdef', // Internal marker
  'of'           // Array element type (handled specially)
]);

/**
 * Wildcard key for open schema additional properties
 */
export const WILDCARD_KEY = '*';

/**
 * IO format markers and delimiters
 */
export const IO_MARKERS = {
  /** Collection item prefix */
  COLLECTION_ITEM: '~',

  /** Section separator */
  SECTION_SEPARATOR: '---',

  /** Optional field marker (suffix) */
  OPTIONAL: '?',

  /** Nullable field marker (suffix) */
  NULLABLE: '*',

  /** Date marker prefix */
  DATE: 'd',

  /** Time marker prefix */
  TIME: 't',

  /** DateTime marker prefix */
  DATETIME: 'dt',

  /** True boolean */
  TRUE: 'T',

  /** False boolean */
  FALSE: 'F',

  /** Null value */
  NULL: 'N'
} as const;

/**
 * Default string enclosers for different formats
 */
export const STRING_ENCLOSERS = {
  REGULAR: '"',
  RAW: '\'',
  MULTILINE: '`'
} as const;

/**
 * Schema reference prefix for named schemas
 */
export const SCHEMA_PREFIX = '$';

/**
 * Definition prefix for variables
 */
export const DEFINITION_PREFIX = '~';

/**
 * Reserved section names that should not appear in output
 */
export const RESERVED_SECTION_NAMES = new Set([
  'unnamed',
  '$schema',
  'schema'
]);

/**
 * Union type operator for anyOf formatting
 */
export const UNION_OPERATOR = '|';

/**
 * Maximum nesting depth for recursive schema serialization
 * to prevent stack overflow
 */
export const MAX_NESTING_DEPTH = 100;
