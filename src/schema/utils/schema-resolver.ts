import Definitions from '../../core/definitions';
import TokenNode from '../../parser/nodes/tokens';
import Schema from '../schema';
import IOError from '../../errors/io-error';
import ErrorCodes from '../../errors/io-error-codes';

export class SchemaResolver {
  static resolve(schema: Schema | TokenNode, defs?: Definitions): Schema {
    if (schema instanceof TokenNode) {
      const schemaName = schema.value as string;
      // Match existing behavior: defer to definitions.getV for resolution and error semantics
      const resolved = defs?.getV(schemaName);
      if (!(resolved instanceof Schema)) {
        // Safety net; typically getV would throw for missing/invalid refs
        throw new IOError(ErrorCodes.schemaNotFound, `Schema '${schemaName}' not found or invalid`);
      }
      return resolved;
    }
    return schema;
  }

  static isSchemaVariable(value: unknown): value is TokenNode {
    return value instanceof TokenNode && typeof value.value === 'string' && value.value.startsWith('$');
  }
}
