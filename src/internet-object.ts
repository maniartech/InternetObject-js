// import './constants'
import Tokenizer from './tokenizer';

export default class InternetObject {

  /**
   * Parses the Internet Object string and returns the value
   * @param text The text to be parsed
   */
  public static parse(text:string):any {

    const tokenizer = Tokenizer.parse(text)

    return tokenizer

  }

}
