/**
 * Context object passed through schema processing to collect errors
 * and maintain processing state without coupling to parser.
 */
export class ProcessingContext {
  private errors: Error[] = [];

  /**
   * Adds an error to the collection
   */
  addError(error: Error): void {
    this.errors.push(error);
  }

  /**
   * Returns all collected errors
   */
  getErrors(): Error[] {
    return this.errors;
  }

  /**
   * Returns true if any errors were collected
   */
  hasErrors(): boolean {
    return this.errors.length > 0;
  }
}
