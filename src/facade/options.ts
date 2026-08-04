/**
 * Options shared across the load / validate / stringify facade.
 *
 * Declared ONCE here so the individual entry-point option types can't drift (R8). The families compose
 * from it: `LoadOptions`/`LoadObjectOptions`/`LoadCollectionOptions` = `IOCommonOptions`;
 * `LoadInferredOptions` = `Omit<IOCommonOptions,'schemaName'>`; `StringifyOptions` picks `schemaName`
 * and adds serialization-only fields. See io-test-cases/RECOMMENDATIONS.md (R8).
 */
export interface IOCommonOptions {
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
   * When true, throws on first validation error.
   * When false (default), continues processing and collects errors.
   * @default false
   * @remarks PARKED / not fully wired. Honored by `loadDocument` only; on `load`/`loadObject`/
   * `loadCollection`/`loadInferred` it is currently a no-op — an object load throws by default
   * regardless. To be wired to spec semantics (collect-all default / fail-fast; see spec
   * `the-collections/collection.md:131`) when un-parked. See io-test-cases/RECOMMENDATIONS.md.
   */
  strict?: boolean;

  /**
   * Array to collect validation errors instead of throwing.
   * Useful for processing collections where some items may be invalid.
   */
  errorCollector?: Error[];
}
