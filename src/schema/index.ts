import { InternetObjectSyntaxError } from "../errors/io-error";
import ErrorCodes from "../errors/io-error-codes";
import { MemberNode, ObjectNode, TokenNode } from "../parser/nodes"
import TokenType from "../tokenizer/token-types";
import MemberDef from '../types/memberdef';
import { TypedefRegistry } from "../types/typedef-registry";
import Schema from "./schema";


export function compileSchema(schema: any) {
  return schema
}

function parseObject(o: ObjectNode, schema:Schema): Schema {

  // Loop through all the children
  for (const child of o.children) {
    if (child === null) {
      throw new InternetObjectSyntaxError(ErrorCodes.invalidSchema);
    }

    const memberNode = child as MemberNode;
    // If key and value both presents in the member node, then fetch
    // the key and typedef from key and value respectively. Generally
    // the value is always present, but in case of member node with
    // no type definition, the key will not be present. In this case
    // the membername will be read from the value node.
    if (memberNode.key) {
      const fieldInfo = parseName(memberNode.key.value);
      // If the value token is a string, then ensure that it is a valid type
      // For example:
      // name: string, age: number
      if (memberNode.value instanceof TokenNode && memberNode.value.type === TokenType.STRING) {

        if (TypedefRegistry.isRegisteredType(memberNode.value.value) === false) {
          throw new InternetObjectSyntaxError(ErrorCodes.invalidType, memberNode.value.value);
        }
        const type = memberNode.value.value as string;
        const memberDef = {
          ...fieldInfo,
          type,
        } as MemberDef;


        // Add the member def to the schema
        addMemberDef(memberDef, schema);
      }

      // If the value token is an object, then parse the object definition
      else if(memberNode.value instanceof ObjectNode) {
        const objectDef = parseObjectDef(memberNode.value);
        const memberDef = {
          ...fieldInfo,
          ...objectDef,
        } as MemberDef;
        addMemberDef(memberDef, schema);
      }

    } else {
      const fieldInfo = parseName(memberNode.value.toValue());
      const memberDef = {
        ...fieldInfo,
        type: 'any'
      } as MemberDef;

      addMemberDef(memberDef, schema);
    }
  }

  return schema;
}

function parseObjectDef(o: ObjectNode) {

  // When the object node is empty object, then the type definition is
  // object without schema definition. Such objects can accept any object
  // as value.
  // For example:
  // address: {},
  if (o.children.length === 0) {
    return {
      type: 'object',
    } as MemberDef;
  }

  // When the object node is type definition. The type deinition has first
  // member as the type name
  // For example:
  // age: { number, min: 10, max: 20 }
  if (o.children[0] instanceof TokenNode) {
    if ((o.children[0] as TokenNode).type === TokenType.STRING && TypedefRegistry.isRegisteredType((o.children[0] as TokenNode).value)) {
      return parseMemberDef(o);
    }

    // If the first member is not a string, then it is an invalid schema
    throw new InternetObjectSyntaxError(ErrorCodes.invalidType, (o.children[0] as TokenNode).value);
  }

  // When the object node is a member type definition defined using the
  // object definition syntax. It must hae a type property.
  // For example:
  // name: { min: 10, max: 20, type: string }
  let type = '';
  for(let i=0; i<o.children.length; i++) {
    const child = o.children[i];
    if (child instanceof MemberNode && child.key && child.key.value === 'type') {
      if (child.value instanceof TokenNode && child.value.type === TokenType.STRING) {
        type = child.value.value;
        break;
      }
    }
  }

  // If type exists, and a valid type, then parse the member definition
  if (type !== '') {
    if (TypedefRegistry.isRegisteredType(type)) {
      return parseMemberDef(o);
    }

    // If the type is not registered, then it is an invalid type
    throw new InternetObjectSyntaxError(ErrorCodes.invalidType, type);
  }

  // If the type is not defined, then consider it an object type with
  // custom schema.
  return {
    type: 'object',
    schema: parseObject(o, new Schema()),
  } as MemberDef;
}

function parseMemberDef(o: ObjectNode) {
  // Parse against the type definition schema
  throw new Error('Not implemented');
}

function addMemberDef(memberDef: MemberDef, schema: Schema) {
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
    throw new InternetObjectSyntaxError(ErrorCodes.invalidKey)
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
