// import './constants'
import Token from './token'
import { UNSURE, ZERO, NINE } from './constants';
import Tokens from './tokens';

export default class InternetObject {

  /**
   * Parses the Internet Object string and returns the value
   * @param text The text to be parsed
   */
  public static parse(text:string):any {

    let index = 0
    let ch = text[index]

    let token = new Token(text)
    let tokens = new Tokens()
    let position = UNSURE
    let prevCh = null

    tokens.push(token)

    const next = () => {
      ++index
      prevCh = ch
      ch = text[index]
    }

    while (ch) {
      // Start new token when delimiter is encountered
      if (ch === ',') {
        next()
        token = new Token(text, index)
        tokens.push(token)
        continue
      }

      token.next();
      next()
    }

    if (tokens.length === 1) {
      return token.value
    }
    return tokens.value
  }

}
