/**
 * Error codes specific to the validation phase (schema validation).
 *
 * Naming follows ADR 0002: `<predicate>-<subject>`, predicate drawn from the closed 13-word
 * vocabulary. The three distinctions that do the work here:
 *
 *   expected- vs missing-   a TYPE problem vs a PRESENCE problem
 *   expected- vs invalid-   "this is not a decimal at all" vs "this decimal is malformed"
 *   undefined-/unknown-/reserved-   never defined · not in the allowed set · reserved for later
 */
enum ValidationErrorCodes {
  // ---- Type mismatch: the required type is absent, or a different one was found ----------------
  // One predicate for every type, so a missing cell is visible as a hole in this list. Previously
  // this was spelled four ways (`not-a-*`, `expected-*`, `expecting-*`, generic `invalid-type`),
  // which is why `expected-decimal` and `expected-bigint` were simply absent and those typedefs
  // fell back to the generic code.
  expectedString = 'expected-string',
  expectedNumber = 'expected-number',
  expectedInteger = 'expected-integer',
  expectedDecimal = 'expected-decimal',
  expectedBigInt = 'expected-bigint',
  expectedDateTime = 'expected-datetime',
  expectedBoolean = 'expected-boolean',
  expectedObject = 'expected-object',
  expectedArray = 'expected-array',
  expectedDate = 'expected-date',
  expectedTime = 'expected-time',

  // NOT DECLARED YET: `expected-binary`. The specification lists `binary` among the base types, but
  // no BinaryDef is registered here — `{{ b: binary }}` reports `unknown-type` — so the code has no
  // site that could emit it. ADR 0002 §5 gates symmetry additions on real emission, and a
  // declared-but-never-thrown code is precisely what `not-a-number` had become. It lands with the
  // type. See ADR 0003 §4.

  // ---- Object / member structure ---------------------------------------------------------------
  // Structural fault in an object that IS an object (a wrong-type value is `expected-object`).
  invalidObject = 'invalid-object',

  // A closed schema was given a member it does not declare. ONE code for every spelling of that
  // fault: a surplus POSITIONAL value, a surplus NAMED member, and a memberdef option the typedef
  // does not declare (a memberdef is itself a record validated against the typedef's own member
  // schema, so it is this same rule one level up). `additional-values-not-allowed` used to cover
  // the positional case alone, which meant the same fault reported different codes depending on
  // how the data arrived -- and a native caller, having only named members, could never see it.
  // See ADR 0002 §6.4.
  unknownMember = 'unknown-member',
  duplicateMember = 'duplicate-member',

  // REMOVED: `invalid-array`. Never emitted by any site -- not at any point in this repository's
  // history. It hid from the registry guard because `ErrorCodes.invalidArrayLength` CONTAINS
  // `ErrorCodes.invalidArray` as a substring, so the reachability check matched the longer name and
  // reported the shorter one as live. Renaming that code to `mismatched-array-length` removed the
  // mask and the dead entry surfaced immediately. The guard now matches on word boundaries.
  //
  // A structural fault in a value that IS an array would be this code's job; nothing raises one
  // today, so it returns with its emitting site.

  // ---- Type names ----------------------------------------------------------------------------
  // A type name that does not exist (a typo) vs one the spec RESERVES for a future version. These
  // were indistinguishable before: `int64` reported the same code as `nosuchtype` purely because
  // this implementation's registry happens not to register it. See ADR 0002 §3.
  unknownType = 'unknown-type',
  reservedType = 'reserved-type',

  // ---- String sub-formats ----------------------------------------------------------------------
  // `email` and `url` are TYPES (string sub-formats), not constraints, so a value that does not
  // conform is genuinely MALFORMED for that type -- `invalid-`, like `invalid-datetime`. They look
  // like constraint failures and are not; see ADR 0002 §3.
  invalidEmail = 'invalid-email',
  invalidUrl = 'invalid-url',

  // ---- The TYPE's own range -------------------------------------------------------------------
  // A value that does not fit the declared type: `int8` given 200. The author declared no bound --
  // the limit is intrinsic to the type -- so the TYPE is the fault and the code names it. This is
  // the only surviving `out-of-range-` code, and the only one it ever genuinely described.
  outOfRangeInteger = 'out-of-range-integer',

  // ---- Declared-constraint failures -------------------------------------------------------------
  // A WELL-FORMED value that violated a constraint the SCHEMA AUTHOR wrote. Every one is named after
  // the keyword they wrote, so the code points at the line of schema that rejected the value.
  //
  // This is what every schema-validation system does -- JSON Schema reports `minimum` / `maxLength`,
  // XSD reports the failed facet, Bean Validation reports the annotation. It also draws the line
  // this registry previously blurred:
  //
  //     a TYPE problem names the TYPE            expected-integer
  //     a CONSTRAINT problem names the CONSTRAINT   mismatched-max
  //
  // The predecessors described the VALUE instead of the rule -- `undersized-string`,
  // `out-of-range-integer` for a declared `max` -- which read as a term of art rather than English,
  // lost the direction for numbers (one code for both `min` and `max`), and never said which
  // constraint had failed. The type is always recoverable from the error's `path` plus the schema;
  // the failed constraint is not recoverable from the value at all.
  mismatchedMin = 'mismatched-min',
  mismatchedMax = 'mismatched-max',
  mismatchedMinLen = 'mismatched-min-len',
  mismatchedMaxLen = 'mismatched-max-len',
  mismatchedLen = 'mismatched-len',
  mismatchedPattern = 'mismatched-pattern',
  mismatchedChoice = 'mismatched-choice',
  mismatchedMultipleOf = 'mismatched-multiple-of',
  mismatchedPrecision = 'mismatched-precision',
  mismatchedScale = 'mismatched-scale',
  mismatchedAnyOf = 'mismatched-any-of',

  // ---- Resolution (raised as IOValidationError) -----------------------------------------------
  // A schema was named and nothing is defined under that name -- whether the DOCUMENT named it via
  // `$ref` or the API CALLER passed it as an argument. The former `schema-not-found` covered the
  // caller case and is merged here: same condition, different entry point. See ADR 0002 §6.1.
  undefinedSchema = 'undefined-schema',

  // A `@` reference naming a variable no definition provides. Sibling of `undefined-schema`: same
  // resolution moment, same mechanism, same class. It lived in ParsingErrorCodes while being raised
  // as a validation error, which is the class/catalogue disagreement ADR 0003 §6 closes.
  undefinedVariable = 'undefined-variable'
}

export default ValidationErrorCodes
