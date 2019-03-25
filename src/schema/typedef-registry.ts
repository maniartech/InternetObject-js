import TypeDefinition from "./schema-type-definition";

const defsList:any[] = []
const defs:any = {}


export default class TypedefRegistry {

  public static register(typeDef:TypeDefinition) {
    const type = typeDef.getType()
    console.log("Registring", type)

    if (defs[type] === undefined) {
      defs[type] = typeDef
      defsList.push(type)
    }
  }

  public static unregister(type:string) {
    if (defs[type] !== undefined) {
      delete defs[type]
      const index = defsList.indexOf(type)
      defsList.splice(index, 1)
    }
  }

  public static forEach(cb:(type:string, typedef:TypeDefinition) => void) {
    defs.forEach((def:string) => cb(def, defs[def]));
  }

  public static get defs():string[] {
    return [...defsList]
  }

  public static getDef(type:string): TypeDefinition {
    return defs[type]
  }
}
