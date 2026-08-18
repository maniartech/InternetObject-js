/**
 * Error codes specific to parsing phase (AST construction)
 */
enum ParsingErrorCodes {
  // General parsing
  unexpectedToken = 'unexpected-token',
  expectingBracket = 'expecting-bracket',
  unexpectedPositionalMember = 'unexpected-positional-member',
  invalidKey = 'invalid-key',
  
  // Document structure
  // A duplicate section name is a STRUCTURAL fault, not a lexical one: the characters are all
  // valid, the document shape is not. It was previously reported as `unexpected-token`, which
  // told consumers to look for a bad character that was never there.
  duplicateSectionName = 'duplicate-section-name',

  // Schema parsing
  invalidSchema = 'invalid-schema',
  schemaNotFound = 'schema-not-found',
  schemaMissing = 'schema-missing',
  emptyMemberDef = 'empty-memberdef',
  invalidDefinition = 'invalid-definition',
  invalidMemberDef = 'invalid-memberdef',
  invalidSchemaName = 'invalid-schema-name',

  // Variables and definitions
  variableNotDefined = 'variable-not-defined'
  // NOTE: `schema-not-defined` lives in ValidationErrorCodes — it is raised as
  // IOValidationError (category `validation`), so its group matches its class.
}

export default ParsingErrorCodes