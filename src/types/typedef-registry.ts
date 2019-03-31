import TypeDef from "./typedef";

const defsList:any[] = []
const defs:any = {}


export default class TypedefRegistry {

  public static register(typeDef:TypeDef) {
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

  public static forEach(cb:(type:string, typedef:TypeDef) => void) {
    defs.forEach((def:string) => cb(def, defs[def]));
  }

  public static get defs():string[] {
    return [...defsList]
  }

  public static getDef(type:string): TypeDef {
    return defs[type]
  }
}
