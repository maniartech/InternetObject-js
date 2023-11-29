
export function assertNever(x: never): never {
  throw new Error("Assert never: " + x);
}
