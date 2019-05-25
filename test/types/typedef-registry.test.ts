import "jest"
import TypedefRegistry from '../../src/types/typedef-registry';
import AnyDef from '../../src/types/any';
import StringDef from '../../src/types/string';
import NumberDef from '../../src/types/number';



describe("TypeRegistry", () => {

  it ("register", () => {
    TypedefRegistry.register("any", new AnyDef())
    TypedefRegistry.register("string", new StringDef())
    TypedefRegistry.register("number", new NumberDef())
  })

  it("get", () => {
    expect(TypedefRegistry.get("any")).toBeInstanceOf(AnyDef)
    expect(TypedefRegistry.get("string")).toBeInstanceOf(StringDef)
    expect(TypedefRegistry.get("number")).toBeInstanceOf(NumberDef)
    expect(TypedefRegistry.get("unknown")).toBeUndefined()
  })

  it("types", () => {
    const types = TypedefRegistry.types
    expect(types.length).toBe(3)
    expect(types[0]).toBe("any")
    expect(types[1]).toBe("string")
    expect(types[2]).toBe("number")
  })

  it("unregister", () => {
    TypedefRegistry.unregister("any")
    expect(TypedefRegistry.get("any")).toBeUndefined()
    expect(TypedefRegistry.types.length).toBe(2)

    TypedefRegistry.unregister("string")
    expect(TypedefRegistry.get("string")).toBeUndefined()
    expect(TypedefRegistry.types.length).toBe(1)

    TypedefRegistry.unregister("number")
    expect(TypedefRegistry.get("number")).toBeUndefined()
    expect(TypedefRegistry.types.length).toBe(0)

  })
})
