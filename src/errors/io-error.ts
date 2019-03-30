import { Token } from "../parser/token";


export default class InternetObjectError extends Error {

  // Due to a bug in TypeScript specifically control the __proto__
  // Ref: https://github.com/Microsoft/TypeScript/issues/13965
  // If not, `instanceof` and `catch` won't work properly
  // tslint:disable-next-line:variable-name
  public __proto__: Error;

  public errorCode?:string

  constructor(...args:any[]) {
    super()

    const errorCode:string = args[0] || ""
    const message:string = args[1] || ""
    const token:Token|null = args[2] || null

    this.errorCode = errorCode
    let errorMsg:string
    if (token) {
      errorMsg = `${errorCode} at (${token.row}, ${token.col}): ${message}`
    }
    else {
      errorMsg = message || ""
    }
    this.message = errorMsg

    Error.captureStackTrace(this, InternetObjectError)
    this.__proto__ = new.target.prototype
  }

}


