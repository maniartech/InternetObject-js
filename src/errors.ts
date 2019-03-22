import { Token } from "./token";

export const INVALID_TYPE = "invalid-type"

export const TOKEN_NOT_READY = "token-not-ready"

export const throwError = (token:Token, message:string = "") => {
  const errorMsg = `Error occured while processing "${token.token}" at ${token.row}, ${token.col}. ${message}`
  throw new InternetObjectError(errorMsg)
}

class InternetObjectError extends Error {

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
    super(errorMsg)
    Error.captureStackTrace(this, InternetObjectError)
    this.__proto__ = new.target.prototype
  }
}