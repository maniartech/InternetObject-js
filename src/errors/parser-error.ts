import { InternetObjectError } from "./io-error";
import { Token } from "../parser";


export default class ParserError extends InternetObjectError {

  // Due to a bug in TypeScript specifically control the __proto__
  // Ref: https://github.com/Microsoft/TypeScript/issues/13965
  // If not, `instanceof` and `catch` won't work properly
  // tslint:disable-next-line:variable-name
  public __proto__: Error;

  constructor(message:string = "", token:Token|null=null) {
    let errorMsg:string
    if (token) {
      errorMsg = `Error occured while processing "${token.token}" at ${token.row}, ${token.col}. ${message}`
    }
    else {
      errorMsg = message
    }
    super()
    Error.captureStackTrace(this, InternetObjectError)
    this.__proto__ = new.target.prototype
  }
}
