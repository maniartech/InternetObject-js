/**
 * Error codes specific to the parsing phase (AST construction).
 *
 * Naming follows ADR 0002: `<predicate>-<subject>`.
 */
enum ParsingErrorCodes {
  // General parsing
  unexpectedToken = 'unexpected-token',
  expectedClosingBracket = 'expected-closing-bracket',

  // A value was expected and the input ended, or a key was written with nothing after it. This is a
  // TOKEN problem — the grammar requires a value here and none is present.
  //
  // Formerly spelled `missing-value`, which put ONE code in two error classes: this syntax sense and
  // the validation sense (a required member absent from an otherwise well-formed record). Since the
  // streaming wire category is derived from the class, a code in two classes means two conformant
  // implementations report different categories for the same input. `missing-value` keeps the
  // presence sense, matching every other `missing-` code. See ADR 0003 §7.
  expectedValue = 'expected-value',
  unexpectedPositionalMember = 'unexpected-positional-member',
  invalidKey = 'invalid-key',

  // Document structure
  // A duplicate section name is a STRUCTURAL fault, not a lexical one: the characters are all
  // valid, the document shape is not. It was previously reported as `unexpected-token`, which
  // told consumers to look for a bad character that was never there.
  duplicateSectionName = 'duplicate-section-name',

  // A section name outside the bare-name set (letter | mark | digit | '-' | '_').
  //
  // The production is ANCHORED, which is the whole point: without this the header regex matched a
  // PREFIX and silently discarded the rest, so `--- user$x: $s` did not fail -- it produced a
  // section named `data`, losing the name entirely. Two such sections in one document collide, and
  // nothing reports it. io-specs the-structure/introduction/data.md: "A reader MUST reject a name
  // outside that set ... It must not accept a prefix and discard the rest."
  invalidSectionName = 'invalid-section-name',

  // Schema parsing
  invalidSchema = 'invalid-schema',

  // `---` with NO schema name after it. Distinct from `undefined-schema`: nothing was named at all,
  // versus a name that resolves to nothing. Different fault, different fix. See ADR 0002 §6.1.
  missingSchema = 'missing-schema',

  emptyMemberDef = 'empty-memberdef',
  invalidDefinition = 'invalid-definition',
  invalidMemberDef = 'invalid-memberdef',
  // REMOVED: `invalid-schema-name`. Declared but never thrown by any site -- the same
  // declared-but-unkept promise that `not-a-number` and `not-an-integer` had become. It returns
  // when a site validates a schema NAME and emits it. See tests/errors/registry-closure.test.ts,
  // which now fails the build if a registered code has no emitting site.

  // NOTE: `undefined-variable` moved to ValidationErrorCodes. It is raised as an IOValidationError,
  // and it resolves at the same moment and by the same mechanism as its sibling `undefined-schema` —
  // after the entire header has been read. Cataloguing one as syntax and the other as validation put
  // two halves of one condition in two classes. See ADR 0003 §6.
  //
  // NOTE: `undefined-schema` lives in ValidationErrorCodes — it is raised as IOValidationError
  // (category `validation`), so its group matches its class. It also absorbed the former
  // `schema-not-found`: both meant "a schema was named and nothing is defined under that name",
  // differing only in whether the DOCUMENT or the API CALLER did the naming. See ADR 0002 §6.1.
}

export default ParsingErrorCodes
