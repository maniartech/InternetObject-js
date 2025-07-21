import MemberDef from "../types/memberdef";
import { MemberMap } from "./schema-types";

export default class Schema {

  /**
   * Name of the schema
   */
  public name: string;

  /**
   * The names of the members (properties) in the schema
   */
  public readonly names: string[] = [];

  /**
   * The definitions of the members (properties) in the schema
   */
  public readonly defs: MemberMap = {};

  /**
   * When true, allows additional members in the object.
   */
  open: boolean;

  [key: string]: any;

  /**
   * Creates a new instance of Internet Object Schema.
   * @param name The name of the schema
   * @param o The member definitions
   */
  constructor(name:string, ...o:{ [key: string]: MemberDef }[]) {
    this.name = name;
    this.names = [];
    this.defs = {};
    this.open = false;

    o.forEach((item) => {
      const key = Object.keys(item)[0];
      const value = item[key];
      if (value.path === undefined) value.path = key;
      this.names.push(key);
      this.defs[key] = value;
    });
  }

  /**
   * Returns the member definition of the given member name.
   * @param name The name of the member
   */
  get(name: string, ): MemberDef {
    return this.defs[name];
  }
}
