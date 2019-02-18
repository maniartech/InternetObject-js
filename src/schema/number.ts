import SchemaValidator from './schema-validator';


export default class NumberValidator implements SchemaValidator {

  validate = (key: string, value:any = null): object => {
    const type = "number"
    const optional = key.endsWith("?")
    const name = optional ? key.substr(0, key.length - 1): key
    const schema:any = { name, type, optional }

    if (!value) return schema

    if (value.min !== undefined && typeof value.min === "number") {
      schema.min = value.min
    }

    if (value.max) {
      schema.max = value.max
    }

    return schema
  }

}