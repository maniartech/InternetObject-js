import { Node } from "../parser";
import InternetObject from "../index";

// Error Examples
// InternetObject (SyntaxError): invalid-value at 1, 20
// InternetObject (SyntaxError): invalid-value
// InternetObject (ValidationError): invalid-choice - The value of 'address.city' is not correct at 1, 20.
// It must be one of these values [Mumbai, Thane, Pune].

/**
 * Represents the base class for throwing InternetObjectError.
 */
export default class InternetObjectError extends Error {

  // Due to a bug in TypeScript specifically control the __proto__
  // Ref: https://github.com/Microsoft/TypeScript/issues/13965
  // If not, `instanceof` and `catch` won't work properly
  // tslint:disable-next-line:variable-name
  public __proto__: Error;

  /**
   * Error code of internet object error.
   */
  public errorCode?:string

  /**
   * Line number of internet object error
   */
  public lineNumber?:number

  /**
   * Column number of internet object error
   */
  public columnNumber?:number

  /**
   * Index  of internet object error
   */
  public index?:number


  /**
   *
   * @param errorCode {string} The errorCode
   * @param message {string} The error message
   * @param node {Node} Optional
   * @param ssf
   */
  constructor(errorCode:string, message:string="", node?:Node, ssf?:any) {
    super()

    let errorMsg:string = errorCode

    this.errorCode = errorCode

    if (node) {
      this.lineNumber = node.row
      this.columnNumber = node.col
      this.index = node.index
      errorMsg = `${errorCode} at (${node.row}, ${node.col}): ${message}`
    }
    else {
      errorMsg = message ? `${errorCode}: ${message}` : errorCode
    }
    this.message = errorMsg

    Error.captureStackTrace(this, ssf || InternetObject)
    this.__proto__ = new.target.prototype
  }
}

/**
 * Represents the syntax error in InternetObject. This error is thrown and a systax error
 * is occured while parting the InternetObject document or schema.
 */
export class InternetObjectSyntaxError extends InternetObjectError {

  constructor (errorCode:string, message:string="", node?:Node, ssf?:any) {
    super(errorCode, message, node, ssf)
    this.name = "InternetObjectSyntaxError"
  }
}

/**
 * Represents the validation error in InternetObject. This error is thrown when a validation
 * issue is found while validating the internet-object data against the associated schema.
 */
export class InternetObjectValidationError extends InternetObjectError {

  constructor (errorCode:string, message:string="", node?:Node, ssf?:any) {
    super(errorCode, message, node, ssf)
    this.name = "InternetObjectValidationError"
  }

}

