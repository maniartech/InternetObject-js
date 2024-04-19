import InternetObjectError  from '../errors/io-error';
import ErrorCodes           from '../errors/io-error-codes';
import TypeDef              from './typedef';

const typeDefList: any[]  = []
const typeDefs: any       = {}

interface TypeDefConstructor {
  new(type:string): TypeDef;  // Constructor signature
  types: string[];  // Static property
}

export default class TypedefRegistry {

  /**
   * Registers the TypeDef for the specified type.
   * @param type The type name
   * @param typeDef The associated TypeDef ojbect
   */
  public static register(...typeDefConstructors: Array<TypeDefConstructor>) {
    for (let constructor of typeDefConstructors) {
      for (let type of constructor.types) {
        if (typeDefs[type] === undefined) {
          typeDefs[type] = new constructor(type)
          typeDefList.push(type)
        }
      }
    }
  }

  /**
   * Unregisters the specified type from the registry.
   * @param type The type name
   */
  public static unregister(type: string) {
    if (typeDefs[type] !== undefined) {
      delete typeDefs[type]
      const index = typeDefList.indexOf(type)
      typeDefList.splice(index, 1)
    }
  }

  /**
   * Gets the array of registered type names.
   */
  public static get types(): string[] {
    return [...typeDefList]
  }

  /**
   * Returns the associated TypeDef object when the specified type
   * is found otherwise returns undefined.
   * @param type The registered type
   */
  public static get(type: string): TypeDef {
    const typeDef = typeDefs[type]
    if (typeDef === undefined) {
      throw new InternetObjectError(ErrorCodes.invalidType, type)
    }
    return typeDef
  }

  public static isRegisteredType(typeName: string): boolean {
    return typeName in typeDefs
  }
}