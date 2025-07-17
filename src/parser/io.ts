import parse from "./index";
import Document from '../core/document';

function io(strings: TemplateStringsArray, ...values: any[]): Document {
  // Interpolate the template string with values
  let input = '';
  for (let i = 0; i < strings.length; i++) {
    input += strings[i];
    if (i < values.length) {
      input += String(values[i]);
    }
  }
  
  // Use the main parse function to actually parse the input
  return parse(input, null);
}

export default io;
