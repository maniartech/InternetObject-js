import { Position }  from "../../core/positions";

/**
 * Place this function to check and ensure the code where invoked must never
 * reach. This function is ueful to identify issues with the code by identifying
 * the code path which must have never reached.
 * @param x The object which needs to be asserted as never
 */
function assertNever(x: any, pos?:Position): never {
  let message = "Assert never";

  if (x !== undefined && x !== null) {
    message = `Assert never: ${x.toString()}`;
  }

  if (pos) {
    message += ` at ${pos.toString()}`;
  }

  throw new Error(message);
}

export default assertNever;
