import Collection       from '../core/collection';
import Definitions      from '../core/definitions';
import InternetObject   from '../core/internet-object';
import InternetObjectError from '../errors/io-error';
import ErrorCodes from '../errors/io-error-codes';
import CollectionNode   from '../parser/nodes/collections';
import ObjectNode       from '../parser/nodes/objects';
import TokenNode from '../parser/nodes/tokens';
import TokenType from '../tokenizer/token-types';
import compileObject from './compile-object';
import processObject    from './object-processor';
import Schema           from './schema';

export default function processSchema(data:ObjectNode | CollectionNode | null, schema: Schema | TokenNode, defs?: Definitions) {
  if (!data) {
    return null;
  }

  // If schema is TokenNode of string, then it is a reference to a schema
  // Fetch the schema from definitions
  // if (schema instanceof TokenNode && schema.type === TokenType.STRING) {
  //   const schemaRef = schema.value;
  //   if (!schemaRef.startsWith("$")) {
  //     throw new InternetObjectError(ErrorCodes.invalidSchema, `Invalid schema reference '${schemaRef}'`);
  //   }

  //   const foundSchema = defs?.getV(schemaRef) as Schema;
  //   if (!foundSchema) {
  //     throw new InternetObjectError(ErrorCodes.schemaNotFound, `Schema '${schemaRef}' not found`, schemaRef);
  //   }

  //   if (foundSchema instanceof ObjectNode) {
  //     schema = compileObject(schemaRef, foundSchema, defs);
  //     defs!.set(schemaRef, schema);
  //   } else {
  //     console.log(">>>", defs)
  //     throw new InternetObjectError(ErrorCodes.invalidSchema, `Invalid schema reference '${schemaRef}'`);
  //   }
  // }

  if (data instanceof ObjectNode) {
    return processObject(data, schema, defs);
  }

  if (data instanceof CollectionNode) {
    return processCollection(data, schema, defs);
  }
}

function processCollection(data: CollectionNode, schema: Schema | TokenNode, defs?: Definitions) {
  const coll = new Collection<InternetObject>();
  for (let i=0; i<data.children.length; i++) {
    const member = data.children[i] as ObjectNode;
    coll.push(processObject(member, schema, defs, i));
  }

  return coll;
}
