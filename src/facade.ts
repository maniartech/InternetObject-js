
import IOCollection           from './core/collection';
import Decimal                from './core/decimal';
import IODefinitions          from './core/definitions';
import IODocument             from './core/document';
import IOObject               from './core/internet-object';
import IOSection              from './core/section';
import IOSectionCollection    from './core/section-collection';
import IOHeader               from './core/header';
import IODefinitionValue      from './core/definitions';
import IOError                from './errors/io-error';
import ErrorCodes             from './errors/io-error-codes';
import IOSyntaxError          from './errors/io-syntax-error';
import IOValidationError      from './errors/io-validation-error';
import Schema                 from './schema/schema';
import { ioDefinitions, ioDocument, ioObject } from './template-funcs';


// Short aliases
const io = {
  // Short aliases for template functions
  doc:    ioDocument,
  object: ioObject,
  defs:   ioDefinitions,

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
  IODefinitionValue,
  Schema,
  Decimal,
  IOError,
  ErrorCodes,
  IOSyntaxError,
  IOValidationError,
};


export {
  ioDefinitions, ioDocument,
  ioObject
};

export default io;
