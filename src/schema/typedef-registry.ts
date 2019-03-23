
const defsList:any[] = []
const defs:any = {}

export default class TypedefRegistry {

  public static register(typedef:any) {
    const name = typedef.type

    if (defs[name] === undefined) {
      defs[name] = typedef
      defsList.push(name)
    }
  }

  public static unregister(name:string) {
    if (defs[name] !== undefined) {
      delete defs[name]
      const index = defsList.indexOf(name)
      defsList.splice(index, 1)
    }
  }

  public static forEach(cb:(name:string, typedef:any) => void) {
    defs.forEach((def:string) => cb(def, defs[def]));
  }

  public static get defs():string[] {
    return [...defsList]
  }
}
