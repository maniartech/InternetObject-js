/**
 * Options shared across the load / validate / stringify facade.
 *
 * Declared ONCE here so the individual entry-point option types can't drift (R8). The families compose
 * from it: `LoadOptions`/`LoadObjectOptions`/`LoadCollectionOptions` = `IOCommonOptions`;
 * `LoadInferredOptions` = `Omit<IOCommonOptions,'schemaName'>`; `StringifyOptions` picks `schemaName`
 * and adds serialization-only fields. See io-test-cases/RECOMMENDATIONS.md (R8).
 */
export interface IOCommonOptions {
  // `strict` was removed here by A3 (ADR 0005). It meant fail-fast vs collect-all, which is already
  // answered by whether a sink was passed, and it had been a documented no-op on every one of these
  // APIs since ADR 0001. `LoadDocumentOptions.strict` is a DIFFERENT option that genuinely works and
  // is untouched, as is the streaming reader's strict framing (ADR 0001 §7).

  /**
   * The name of the schema to use from definitions.
   * If provided, the schema is looked up by this name in the definitions.
   * If not provided, uses `defs.defaultSchema` (`$schema`).
   *
   * @example
   * ```typescript
   * const defs = parseDefinitions('~ $User: { name, age }');
   * const obj = loadObject(data, defs, { schemaName: '$User' });
   * ```
   */
  schemaName?: string;

  /**
   * Array to collect validation errors instead of throwing.
   * Useful for processing collections where some items may be invalid.
   */
  errorCollector?: Error[];
}
