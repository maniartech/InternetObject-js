import { Token } from "../parser/token";
import { ASTParserTree } from '../../dist/types/parser/index';
import MemberDef from "./memberdef";
import { ParserTreeValue } from '../parser/index';

/**
 * Defines the SchemaValidator interface.
 */
export default interface TypeDef {

  getType: () => string

  /**
   * Validates and processes the value as per schema and returns the results
   * specifying whether the value adhers to the schema or not!
   */
  process: (key:string, value:ParserTreeValue, memberDef: MemberDef) => any
}
