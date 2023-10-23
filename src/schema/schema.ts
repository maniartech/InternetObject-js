import { InternetObjectSyntaxError } from "../errors/io-error";
import ErrorCodes from "../errors/io-error-codes";
import { MemberNode, Node, ObjectNode, TokenNode } from "../parser/nodes";
import TokenType from "../tokenizer/token-types";
import Token from "../tokenizer/tokens";
import MemberDef from "../types/memberdef";
import ObjectDef from "../types/object";
import TypeDef from "../types/typedef";



export default class Schema {

  public names: string[] = [];
  public defs: { [key: string]: MemberDef } = {};

  [key: string]: any;
}
