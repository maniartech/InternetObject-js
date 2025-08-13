import InternetObjectError  from '../errors/io-error';
import ErrorCodes           from '../errors/io-error-codes';
import TypeDef              from './typedef';

interface TypeDefConstructor {
  new(type: string): TypeDef;
  types: string[];
}

export default class TypedefRegistry {
  private static readonly typeDefMap = new Map<string, TypeDef>();
  private static readonly typeNames = new Set<string>();
  private static warnDuplicates = false;
  private static warnedDuplicateTypes = new Set<string>();

  /**
   * Enable/disable console warnings on duplicate type registrations.
   * Default is disabled to avoid noise and performance overhead in hot paths/tests.
   */
  public static setWarnOnDuplicates(enable: boolean): void {
    this.warnDuplicates = enable;
  }

  /**
   * Registers TypeDef constructors for the specified types.
   * @param typeDefConstructors The TypeDef constructor classes
   */
  public static register(...typeDefConstructors: TypeDefConstructor[]): void {
    for (const Constructor of typeDefConstructors) {
      for (const type of Constructor.types) {
        if (this.typeDefMap.has(type)) {
          if (this.warnDuplicates && !this.warnedDuplicateTypes.has(type)) {
            console.warn(`TypeDef for '${type}' is already registered. Skipping.`);
            this.warnedDuplicateTypes.add(type);
          }
          continue;
        }

        this.typeDefMap.set(type, new Constructor(type));
        this.typeNames.add(type);
      }
    }
  }  /**
   * Unregisters the specified type from the registry.
   * @param type The type name to unregister
   */
  public static unregister(type: string): void {
    if (this.typeDefMap.has(type)) {
      this.typeDefMap.delete(type);
      this.typeNames.delete(type);
    }
  }

  /**
   * Gets the array of registered type names.
   */
  public static get types(): readonly string[] {
    return Object.freeze(Array.from(this.typeNames));
  }

  /**
   * Returns the associated TypeDef object for the specified type.
   * @param type The registered type name
   * @throws {InternetObjectError} When the type is not registered
   */
  public static get(type: string): TypeDef {
    const typeDef = this.typeDefMap.get(type);
    if (!typeDef) {
      throw new InternetObjectError(ErrorCodes.invalidType, `Type '${type}' is not registered`);
    }
    return typeDef;
  }

  /**
   * Checks if the specified type is registered.
   * @param typeName The type name to check
   */
  public static isRegisteredType(typeName: string): boolean {
    return this.typeDefMap.has(typeName);
  }

  /**
   * Clears all registered types. Primarily for testing.
   */
  public static clear(): void {
    this.typeDefMap.clear();
    this.typeNames.clear();
  this.warnedDuplicateTypes.clear();
  }

  /**
   * Gets the count of registered types.
   */
  public static get count(): number {
    return this.typeDefMap.size;
  }
}