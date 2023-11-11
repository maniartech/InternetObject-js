
export function assertFailure(x: never): never {
  throw new Error("Assert failure: " + x);
}
