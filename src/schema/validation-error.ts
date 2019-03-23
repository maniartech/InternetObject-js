

class InternetObjectValidationError extends Error {

  // we have to do the following because of: https://github.com/Microsoft/TypeScript/issues/13965
  // otherwise we cannot use instanceof later to catch a given type
  // tslint:disable-next-line:variable-name
  public __proto__: Error;

  constructor(...args: any[]) {
    super(...args)
    Error.captureStackTrace(this, InternetObjectValidationError)
    this.__proto__ = new.target.prototype
  }
}