/**
 * Error codes specific to parsing phase (AST construction)
 */
enum ParsingErrorCodes {
  // General parsing
  unexpectedToken = 'unexpected-token',
  expectingBracket = 'expecting-bracket',
  unexpectedPositionalMember = 'unexpected-positional-member',
  invalidKey = 'invalid-key',
  
  // Schema parsing
  invalidSchema = 'invalid-schema',
  schemaNotFound = 'schema-not-found',
  schemaMissing = 'schema-missing',
  emptyMemberDef = 'empty-memberdef',
  invalidDefinition = 'invalid-definition',
  invalidMemberDef = 'invalid-memberdef',
  invalidSchemaName = 'invalid-schema-name',

  // Variables and definitions
  variableNotDefined = 'variable-not-defined',
  schemaNotDefined = 'schema-not-defined'
}

export default ParsingErrorCodes