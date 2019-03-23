import { Token } from "../token";
import InternetObjectError from "./error-base";

export const INVALID_TYPE = "invalid-type"

export const TOKEN_NOT_READY = "token-not-ready"

export const throwError = (token:Token, message:string = "") => {
  const errorMsg = `Error occured while processing "${token.token}" at ${token.row}, ${token.col}. ${message}`
  throw new InternetObjectError(errorMsg)
}
