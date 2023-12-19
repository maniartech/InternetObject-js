import Position             from "../tokenizer/position"
import InternetObjectError  from "./io-error"

/**
 * Represents the validation error in InternetObject. This error is thrown when a validation
 * issue is found while validating the internet-object data against the associated schema.
 */
class InternetObjectValidationError extends InternetObjectError {
  /**
   * Creates a new `InternetObjectValidationError` error.
   *
   * @param errorCode {string} An error-code associated with this error
   * @param fact {string} The  reason for the error
   * @param pos {Position} The position object, for tracking line and columns. Optional
   * @param isEof {boolean} Indicates whether the error is caused by EOF. Optional
   * @param ssf {Function} The start statck function, removes the irrelavant frames from the stack trace
   * @internal
   */
  constructor(errorCode: string, fact?: string, pos?: Position, isEof: boolean = false, ssf?: any) {
    super(errorCode, fact, pos, isEof, ssf)
    this.name = 'InternetObject(ValidationError)'
  }
}

export default InternetObjectValidationError
