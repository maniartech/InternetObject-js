/**
 * Defines the MemberDef object!
 * @internal
 */
export default interface MemberDef {
  type: string
  path: string
  optional?: boolean
  null?: any
  default?: any
  choices?: any[]
  schema?: any // If type is an object or array, associated schema
  [index: string]: any // Any other values
}
