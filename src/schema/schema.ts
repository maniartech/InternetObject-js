import { InternetObjectSyntaxError } from "../errors/io-error";
import ErrorCodes from "../errors/io-error-codes";
import { MemberNode, Node, ObjectNode, TokenNode } from "../parser/nodes";
import MemberDef from "../types/memberdef";
import ObjectDef from "../types/object";
import TypeDef from "../types/typedef";

class Schema {
  [key: string]: any;
}

function builtSchema(root: ObjectNode): Schema {
  const schema: Schema = new Schema();

  // Loop through all the children
  // for (const child of root.children) {
  //   if (!child) {
  //     throw new InternetObjectSyntaxError(ErrorCodes.invalidSchema);
  //   }

  //   const memberNode = child as MemberNode;
  //   // If key and value both presents in the member node, then fetch
  //   // the key and typedef from key and value respectively. Generally
  //   // the value is always present, but in case of member node with
  //   // no type definition, the key will not be present. In this case
  //   // the membername will be read from the value node.
  //   if (memberNode.key) {
  //     const memberDef = parseName(memberNode.key);
  //     addMemberDef(schema, memberDef);
  //   }
  // }

  return schema;
}
