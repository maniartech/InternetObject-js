
/**
 * Place this function to check and ensure the code where invoked must never reach.
 * @param x The object which needs to be asserted as never
 */
function assertNever(x: never): never {
  throw new Error("Assert never: " + x);
}

export default assertNever;
