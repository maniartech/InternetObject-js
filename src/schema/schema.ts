import MemberDef from "../types/memberdef";

export default class Schema {

  public name:string

  public names: string[] = [];
  public defs: { [key: string]: MemberDef } = {};

  /**
   * When true, allows additional members in the object.
   */
  open: boolean;

  [key: string]: any;

  constructor(name:string, ...o:{ [key: string]: MemberDef }[]) {
    this.name = name;
    this.names = [];
    this.defs = {};
    this.open = false;

    o.forEach((item) => {
      const key = Object.keys(item)[0];
      const value = item[key];
      this.names.push(key);
      this.defs[key] = value;
    });
  }
}
