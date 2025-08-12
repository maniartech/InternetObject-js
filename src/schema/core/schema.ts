import MemberDef from "../types/memberdef";
import { MemberMap } from "../schema-types";

export default class Schema {
  public readonly name: string;
  public readonly names: readonly string[];
  public readonly defs: Readonly<MemberMap>;
  public readonly open: boolean;

  constructor(
    name: string,
    names: string[],
    defs: MemberMap,
    open: boolean = false
  ) {
    this.name = name;
    this.names = Object.freeze([...names]);
    this.defs = Object.freeze({ ...defs });
    this.open = open;
  }

  static create(name: string): SchemaBuilder {
    return new SchemaBuilder(name);
  }

  /**
   * Returns the member definition of the given member name.
   * @param name The name of the member
   */
  get(memberName: string): MemberDef | undefined {
    return this.defs[memberName];
  }

  /**
   * Checks if the schema has a member with the given name.
   * @param memberName The name of the member
   */
  has(memberName: string): boolean {
    return memberName in this.defs;
  }

  /**
   * Returns the number of members in the schema.
   */
  get memberCount(): number {
    return this.names.length;
  }

  /**
   * Legacy constructor for backward compatibility
   * @deprecated Use Schema.create() builder pattern instead
   */
  static fromLegacy(name: string, ...memberObjects: { [key: string]: MemberDef }[]): Schema {
    const builder = new SchemaBuilder(name);

    memberObjects.forEach((item) => {
      const key = Object.keys(item)[0];
      const value = item[key];
      if (value.path === undefined) value.path = key;
      builder.addMember(key, value);
    });

    return builder.build();
  }
}

export class SchemaBuilder {
  private names: string[] = [];
  private defs: MemberMap = {};
  private isOpen = false;

  constructor(private name: string) {}

  addMember(name: string, def: MemberDef): this {
    if (this.defs[name]) {
      throw new Error(`Member '${name}' already exists in schema '${this.name}'`);
    }

    this.names.push(name);
    this.defs[name] = { ...def, path: def.path || name };
    return this;
  }

  setOpen(open: boolean): this {
    this.isOpen = open;
    return this;
  }

  build(): Schema {
    return new Schema(this.name, this.names, this.defs, this.isOpen);
  }
}
