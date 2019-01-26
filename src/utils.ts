

export function isDefined<T>(a: T | null | undefined): a is T {
	return a !== null && a !== undefined;
}
