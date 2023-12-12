
/**
 * Place this function to check and ensure the code where invoked must never
 * reach. This function is ueful to identify issues with the code by identifying
 * the code path which must have never reached.
 * @param x The object which needs to be asserted as never
 */
function assertNever(x: any): never {
  if (x === undefined) {
    throw new Error("Assert never");
  }
  throw new Error("Assert never: " + x ?? x.toString());
}

export default assertNever;
