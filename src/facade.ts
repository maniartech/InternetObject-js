import Collection                               from './core/collection';
import Decimal                                  from './core/decimal';
import Definitions                              from './core/definitions';
import Document                                 from './core/document';
import InternetObject                           from './core/internet-object';
import Section                                  from './core/section';
import SectionCollection                        from './core/section-collection';
import InternetObjectError                      from './errors/io-error';
import InternetObjectSyntaxError                from './errors/io-syntax-error';
import InternetObjectValidationError            from './errors/io-validation-error';
import Schema                                   from './schema/schema';
import { ioDefinitions, ioDocument, ioObject  } from './template-funcs';

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
  Document,
  Definitions,
  SectionCollection,
  Section,
  Collection,
  InternetObject,
  Schema,
  Decimal,
  InternetObjectError,
  InternetObjectSyntaxError,
  InternetObjectValidationError,
};

export {
  ioDefinitions, ioDocument,
  ioObject
};

export default io;
