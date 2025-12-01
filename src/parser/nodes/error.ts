import Definitions from "../../core/definitions";
import { Position } from '../../core/positions';
import IOError from "../../errors/io-error";
import Node from "./nodes";

/**
 * Error categories for styling and filtering
 */
export type ErrorCategory = 'syntax' | 'validation' | 'runtime';

/**
 * ErrorNode represents a parsing error that occurred during AST construction.
 * This allows the parser to continue processing and collect multiple errors
 * instead of stopping at the first error encountered.
 *
 * @remarks
 * The error property accepts both IOError (preferred) and plain Error types
 * for backward compatibility. When IOError is used, additional properties
 * like errorCode, positionRange, and fact are available.
 */
class ErrorNode implements Node {
  /**
   * The error that caused this node to be created.
   * Prefer IOError for full type-safe access to error properties.
   */
  readonly error: Error | IOError;
  readonly position: Position;
  readonly endPosition?: Position;

  constructor(error: Error | IOError, position: Position, endPosition?: Position) {
    this.error = error;
    this.position = position;
    this.endPosition = endPosition;
  }

  /**
   * Type guard to check if the error is an IOError.
   * Use this to safely access IOError-specific properties.
   *
   * @example
   * ```ts
   * if (errorNode.isIOError()) {
   *   console.log(errorNode.error.errorCode);
   * }
   * ```
   */
  isIOError(): this is ErrorNode & { error: IOError } {
    return this.error instanceof IOError;
  }

  /**
   * Gets the error code if available.
   * Returns undefined for plain Error instances.
   */
  get errorCode(): string | undefined {
    return this.isIOError() ? this.error.errorCode : undefined;
  }

  /**
   * Determines the error category based on the error type.
   * This enables UI to apply different styling (e.g., red for syntax, orange for validation).
   *
   * @returns 'syntax' for parser/syntax errors, 'validation' for schema validation errors, 'runtime' for others
   */
  private getErrorCategory(): ErrorCategory {
    const errorName = this.error.name;

    // Check for InternetObject error types
    if (errorName.includes('SyntaxError')) {
      return 'syntax';
    }
    if (errorName.includes('ValidationError')) {
      return 'validation';
    }

    // Fallback to runtime for unknown error types
    return 'runtime';
  }

  /**
   * Returns error information as a value object.
   * This allows ErrorNodes to be serialized alongside valid nodes.
   * Includes error category for UI styling and errorCode when available.
   */
  toValue(defs?: Definitions): any {
    const base: any = {
      __error: true,
      category: this.getErrorCategory(),
      message: this.error.message,
      name: this.error.name,
      position: this.position,
      ...(this.endPosition && { endPosition: this.endPosition }),
      ...(this.errorCode && { errorCode: this.errorCode })
    };
    // Include collectionIndex if the original error carries it (boundary context)
    const anyErr: any = this.error as any;
    if (anyErr && anyErr.collectionIndex !== undefined) {
      base.collectionIndex = anyErr.collectionIndex;
    }
    return base;
  }

  /**
   * Returns the starting position of the error.
   */
  getStartPos(): Position {
    return this.position;
  }

  /**
   * Returns the ending position of the error.
   * If no end position was provided, returns the start position.
   */
  getEndPos(): Position {
    return this.endPosition || this.position;
  }
}

export default ErrorNode;