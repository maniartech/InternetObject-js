/**
 * Defines the MemberDef object!
 * @internal
 */
export default interface MemberDef {
  type: string
  optional?: boolean
  nullable?: any
  path?: string
  default?: any
  choices?: any[]

  // Other user defined properties
  [key: string]: any
}
