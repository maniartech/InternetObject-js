/**
 * Options for processing context
 */
export interface ProcessingContextOptions {
  /**
   * If true, collect all validation errors instead of stopping at first error.
   * Default: true (when context is provided)
   */
  collectAllErrors?: boolean;

  /**
   * If true, apply strict validation rules.
   * Default: false
   */
  strictMode?: boolean;
}

/**
 * Context object passed through schema processing to collect errors
 * and maintain processing state. This provides a clean way to pass
 * options and collect results through the processing chain.
 */
export class ProcessingContext {
  private _errors: Error[] = [];
  private _options: ProcessingContextOptions;

  constructor(options?: ProcessingContextOptions) {
    this._options = {
      collectAllErrors: true,
      strictMode: false,
      ...options
    };
  }

  /**
   * Whether to collect all errors or stop at first
   */
  get collectAllErrors(): boolean {
    return this._options.collectAllErrors ?? true;
  }

  /**
   * Whether strict validation mode is enabled
   */
  get strictMode(): boolean {
    return this._options.strictMode ?? false;
  }

  /**
   * Adds an error to the collection
   */
  addError(error: Error): void {
    this._errors.push(error);
  }

  /**
   * Adds multiple errors to the collection
   */
  addErrors(errors: Error[]): void {
    this._errors.push(...errors);
  }

  /**
   * Returns all collected errors
   */
  getErrors(): Error[] {
    return this._errors;
  }

  /**
   * Returns the number of collected errors
   */
  get errorCount(): number {
    return this._errors.length;
  }

  /**
   * Returns true if any errors were collected
   */
  hasErrors(): boolean {
    return this._errors.length > 0;
  }

  /**
   * Clears all collected errors
   */
  clearErrors(): void {
    this._errors = [];
  }
}
