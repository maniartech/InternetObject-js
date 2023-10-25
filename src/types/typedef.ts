import MemberDef          from './memberdef'
import Node               from '../parser/nodes/nodes'
import Definitions        from '../core/definitions'

/**
 * Defines the SchemaValidator interface.
 */
export default interface TypeDef {
  getType(): string

  /**
   * Validates and parses the value as per the memberDef and returns the results
   * specifying whether the value adhers to the schema or not!
   */
  parse(node: Node, memberDef: MemberDef, definitions?: Definitions): any

  /**
   * Validates and loads the value as per the memberDef and returns the results
   * specifying whether the value adhers to the schema or not!
   */
  load(value: any, memberDef: MemberDef): any

  // TODO: Hide this from documentation!
  [index: string]: any
}
