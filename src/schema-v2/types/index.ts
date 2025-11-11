/**
 * Schema V2 Types - Barrel export file
 *
 * This file exports all type schemas and related types.
 * Users should import from this file, not from individual type files.
 *
 * @example
 * ```typescript
 * import { StringTypeSchema, NumberTypeSchema, BooleanTypeSchema } from './types';
 *
 * const stringSchema = new StringTypeSchema();
 * const numberSchema = new NumberTypeSchema();
 * const booleanSchema = new BooleanTypeSchema();
 * ```
 */

// Core interface
export * from './type-schema';

// Base types (Phase 1)
export * from './string-type';
export * from './number-type';
export * from './boolean-type';

// Collection types (Phase 2)
export * from './array-type';
export * from './object-type';

// Advanced types (Phase 3) - TODO
// export * from './date-type';
// export * from './decimal-type';
// export * from './bigint-type';
