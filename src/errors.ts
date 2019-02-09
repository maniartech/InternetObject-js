import Token from "./token";

export const INVALID_TYPE = "invalid-type"

export const TOKEN_NOT_READY = "token-not-ready"

export const throwError = (token:Token, message:string = "") => {
  const errorMsg = `Error occured while processing "${token.token}" at ${token.row}, ${token.col}. ${message}`
  throw new InternetObjectError(errorMsg)
}

class InternetObjectError extends Error {

  // we have to do the following because of: https://github.com/Microsoft/TypeScript/issues/13965
  // otherwise we cannot use instanceof later to catch a given type
  // tslint:disable-next-line:variable-name
  public __proto__: Error;

  constructor(...args: any[]) {
    super(...args)
    Error.captureStackTrace(this, InternetObjectError)
    this.__proto__ = new.target.prototype
  }
}