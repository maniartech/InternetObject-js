//         ██╗  ████████╗
//         ╚═╝  ╚═══════╝
//         ██╗  ████████╗
//         ██║ ██╔═════██╗
//         ██║ ██║     ██║
//         ██║ ██║     ██║
//         ██║ ╚████████╔╝
//         ╚═╝  ╚═══════╝

import Definitions from './core/definitions';
import Document from './core/document';
import parse from './parser/index';
import parseDefinitions from './parser/parse-defs';
import InternetObject from './core/internet-object';
import Schema from './schema/schema';
import Collection from './core/collection';
import InternetObjectError from './errors/io-error';
import InternetObjectSyntaxError from '../dist/errors/syntax-error';
import InternetObjectValidationError from './errors/io-validation-error';
import SectionCollection from './core/section-collection';
import Section from './core/section';

export {
  Document,
  Definitions,
  SectionCollection,
  Section,
  Collection,
  InternetObject,
  Schema,
  InternetObjectError,
  InternetObjectSyntaxError,
  InternetObjectValidationError
};

export function ioDocument(strings: TemplateStringsArray, ...args: any[]): Document {
  const input = strings.reduce((acc, str, i) => {
    return acc + str + (args[i] === undefined ? '' : args[i]);
  }, '');

  return parse(input, null);
}

ioDocument.with = (defs: Definitions): (strings: TemplateStringsArray, ...args: any[]) => Document => {
  return (strings: TemplateStringsArray, ...args: any[]) => {
    const input = strings.reduce((acc, str, i) => {
      return acc + str + (args[i] === undefined ? '' : args[i]);
    }, '');

    return parse(input, defs);
  }
}

export function ioObject(strings: TemplateStringsArray, ...args: any[]): any {
  const input = strings.reduce((acc, str, i) => {
    return acc + str + (args[i] === undefined ? '' : args[i]);
  }, '');

  return parse(input, null).toObject();
}

export function ioDefinitions(strings: TemplateStringsArray, ...args: any[]): Definitions | null {
  const input = strings.reduce((acc, str, i) => {
    return acc + str + (args[i] === undefined ? '' : args[i]);
  }, '');

  return parseDefinitions(input, null);
}

