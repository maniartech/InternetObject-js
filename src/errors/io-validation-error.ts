import Token from "../tokenizer/tokens"
import InternetObjectError from "./io-error"


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
  constructor(errorCode: string, message: string = '', token?: Token, ssf?: any) {
    super(errorCode, message, token, ssf)
    this.name = 'InternetObject(ValidationError)'
  }
}
