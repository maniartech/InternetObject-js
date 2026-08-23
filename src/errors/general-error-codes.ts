/**
 * General error codes that apply across different phases.
 *
 * Naming follows ADR 0002: `<predicate>-<subject>`, predicate drawn from the closed 13-word
 * vocabulary. See ADR 0002, the error-code grammar and taxonomy — decision record kept with the maintainers (not shipped).
 */
enum GeneralErrorCodes {
  // A mandatory thing is ABSENT. `missing-` is a presence problem; `expected-` is a type problem.
  missingValue = 'missing-value',
  missingDefinitions = 'missing-definitions',

  // Present, but explicitly disallowed.
  forbiddenNull = 'forbidden-null'

  // NOTE: `expected-object` and `expected-array` used to live here, away from the seven other
  // `expected-*` codes. They now sit with the rest of the family in ValidationErrorCodes: a family
  // split across two files cannot be read as one list, and reading it as one list is the entire
  // point of predicate-first naming (ADR 0002 §2).
}

export default GeneralErrorCodes
