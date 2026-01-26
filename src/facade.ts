import IOCollection           from './core/collection';
import Decimal                from './core/decimal/decimal';
import IODefinitions          from './core/definitions';
import IODocument             from './core/document';
import IOObject               from './core/internet-object';
import IOSection              from './core/section';
import IOSectionCollection    from './core/section-collection';
import IOHeader               from './core/header';
import IOError                from './errors/io-error';
import ErrorCodes             from './errors/io-error-codes';
import IOSyntaxError          from './errors/io-syntax-error';
import IOValidationError      from './errors/io-validation-error';
import Schema                 from './schema/schema';
import { ioDefinitions, ioDocument, ioObject, ioSchema } from './template-funcs';
import parse                  from './parser/index';
import parseDefinitions       from './parser/parse-defs';
import parseSchema            from './schema/parse-schema';
import { load, loadObject }   from './facade/load';
import { stringify }          from './facade/stringify';
import { createStreamWriter, createStreamReader } from './streaming';
import { toJSON } from './facade/to-json';
import { validate, validateCollection, validateObject } from './facade/validate';


// Short aliases
const io = {
  // Facade methods
  parse,
  parseDefs: parseDefinitions,      // Short alias
  parseDefinitions,                 // Full name
  parseSchema,
  load,
  loadObject,
  stringify,
  toJSON,
  validate,
  validateObject,
  validateCollection,

  // Streaming
  createStreamReader,
  createStreamWriter,

  // Short aliases for template functions
  doc:    ioDocument,
  object: ioObject,
  defs:   ioDefinitions,
  schema: ioSchema,

  // Full names for template functions
  document: ioDocument,
  definitions: ioDefinitions,

  // Core types (power users)
  IODocument,
  IODefinitions,
  IOSectionCollection,
  IOSection,
  IOCollection,
  IOObject,
  IOHeader,
  IOSchema: Schema,
  Decimal,
  IOError,
  ErrorCodes,
  IOSyntaxError,
  IOValidationError,
};


export {
  ioDefinitions, ioDocument,
  ioObject,
  ioSchema
};

export default io;
