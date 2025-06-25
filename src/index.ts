//         ██╗  ████████╗
//         ╚═╝  ╚═══════╝
//         ██╗  ████████╗
//         ██║ ██╔═════██╗
//         ██║ ██║     ██║
//         ██║ ██║     ██║
//         ██║ ╚████████╔╝
//         ╚═╝  ╚═══════╝
//         Internet Object

export { default as Document } from './core/document';
export { default as Definitions } from './core/definitions';
export { default as SectionCollection } from './core/section-collection';
export { default as Section } from './core/section';
export { default as Collection } from './core/collection';
export { default as InternetObject } from './core/internet-object';
export { default as Schema } from './schema/schema';
export { default as Decimal } from './core/decimal';
export { default as InternetObjectError } from './errors/io-error';
export { default as InternetObjectSyntaxError } from './errors/io-syntax-error';
export { default as InternetObjectValidationError } from './errors/io-validation-error';

// Main tag functions (also tree-shakable)
export { ioDocument } from './facade';
export { ioObject } from './facade';
export { ioDefinitions } from './facade';

// Default facade (only imported if user does default import!)
import io from './facade';
export default io;
