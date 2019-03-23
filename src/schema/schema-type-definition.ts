import { Token } from "../token";

/**
 * Defines the SchemaValidator interface.
 */
export default interface TypeDefinition {

  /**
   * Validates the value as per schema and returns the results
   * specifying whether the value adhers to the schema or not!
   */
  validate: (key:string, valueToken:Token, memberDef:any) => any

}



