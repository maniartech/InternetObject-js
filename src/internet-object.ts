// import './constants'
import Token from './token'
import { UNSURE, ZERO, NINE } from './constants';

export default class InternetObject {

  /**
   * Parses the Internet Object string and returns the value
   * @param text The text to be parsed
   */
  public static parse(text:string):any {

    let index = 0
    let tokenStartIndex = index
    let tokenEndIndex = index
    let ch = text[index]

    let isTokenBoolean = false
    let isTokenNumber = false
    let token = new Token(text)
    let tokenDetails = []
    let position = UNSURE

    // let isObject = false
    // let isList = false

    while (ch) {
      ++token.end

      isTokenBoolean = false

      let chCode = ch.charCodeAt(index)
      let chIsNum = chCode >= ZERO && chCode <= NINE

      if  (chIsNum && (isTokenNumber || tokenStartIndex === 0)) {
        isTokenNumber = true
      }
      else if (token.isBoolean) {
        isTokenBoolean = true
      }

      ++index
      ch = text[index]
    }

    if (isTokenNumber) {
      return Number(token.token)
    }

    if (isTokenBoolean) {
      return token.booleanVal
    }

    return token.token

  }

}
