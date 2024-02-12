//         ██╗  ████████╗
//         ╚═╝  ╚═══════╝
//         ██╗  ████████╗
//         ██║ ██╔═════██╗
//         ██║ ██║     ██║
//         ██║ ██║     ██║
//         ██║ ╚████████╔╝
//         ╚═╝  ╚═══════╝

import Definitions      from './core/definitions';
import Document         from './core/document';
import parse            from './parser/index';
import parseDefinitions from './parser/parse-defs';

namespace iosf {
  export function doc(strings: TemplateStringsArray, ...args: any[]):Document {
    const input = strings.reduce((acc, str, i) => {
      return acc + str + (args[i] === undefined ? '' : args[i]);
    }, '');

    return parse(input, null);
  }

  export function object(strings: TemplateStringsArray, ...args: any[]):any {
    const input = strings.reduce((acc, str, i) => {
      return acc + str + (args[i] === undefined ? '' : args[i]);
    }, '');

    return parse(input, null).toObject();
  }

  export function defs(strings: TemplateStringsArray, ...args: any[]):Definitions | null {
    const input = strings.reduce((acc, str, i) => {
      return acc + str + (args[i] === undefined ? '' : args[i]);
    }, '');

    return parseDefinitions(input, null);
  }

  export function parseWith(defs: Definitions): (strings: TemplateStringsArray, ...args: any[]) => Document {
    return (strings: TemplateStringsArray, ...args: any[]) => {
      const input = strings.reduce((acc, str, i) => {
        return acc + str + (args[i] === undefined ? '' : args[i]);
      }, '');

      return parse(input, defs);
    }
  }
}

export default iosf;
