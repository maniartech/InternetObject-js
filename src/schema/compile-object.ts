import Definitions      from '../core/definitions';
import assertNever      from '../errors/asserts/asserts';
import SyntaxError      from '../errors/io-syntax-error';
import ErrorCodes       from '../errors/io-error-codes';
import ArrayNode        from '../parser/nodes/array';
import MemberNode       from '../parser/nodes/members';
import Node             from '../parser/nodes/nodes';
import ObjectNode       from '../parser/nodes/objects';
import TokenNode        from '../parser/nodes/tokens';
import TokenType        from '../tokenizer/token-types';
import registerTypes    from '../types';
import MemberDef        from '../types/memberdef';
import TypedefRegistry  from './typedef-registry';
import processSchema    from './processor';
import Schema           from './schema';

registerTypes();

export default function compileObject(
  name:string, node: Node, defs?:Definitions): Schema | TokenNode {

  // Check if the node is a string token and starts with $. If yes, then
  // it is a schema variable. In this case, just return the node as it is
  // to be processed later.
  if (
    node instanceof TokenNode &&
    node.type === TokenType.STRING &&
    node.value.startsWith('$')) {
    return node;
  }

  if (node instanceof ObjectNode === false) {
    throw new SyntaxError(ErrorCodes.invalidSchema, "Schema must be an object.", node);
  }

  const o = node as ObjectNode;
  return parseObjectDef(o, new Schema(name), "", defs);
}

function parseObjectOrTypeDef(o: ObjectNode, path:string) {
  // When the object node is empty object, then the type definition is
  // object without schema definition. Such objects can accept any object
  // as value.
  // For example:
  // address: {},
  if (o.children.length === 0) {
    const schema = new Schema(path);
    schema.open = true;
    return {
      type: 'object',
      path,
      schema

    } as MemberDef;
  }

  // When the object node is type definition. The type deinition has first
  // member as the type name
  // For example:
  // age: { number, min: 10, max: 20 }
  const firstNode = o.children[0] as MemberNode;
  if (!firstNode.key) {
    if (firstNode.value instanceof TokenNode) {
      const token = firstNode.value;
      if (token.type === TokenType.STRING && TypedefRegistry.isRegisteredType(token.value)) {
        return parseMemberDef(token.value, o);
      }
    }


    // If the first member is not a string, then it is an invalid schema
    // throw new SyntaxError(ErrorCodes.invalidType, (o.children[0] as TokenNode).value);
  }

  // When the object node is a member type definition defined using the
  // object definition syntax. It must hae a type property.
  // For example:
  // name: { min: 10, max: 20, type: string }
  let type = '';
  let typeNode = null;
  for(let i=0; i<o.children.length; i++) {
    const child = o.children[i];
    if (child instanceof MemberNode && child.key && child.key.value === 'type') {
      if (child.value instanceof TokenNode && child.value.type === TokenType.STRING) {
        type = child.value.value;
        typeNode = child.value;
        break;
      }
    }
  }

  // If type exists, and a valid type, then parse the member definition
  // name: { minLength: 10, maxLength: 20, type: string }
  if (type !== '') {
    if (TypedefRegistry.isRegisteredType(type)) {
      return parseMemberDef(type, o);
    }

    // If the type is not registered, then it is an invalid type
    // name: { minLength: 10, maxLength: 20, type: xyz }
    throw new SyntaxError(ErrorCodes.invalidType, `The specified value '${type}' is not a valid type.`, typeNode!);
  }

  // If the type is not defined, then consider it an object type with
  // custom schema.
  return {
    type: 'object',
    schema: parseObjectDef(o, new Schema(path), path),
    path,
  } as MemberDef;
}

function parseArrayOrTypeDef(a:ArrayNode, path:string, defs?:Definitions) :any {
  // The length of the array child must be <= 1. If the length is > 1, then
  // it is an invalid schema.
  if (a.children.length > 1) {
    console.log(a.children[1])
     // TODO: Better error
    throw new SyntaxError(ErrorCodes.invalidSchema, "The array definition must have only one child.", a.children[1] as Node);
  }

  // When the array node has one child, then it is a type definition.
  // For example:
  // tags: [string], friends: [ { name: string, age: number } ]
  if (a.children.length === 1) {
    const child = a.children[0];
    if (child instanceof TokenNode && child.type === TokenType.STRING) {
      const type = child.value as string;
      if (TypedefRegistry.isRegisteredType(type)) {
        return {
          type: "array",
          "of": {
            "type": child.value,
            path,
          },
        } as MemberDef;
      } else if (!!defs && type.startsWith('$')) {
        const memberDef = {
          type: "array",
          "of": {
            "type": "object",
            schema: child,
            path,
          }
        } as MemberDef;
        return memberDef;
      }

      // If the type is not registered, then it is an invalid type
      throw new SyntaxError(ErrorCodes.invalidType,"The specified value is not a valid type.", child);
    }

    // If the child is an object node, then it is a member type definition
    // For example:
    // friends: [ { name: string, age: number } ]
    if (child instanceof ObjectNode) {
      return {
        type: 'array',
        of: parseObjectDef(child, new Schema(path), path, defs),
        path,
      } as MemberDef;
    }

    // If the child is an array node, then it is an array type definition
    // For example:
    // friends: [ [string] ] or friends: [ [ { name: string, age: number } ] ]
    if (child instanceof ArrayNode) {
      return {
        type: 'array',
        of: parseArrayOrTypeDef(child, path, defs),
        path,
      } as MemberDef;
    }

    // Throw an error if the child is not a string or object node
    throw new SyntaxError(ErrorCodes.invalidSchema,
      "The array of type definition must be a string or object.", child!);
  }

  // When the array node is empty array, then the type definition is
  // array without schema definition. Such arrays can accept any type items
  // in the array.
  // For example:
  // tags: []
  if (a.children.length === 0) {
    return {
      type: 'array',
      of: {
        type: 'any',
        path,
        nullable: true,
        optional: true,
      },
    } as MemberDef;
  }
}

function parseObjectDef(o: ObjectNode, schema:Schema, path:string, defs?:Definitions): Schema {
  if (!o.children) {
    schema.open = true
    return schema
  }

  // Loop through all the children
  // for (const child of o.children) {
  for(let index=0; index<o.children.length; index++) {
    const child = o.children[index];

    if (child === null) {
      assertNever("Child value must not be null in schema definition.")
    }

    const memberNode = child as MemberNode;
    if (memberNode.value instanceof TokenNode && memberNode.value.type === TokenType.UNDEFINED) {
      throw new SyntaxError(ErrorCodes.emptyMemberDef, "The next member definition is empty.", memberNode.value);
    }

    // If key and value both presents in the member node, then fetch
    // the key and typedef from key and value respectively. Generally
    // the value is always present, but in case of member node with
    // no type definition, the key will not be present. In this case
    // the membername will be read from the value node.
    if (memberNode.key) {
      const memberDef = getMemberDef(memberNode.value, memberNode.key.value, path, defs);
      addMemberDef(memberDef, schema, path);
    } else {
      // If the last index and the value is *, then this is an open schema, a
      // schema that can accept any member even if it is not defined in the schema.
      const open = memberNode.value instanceof TokenNode && memberNode.value.type === TokenType.STRING && memberNode.value.value === '*';

      if (open) {
        if (index !== o.children.length - 1) {
          throw new SyntaxError(ErrorCodes.invalidSchema, "The * is only allowed at the last position.", memberNode.value);
        }
        schema.open = true;
        continue;
      }

      const fieldInfo = parseName(memberNode.value.toValue());
      const memberDef = {
        ...fieldInfo,
        type: 'any'
      } as MemberDef;

      addMemberDef(memberDef, schema, path);
    }
  }

  if (schema.names.length === 0) {
    schema.open = true;
  }

  return schema;
}

function parseMemberDef(type:string, o: ObjectNode) {
  const typeDef = TypedefRegistry.get(type);
  const memberDef = processSchema(o, typeDef.schema)
  return memberDef?.toObject();
}

function addMemberDef(memberDef: MemberDef, schema: Schema, path:string) {
  memberDef.path = _(path, memberDef.name);
  schema.names.push(memberDef.name);
  schema.defs[memberDef.name] = memberDef;
}

const parseName = (key: string): {
  name: string,
  optional: boolean,
  nullable: boolean
} => {
  const optionalExp = /\?$/
  const nullExp = /\*$/
  const optNullExp = /(\?\*)|(\*\?)$/

  if (typeof key !== 'string') {
    throw new SyntaxError(ErrorCodes.invalidKey)
  }

  // Optional and nullable
  if (key.match(optNullExp)) {
    return {
      name: key.substring(0, key.length - 2),
      optional: true,
      nullable: true
    }
  }

  // Nullable
  if (key.match(nullExp)) {
    return {
      name: key.substring(0, key.length - 1),
      optional: false,
      nullable: true
    }
  }

  // Optional
  if (key.match(optionalExp) !== null) {
    return {
      name: key.substring(0, key.length - 1),
      optional: true,
      nullable: false
    }
  }
  return { name: key, optional: false, nullable: false }
}

export function getMemberDef(node:Node, fieldName:string, path:string, defs?:Definitions): MemberDef {
  const fieldInfo = parseName(fieldName);

  // If the value token is a string, then ensure that it is a valid type
  // For example:
  // name: string, age: number
  if (node instanceof TokenNode && node.type === TokenType.STRING) {
    const type = node.value as string;

    // If the type string starts with $, then it is a schema variable
    if (type.startsWith('$')) {
      return {
        ...fieldInfo,
        type: "object",
        schema: node,
      } as MemberDef;
    }

    if (TypedefRegistry.isRegisteredType(type) === false) {
      throw new SyntaxError(ErrorCodes.invalidType,
        `The specified value '${type}' is not a valid type.`, node);
    }

    return {
      ...fieldInfo,
      type,
    } as MemberDef;
  }

  // If the value token is an object, then parse the object definition
  if(node instanceof ObjectNode) {
    const objectDef = parseObjectOrTypeDef(node, _(path, fieldInfo.name));
    return {
      ...objectDef,
      ...fieldInfo,
    } as MemberDef;
  }

  // If the value token is an array, then parse the array definition
  if(node instanceof ArrayNode) {
    const arrayDef = parseArrayOrTypeDef(node, _(path, fieldInfo.name), defs);
    return {
      ...fieldInfo,
      ...arrayDef,
    } as MemberDef;
  }

  throw new SyntaxError(ErrorCodes.invalidSchema, `The specified value '${node.toValue()}' is not a valid type.`, node);
}

// concacts the path and key
function _(path:string, key:string) {
  if (path === "") {
    return key;
  }
  return `${path}.${key}`;
}
