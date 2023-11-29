
/**
 * Place this function where the code must never reach.
 * @param x The object which needs to be asserted as never
 */
export function assertNever(x: never): never {
  throw new Error("Assert never: " + x);
}
