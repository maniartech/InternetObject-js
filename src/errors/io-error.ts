import { Node, TokenNode } from '../parser/nodes'
import Token from '../tokenizer/tokens'

/**
 * Represents the base error class in InternetObject.
 */
export class InternetObjectError extends Error {
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
  public lineNumber?: number

  /**
   * Column number (in the text) where error has occured.
   * Only available with some errors while parsting text data.
   */
  public columnNumber?: number

  /**
   * The index (in the text) where error has occured.
   * Only available with some errors while parsting text data.
   */
  public index?: number

  /**
   * Initialize the new instance of `InternetObjectError`.
   *
   * @param errorCode {string} An error-code associated with this error
   * @param message {string} The error message
   * @param node {Node} The node object, for tracking line and columns. Optional
   * @param ssf {Function} The start statck function, removes the irrelavant frames from the stack trace
   */
  constructor(errorCode: string, message: string = '', node?: Node, ssf?: any) {
    super()

    let errorMsg: string = errorCode
    this.errorCode = errorCode

    this.name = 'InternetObjectError'

    if (node instanceof TokenNode) {
      this.lineNumber = node.row
      this.columnNumber = node.col
      this.index = node.pos
      errorMsg = `${errorCode} at (${node.row}, ${node.col})`
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

/**
 * Represents the syntax error in InternetObject. When this error is thrwon,
 * it suggests that a syntax in the associated object is is not correct.
 */
export class InternetObjectSyntaxError extends InternetObjectError {
  /**
   * Creates a new `InternetObjectSyntaxError` error.
   * @param errorCode {string} An errorCode associated with is error
   * @param message {string} The message which needs to be displayed
   * @param node {Node} The node object, required while parsing raw internet-object data or schema
   * @param ssf {Function} The start statck function, removes the irrelavant frames from the stack trace
   *
   * @internal
   */
  constructor(errorCode: string, message: string = '', node?: Node, ssf?: any) {
    super(errorCode, message, node, ssf)
    this.name = 'InternetObject(SyntaxError)'
  }
}

/**
 * Represents the validation error in InternetObject. This error is thrown when a validation
 * issue is found while validating the internet-object data against the associated schema.
 */
export class InternetObjectValidationError extends InternetObjectError {
  /**
   * Creates a new `InternetObjectValidationError` error.
   * @param errorCode {string} An errorCode associated with is error
   * @param message {string} The message which needs to be displayed
   * @param node {Node} The node object, required while parsing raw internet-object data or schema
   * @param ssf {Function} The start statck function, removes the irrelavant frames from the stack trace
   *
   * @internal
   */
  constructor(errorCode: string, message: string = '', node?: Node, ssf?: any) {
    super(errorCode, message, node, ssf)
    this.name = 'InternetObject(ValidationError)'
  }
}

export type ErrorArgs = [string, string, Node?]
