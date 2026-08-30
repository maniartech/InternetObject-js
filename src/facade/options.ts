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
   *
   * @deprecated Since §2.5 (ADR 0005) the sink is the **third positional argument** on every entry
   * point — `load(data, defs, sink)`, `validate(data, defs, sink)` — the same slot `parse` has
   * always used. It is still read here, and the positional sink wins where both are given.
   *
   * It survives because `loadInferred` has no sink slot: inference is outside the format's
   * contract (ADR 0004) and its signature was left alone rather than churned for symmetry with a
   * family it is not really part of.
   */
  errorCollector?: Error[];
}
