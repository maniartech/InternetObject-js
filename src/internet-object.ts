// import './constants'
import Tokenizer from './tokenizer';
import Parser from './parser';

export default class InternetObject {

  /**
   * Parses the Internet Object string and returns the value
   * @param text The text to be parsed
   */
  public static parse(text:string):any {
    let tokenizer = new Tokenizer(text)
    let parser = new Parser()
    let token = tokenizer.read()
    while(token) {
      parser.process(token)
      token = tokenizer.read()
    }
    return parser.toObject()
  }

}
