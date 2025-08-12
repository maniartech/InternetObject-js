import CollectionNode from '../../parser/nodes/collections';
import ObjectNode from '../../parser/nodes/objects';
import TokenNode from '../../parser/nodes/tokens';
import Schema from '../schema';

export class ValidationUtils {
  static isValidDataNode(data: unknown): data is ObjectNode | CollectionNode {
    return data instanceof ObjectNode || data instanceof CollectionNode;
  }

  static isValidSchema(schema: unknown): schema is Schema | TokenNode {
    return schema instanceof Schema || schema instanceof TokenNode;
  }

  static validateProcessingInputs(
    data: unknown,
    schema: unknown
  ): { data: ObjectNode | CollectionNode; schema: Schema | TokenNode } {
    if (!ValidationUtils.isValidDataNode(data)) {
      const hasCtorName = (data as any)?.constructor?.name;
      const typeName = data === null ? 'null'
        : data === undefined ? 'undefined'
        : hasCtorName === undefined ? 'undefined'
        : hasCtorName || 'unknown';
      throw new Error(`Invalid data node type: ${typeName}`);
    }

    if (!ValidationUtils.isValidSchema(schema)) {
      const hasCtorName = (schema as any)?.constructor?.name;
      const typeName = schema === null ? 'null'
        : schema === undefined ? 'undefined'
        : hasCtorName === undefined ? 'undefined'
        : hasCtorName || 'unknown';
      throw new Error(`Invalid schema type: ${typeName}`);
    }

    return { data: data as ObjectNode | CollectionNode, schema: schema as Schema | TokenNode };
  }
}

export class ProcessingResult<T> {
  public readonly success: boolean;
  public readonly data?: T;
  public readonly error?: Error;

  private constructor(success: boolean, data?: T, error?: Error) {
    this.success = success;
    this.data = data;
    this.error = error;
    Object.freeze(this); // ensure immutability at runtime
  }

  static success<T>(data: T): ProcessingResult<T> {
    return new ProcessingResult<T>(true, data);
  }

  static failure<T>(error: Error): ProcessingResult<T> {
    return new ProcessingResult<T>(false, undefined, error);
  }

  isSuccess(): this is ProcessingResult<T> & { data: T } {
    return this.success;
  }
}
