// Core classes
export { default as Schema } from './schema';
export { SchemaBuilder } from './schema';
export { default as TypedefRegistry } from './typedef-registry';
export { default as TypeDef } from './typedef';

// Processing
export { default as processSchema } from './processor';
export { default as processObject } from './object-processor';
export { default as processCollection } from './processing/collection-processor';
export { default as compileObject } from './compile-object';
export { MemberProcessorFactory } from './processing/member-processor-factory';
export { processMember } from './processing/member-processor';

// Utilities
export { SchemaUtils, SchemaMetrics } from './schema-utils';
export { SchemaResolver } from './utils/schema-resolver';
export { ValidationUtils, ProcessingResult } from './utils/validation-utils';
export { SchemaValidator, ValidationResult } from './validation/schema-validator';
export { canonicalizeAdditionalProps } from './utils/additional-props-canonicalizer';
export { normalizeKeyToken } from './utils/member-utils';

// Types
export { MemberMap, SchemaConstructorArg } from './schema-types';
export { default as MemberDef } from './types/memberdef';

// Backward compatibility - Main API
import Schema from './schema';
import compileObject from './compile-object';
import ASTParser from '../parser/ast-parser';
import Tokenizer from '../parser/tokenizer';
import Node from '../parser/nodes/nodes';
import assertNever from '../errors/asserts/asserts';

export function compileSchema(name: string, schema: string): Schema {
  const tokens = new Tokenizer(schema).tokenize();
  const ast = new ASTParser(tokens).parse();
  const node = compileObject(name, ast.children[0].child as Node);
  if (node instanceof Schema) {
    return node;
  }
  assertNever('Invalid schema type');
}
