import ValidationError  from "../errors/io-validation-error";
import ErrorCodes       from "../errors/io-error-codes";
import TokenNode        from "../parser/nodes/tokens";
import TokenType        from "../tokenizer/token-types";
import Schema           from "../schema/schema";

type DefinitionValue = {
  isSchema: boolean,
  isVariable: boolean,
  value: any
}

class Definitions {
  private _defaultSchema:Schema | null = null;
  private _definitions: {[key: string]: DefinitionValue} = {};

  public get length(): number {
    return Object.keys(this._definitions).length;
  }

  public get keys(): string[] {
    return Object.keys(this._definitions);
  }

  public at(index: number): { key: string, value: DefinitionValue } {
    const key = this.keys[index];
    return { key, value: this._definitions[key] };
  }

  public get defaultSchema(): Schema | null {
    return this._defaultSchema;
  }

  /**
   * Gets the varialbe value. This function is intend to be used internally
   * for quickly fetching the variable value, hence it accepts any key to keep the
   * consumer code free from type checking. The function validate the key and
   * returns the associated value, if avialable. Otherwise returns undefined.
   * @param key {any} The varialbe key starting with $
   * @returns The value associated with the variable
   */
  public getV(k: any) {
    let key:string = ""

    if (k instanceof TokenNode && k.type === TokenType.STRING) {
      key = k.value;
    } else if (typeof k === 'string') {
      key = k;
    } else {
      return;
    }

    // If key is not
    if (key.startsWith("$") || key.startsWith("@")) {
      const def = this._definitions[key];
      if (!def) {
        throw new ValidationError(ErrorCodes.variableNotDefined, `Variable ${key} is not defined.`, k instanceof TokenNode ? k : undefined);
      }
      if (def.isVariable || def.isSchema) {
        return def.value;
      }
    }
  }

  /**
   * Pushes a new definition to the definitions list.
   * @param key The key of the definition
   * @param value The value of the definition
   */
  public push(key: string, value: any, isSchema: boolean = false, isVariable: boolean = false) {
    this._definitions[key] = { isSchema, isVariable, value };
    if (key === "$schema") {
      this._defaultSchema = value;
    }
  }

  /**
   * Merges the definitions with the other definitions.
   * @param other     The other definitions to merge with
   * @param override  If true, the other definitions will override the current
   *                  definitions
   */
  public merge(other: Definitions, override: boolean = false) {
    for (let i=0; i<other.length; i++) {
      const { key, value } = other.at(i);
      if (override || !this._definitions[key]) {
        this.push(key, value.value, value.isSchema, value.isVariable);
      }
    }
  }
}

export default Definitions;
