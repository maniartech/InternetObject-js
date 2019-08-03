import MemberDef from "./memberdef";
import { ParserTreeValue } from '../parser/index';

/**
 * Defines the SchemaValidator interface.
 */
export default interface TypeDef {

  getType: () => string

  /**
   * Validates and parses the value as per the memberDef and returns the results
   * specifying whether the value adhers to the schema or not!
   */
  parse: (value:ParserTreeValue, memberDef: MemberDef) => any


}
