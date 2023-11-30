import Position from "../tokenizer/position"
import Token from "../tokenizer/tokens"
import InternetObjectError from "./io-error"


/**
 * Represents the syntax error in InternetObject. When this error is thrwon,
 * it suggests that a syntax in the associated object is is not correct.
 */
class InternetObjectSyntaxError extends InternetObjectError {
  /**
   * Creates a new `InternetObjectSyntaxError` error.
   * @param errorCode {string} An errorCode associated with is error
   * @param message {string} The message which needs to be displayed
   * @param node {Node} The node object, required while parsing raw internet-object data or schema
   * @param ssf {Function} The start statck function, removes the irrelavant frames from the stack trace
   *
   * @internal
   */
  constructor(errorCode: string, fact?: string, pos?: Position, isEof: boolean = false, ssf?: any) {
    super(errorCode, fact, pos, isEof, ssf)
    this.name = 'InternetObject(SyntaxError)'
    this.updateMessage()
  }
}

export default InternetObjectSyntaxError
