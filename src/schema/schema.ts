import MemberDef from "../types/memberdef";

export default class Schema {

  public names: string[] = [];
  public defs: { [key: string]: MemberDef } = {};

  [key: string]: any;
}
