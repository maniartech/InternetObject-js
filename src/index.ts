//         ██╗  ████████╗
//         ╚═╝  ╚═══════╝
//         ██╗  ████████╗
//         ██║ ██╔═════██╗
//         ██║ ██║     ██║
//         ██║ ██║     ██║
//         ██║ ╚████████╔╝
//         ╚═╝  ╚═══════╝
//         Internet Object


export { default as IOCollection                    } from './core/collection';
export { default as Decimal                         } from './core/decimal';
export { default as IODefinitions                   } from './core/definitions';
export { default as IODocument                      } from './core/document';
export { default as IOObject                        } from './core/internet-object';
export { default as IOSection                       } from './core/section';
export { default as IOSectionCollection             } from './core/section-collection';
export { default as IOHeader                        } from './core/header';
export { default as IODefinitionValue               } from './core/definitions';
export { default as IOError                         } from './errors/io-error';
export { default as ErrorCodes                      } from './errors/io-error-codes';
export { default as IOSyntaxError                   } from './errors/io-syntax-error';
export { default as IOValidationError               } from './errors/io-validation-error';
export { default as Schema                          } from './schema/schema';
export { default as parse                           } from './parser/index';
export { default as parseDefinitions                } from './parser/parse-defs';

// Main tag functions (also tree-shakable)
export { ioDefinitions, ioDocument, ioObject } from './facade';

// Default facade (only imported if user does default import!)
import io from './facade';
export default io;
