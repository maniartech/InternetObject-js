import IOError from '../errors/io-error'
import ErrorCodes from '../errors/io-error-codes'
import MemberDef from "./types/memberdef";
import { MemberMap } from "./schema-types";

export default class IOSchema {
  /** Name of the schema */
  public name: string;

  /** The names of the members (properties) in the schema */
  public readonly names: string[] = [];

  /** The definitions of the members (properties) in the schema */
  public readonly defs: MemberMap = {};

  /**
   * Controls additional properties (dynamic fields) in the object.
   * - false: No additional properties allowed
   * - true: Any additional property allowed (no constraints)
   * - MemberDef: Additional properties must match the given type/constraints
   *   (e.g., string, array, object, or with constraints like {string, minLen: 10})
   *
   * If the schema uses *: type, *: {}, or *: [string], then open is set to the corresponding MemberDef.
   * If the schema uses just *, then open is true.
   * If no * is present, open is false.
   */
  public open: boolean | MemberDef = false;

  [key: string]: any;

  /**
   * Creates a new instance of Internet Object IOSchema.
   * Backward-compatible with legacy constructor usage that passes member objects.
   * @param name The name of the schema
   * @param o Optional member definition objects (legacy)
   */
  constructor(name: string, ...o: { [key: string]: MemberDef }[]) {
    this.name = name;

    // Legacy varargs support: new IOSchema('Name', { field: def }, { field2: def })
    if (o && o.length > 0) {
      o.forEach((item) => {
        const key = Object.keys(item)[0];
        const value = item[key];
        if (value.path === undefined) value.path = key;
        this.names.push(key);
        this.defs[key] = value;
      });
    }
  }

  /**
   * The wildcard's MemberDef, when the schema is open WITH a type (`*: int`, `*: $item`).
   *
   * `undefined` for a bare `*` (open, unconstrained) and for a closed schema. The wildcard lives
   * HERE and nowhere else. It used to be written to `defs['*']` as well -- the same object filed
   * under a member name it does not have -- and `defs` is keyed by member NAME, so it collided with
   * a schema that declares a member literally called `*` (written `"*"`). Bare `*` is grammar;
   * quoted `"*"` is a name.
   */
  get wildcard(): MemberDef | undefined {
    return typeof this.open === 'object' && this.open !== null ? this.open as MemberDef : undefined;
  }

  /** Returns the member definition of the given member name. */
  get(name: string): MemberDef | undefined {
    return this.defs[name];
  }

  /** Checks if a member exists by name. */
  has(name: string): boolean {
    return this.defs[name] !== undefined;
  }

  /** Returns the number of members in the schema. */
  get memberCount(): number {
    return this.names.length;
  }

  /** Builder entry for new, immutable-style construction while keeping runtime mutability */
  static create(name: string): SchemaBuilder {
    return new SchemaBuilder(name);
  }

  /** Legacy helper for creating from varargs member objects */
  static fromLegacy(name: string, ...memberObjects: { [key: string]: MemberDef }[]): IOSchema {
    return new IOSchema(name, ...memberObjects);
  }
}

export class SchemaBuilder {
  private names: string[] = [];
  private defs: MemberMap = {};
  private isOpen: boolean | MemberDef = false;

  constructor(private name: string) {}

  addMember(name: string, def: MemberDef): this {
    if (this.defs[name]) {
      throw new IOError(ErrorCodes.duplicateMember, `Member '${name}' already exists in schema '${this.name}'`);
    }
    this.names.push(name);
    this.defs[name] = { ...def, path: def.path || name };
    return this;
  }

  setOpen(open: boolean | MemberDef): this {
    this.isOpen = open;
    return this;
  }

  build(): IOSchema {
    const schema = new IOSchema(this.name);
    // Populate mutable structure to keep backward compatibility
    for (const n of this.names) {
      schema.names.push(n);
      schema.defs[n] = this.defs[n];
    }
    schema.open = this.isOpen;
    // Freeze names and defs for immutability
    Object.freeze(schema.names);
    Object.freeze(schema.defs);
    return schema;
  }
}