//         ██╗  ████████╗
//         ╚═╝  ╚═══════╝
//         ██╗  ████████╗
//         ██║ ██╔═════██╗
//         ██║ ██║     ██║
//         ██║ ██║     ██║
//         ██║ ╚████████╔╝
//         ╚═╝  ╚═══════╝
//         Internet Object


// Internet Object Structural
export { default as IODocument                      } from './core/document';
export { default as IOHeader                        } from './core/header';
export { default as IODefinitions                   } from './core/definitions';
export { default as IOCollection                    } from './core/collection';
export { default as Decimal                         } from './core/decimal/decimal';
export { default as IOObject                        } from './core/internet-object';
export { default as IOSection                       } from './core/section';
export { default as IOSectionCollection             } from './core/section-collection';

// Error handling
export { default as IOError                         } from './errors/io-error';
export { default as ErrorCodes                      } from './errors/io-error-codes';
export { default as IOSyntaxError                   } from './errors/io-syntax-error';
export { default as IOValidationError               } from './errors/io-validation-error';

// Schema and validation
export { default as IOSchema                        } from './schema/schema';
export { default as parse                           } from './parser/index';
export { default as parseDefinitions                } from './parser/parse-defs';
export { default as parseDefs                       } from './parser/parse-defs';
export { default as parseSchema                     } from './schema/parse-schema';
export { load                                     } from './loader/load';
export type { LoadOptions                           } from './loader/load';
export { loadObject, loadCollection                 } from './loader/load';
export type { LoadObjectOptions                     } from './loader/load';
export { loadInferred                               } from './loader/load-inferred';
export type { LoadInferredOptions                   } from './loader/load-inferred';
export { stringify                                  } from './serializer/stringify';
export { stringifyDocument                          } from './serializer/stringify-document';
export { toObject, toJSON } from './serializer/to-object';
export type { Jsonable } from './serializer/to-object';
export { validate, validateObject, validateCollection } from './schema/validate';
export type { ValidationResult } from './schema/validate';

// Streaming
export { createStreamReader, createStreamWriter, createPushSource, BufferTransport } from './streaming';
export { IOStreamReader } from './streaming';
export type { IOStreamTransport, IOStreamSource, StreamItem, StreamReaderOptions, StreamWriterOptions } from './streaming';

// Main tag functions (also tree-shakable)
export { ioDefinitions, ioDocument, ioObject, ioSchema } from './facade';

// Default facade (only imported if user does default import!)
import io from './facade';
export default io;
export const IO = io;
