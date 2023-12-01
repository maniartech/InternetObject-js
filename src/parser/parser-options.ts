
class ParserOptions {
  readonly continueOnError?: boolean

  readonly allowEmptyRecords?: boolean

  readonly numberOfSections?: number

  readonly dataOnly?: boolean

  readonly headerOnly?: boolean

  readonly skipEmptyLines?: boolean

  readonly allowVariables?: boolean

  readonly trueTokens?: string[] // By default, it's ['true', 'T']

  readonly falseTokens?: string[] // By default, it's ['false', 'F']

  // replace \r\n or \r with \n. Default is true
  readonly normalizeNewline?: boolean

  constructor(o: ParserOptions = {}) {
    this.continueOnError    = o.continueOnError || false;
    this.allowEmptyRecords  = o.allowEmptyRecords || false;
    this.numberOfSections   = o.numberOfSections || 0;

    this.headerOnly         = o.headerOnly || false;
    this.dataOnly           = o.dataOnly || false;

    this.skipEmptyLines     = o.skipEmptyLines || false;
    this.allowVariables     = o.allowVariables || false;

    this.trueTokens         = o.trueTokens || ['true', 'T'];
    this.falseTokens        = o.falseTokens || ['false', 'F'];
  }
}

export default ParserOptions;
