import { Node, TokenNode } from '../parser/nodes'
import Token from '../tokenizer/tokens'


/**
 * Represents the base error class in InternetObject.
 */
class InternetObjectError extends Error {
  // Due to a bug in TypeScript specifically control the __proto__
  // Ref: https://github.com/Microsoft/TypeScript/issues/13965
  // If not, `instanceof` and `catch` won't work properly
  // tslint:disable-next-line:variable-name
  public __proto__: Error

  /**
   * An error-code associated with the current error.
   */
  public errorCode?: string

  /**
   * A line number (in the text) where error has occured.
   * Only available with some errors while parsting text data.
   */
  public row?: number

  /**
   * Column number (in the text) where error has occured.
   * Only available with some errors while parsting text data.
   */
  public col?: number

  /**
   * The index (in the text) where error has occured.
   * Only available with some errors while parsting text data.
   */
  public pos?: number

  /**
   * Initialize the new instance of `InternetObjectError`.
   *
   * @param errorCode {string} An error-code associated with this error
   * @param message {string} The error message
   * @param node {Node} The node object, for tracking line and columns. Optional
   * @param ssf {Function} The start statck function, removes the irrelavant frames from the stack trace
   */
  constructor(errorCode: string, message: string, token?: Token, ssf?: any) {
    super()

    let errorMsg: string = errorCode
    this.errorCode = errorCode

    this.name = 'InternetObjectError'

    if (token) {
      this.row = token.row
      this.col = token.col
      this.pos = token.pos
      errorMsg = `${errorCode} at (${token.row}, ${token.col})`
    } else {
      errorMsg = errorCode
    }
    this.message = message !== '' ? `${errorMsg}: ${message}` : errorMsg

    // TODO: After stability, change the SSF class
    Error.captureStackTrace(this, InternetObjectError)
    // Error.captureStackTrace(this, ssf || InternetObject)
    this.__proto__ = new.target.prototype
  }
}

export default InternetObjectError


