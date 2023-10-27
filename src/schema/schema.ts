import MemberDef from "../types/memberdef";

export default class Schema {

  public names: string[] = [];
  public defs: { [key: string]: MemberDef } = {};

  [key: string]: any;

  constructor(...o:{ [key: string]: MemberDef }[]) {
    this.names = [];
    this.defs = {};

    o.forEach((item) => {
      const key = Object.keys(item)[0];
      const value = item[key];
      this.names.push(key);
      this.defs[key] = value;
    });
  }
}
