import Position from "../tokenizer/position"


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
  public errorCode: string

  /**
   * A fact object, which may contain additional information about the error.
   */
  public fact?: string

  /**
   * A position object, for tracking line and columns.
   */
  public position?: Position

  /**
   * Indicates whether the error is caused by EOF.
   */
  public isEof: boolean

  /**
   * Initialize the new instance of `InternetObjectError`.
   *
   * @param errorCode {string} An error-code associated with this error
   * @param fact {string} The  reason for the error
   * @param pos {Position} The position object, for tracking line and columns. Optional
   * @param isEof {boolean} Indicates whether the error is caused by EOF. Optional
   * @param ssf {Function} The start statck function, removes the irrelavant frames from the stack trace
   */
  constructor(errorCode: string, fact?: string, position?: Position, isEof: boolean = false, ssf?: any) {
    super()

    this.errorCode  = errorCode
    this.fact       = fact
    this.position   = position
    this.isEof      = isEof
    this.name       = 'InternetObjectError'

    // Format the error message
    this.updateMessage()

    // TODO: After stability, change the SSF class
    Error.captureStackTrace(this, InternetObjectError)
    // Error.captureStackTrace(this, ssf || InternetObject)
    this.__proto__ = new.target.prototype
  }



  protected updateMessage() {
    let errorMsg = `"${this.errorCode}" `
    if (this.fact) {
      errorMsg += `"${this.fact}" `
    }

    if (this.isEof) {
      errorMsg += `at EOF`
    } else if (this.position) {
      // Handle case where position is just Position
      errorMsg += `at ${this.position.row}:${this.position.col}(${this.position.pos})`
    }

    this.message = errorMsg
  }
}

export default InternetObjectError


