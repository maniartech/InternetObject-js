/**
 * Lazy Resolution Utilities for Schema V2
 *
 * Following V1 pattern for resolving @var and $schema references.
 * These are standalone utility functions (no ValidationContext needed).
 */

import Definitions from '../../core/definitions'

/**
 * Resolve a variable reference (@varName) from definitions.
 *
 * @param name - Variable name (without @ prefix)
 * @param defs - Definitions object containing variables
 * @returns Resolved value or undefined if not found
 *
 * @example
 * ```typescript
 * const value = resolveVar('maxLength', defs);
 * ```
 */
export function resolveVar(name: string, defs?: Definitions): any {
  if (!defs) return undefined
  return defs.getV(`@${name}`)
}

/**
 * Resolve a schema reference ($schemaName) from definitions.
 *
 * @param name - Schema name (without $ prefix)
 * @param defs - Definitions object containing schemas
 * @returns Resolved schema or undefined if not found
 *
 * @example
 * ```typescript
 * const schema = resolveSchema('User', defs);
 * ```
 */
export function resolveSchema(name: string, defs?: Definitions): any {
  if (!defs) return undefined
  return defs.getV(`$${name}`)
}

/**
 * Resolve choices array, expanding any @var or $schema references.
 * Follows V1 pattern from common-type.ts.
 *
 * @param choices - Array of choices (may contain @var or $schema strings)
 * @param defs - Definitions object for resolution
 * @returns Array of resolved choice values
 *
 * @example
 * ```typescript
 * const choices = ['red', 'blue', '@colorVar'];
 * const resolved = resolveChoices(choices, defs);
 * // Returns: ['red', 'blue', 'green'] (if @colorVar = 'green')
 * ```
 */
export function resolveChoices(choices: any[], defs?: Definitions): any[] {
  if (!defs) return choices

  const resolved: any[] = []

  for (let choice of choices) {
    if (typeof choice === 'string' && choice[0] === '@') {
      // Resolve variable reference
      const varValue = defs.getV(choice)
      const actualValue = (varValue as any)?.value !== undefined ? (varValue as any).value : varValue
      resolved.push(actualValue)
    } else {
      resolved.push(choice)
    }
  }

  return resolved
}
