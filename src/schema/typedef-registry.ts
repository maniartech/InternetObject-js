import TypeDef from "./typedef";
import InternetObjectError from "../errors/io-error";
import ErrorCodes from "../errors/io-error-codes";

const defsList:any[] = []
const defs:any = {}

export default class TypedefRegistry {

  /**
   * Registers the TypeDef for the specified type.
   * @param type The type name
   * @param typeDef The associated TypeDef ojbect
   */
  public static register(type:string, typeDef:TypeDef) {
    if (defs[type] === undefined) {
      defs[type] = typeDef
      defsList.push(type)
    }
  }

  /**
   * Unregisters the specified type from the registry.
   * @param type The type name
   */
  public static unregister(type:string) {
    if (defs[type] !== undefined) {
      delete defs[type]
      const index = defsList.indexOf(type)
      defsList.splice(index, 1)
    }
  }

  /**
   * Gets the array of registered type names.
   */
  public static get types():string[] {
    return [...defsList]
  }

  /**
   * Returns the associated TypeDef object when the specified type
   * is found otherwise returns undefined.
   * @param type The registered type
   */
  public static get(type:string): TypeDef {
    const typeDef = defs[type]
    if (typeDef === undefined) {
      throw new InternetObjectError(ErrorCodes.invalidType, type)
    }
    return typeDef
  }

  public static isRegisteredType(typeName:string): boolean {
    return typeName in defs
  }

}
