import MemberDef          from '../types/memberdef'
import Node               from '../parser/nodes/nodes'
import Definitions        from '../core/definitions'
import Schema             from './schema'

/**
 * Defines the SchemaValidator interface.
 */
export default interface TypeDef {

  /**
   * Returns the type this instance is going to handle.
   */
  get type(): string

  /**
   * Returns the schema for the type this instance is going to handle.
   */
  get schema(): Schema

  /**
   * Validates and parses the value as per the memberDef and returns the results
   * specifying whether the value adhers to the schema or not!
   */
  parse(node: Node, memberDef: MemberDef, definitions?: Definitions, collectionIndex?: number): any

  /**
   * Loads the value as per the memberDef and returns the results
   * specifying whether the value adhers to the schema or not!
   */
  // deserialize(data: any, memberDef: MemberDef): any

  /**
   * Serializes the value as per the memberDef and returns the results
   * specifying whether the value adhers to the schema or not!
   */
  // serialize(data: any, memberDef: MemberDef, isRoot: boolean): string
}
