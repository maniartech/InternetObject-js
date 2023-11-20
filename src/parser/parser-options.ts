

class ParserOptions {
  readonly continueOnError?: boolean

  readonly allowEmptyRecords?: boolean

  readonly numberOfSections?: number

  readonly dataOnly?: boolean

  readonly headerOnly?: boolean

  readonly skipEmptyLines?: boolean

  readonly allowVariables?: boolean

  constructor(o: ParserOptions = {}) {
    this.continueOnError    = o.continueOnError || false;
    this.allowEmptyRecords  = o.allowEmptyRecords || false;
    this.numberOfSections   = o.numberOfSections || 0;
    this.dataOnly           = o.dataOnly || false;
    this.skipEmptyLines     = o.skipEmptyLines || false;
    this.allowVariables     = o.allowVariables || false;
  }
}

export default ParserOptions;
