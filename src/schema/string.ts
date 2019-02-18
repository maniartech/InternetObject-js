import { SchemaParser } from '../parser/schema-parser';


export default class StringParser implements SchemaParser {

  parse = (key: string, value:any = null): object => {
    const type = "string"
    const optional = key.endsWith("?")
    const name = optional ? key.substr(0, key.length - 1): key
    const schema:any = { name, type, optional }

    if (!value) return schema

    if (value.max_length) {
      schema.max_length = value.max_length
    }

    return schema
  }

}