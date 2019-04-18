

export default interface MemberDef {
  type:string,
  path:string,
  optional?:boolean,
  null?:any,
  default?:any,
  choices?:any[],
  schema?:any,
  [index:string]:any
}
