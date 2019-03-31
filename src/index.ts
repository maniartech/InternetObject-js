// import './constants'

import ASTParser from './parser/ast-parser';
import { isString } from './utils/is';
import IOSchema from './parser/schema';
import DataParser from './parser/data-parser';
import InternetObjectError from './errors/io-error';

type SchemaType = string | IOSchema | null

export default class InternetObject {

  constructor(schema?:string|IOSchema) {
    //
  }

  private _schema:IOSchema|null = null
  public get schema() {
    return this._schema
  }

  private _data:any = null
  public get data() {
    return this._data
  }

  /**
   * Parses the Internet Object string and returns the value
   * @param text The text to be parsed
   */
  public static parse(text:string, schema:SchemaType = null):InternetObject {
    const parser = new ASTParser(text)
    let compiledSchema:IOSchema|null = null

    // Parse the text
    parser.parse()
    const data = parser.data

    // If schema is string compile it and apply
    if (isString(schema)) {
      const astSchmeaParser = new ASTParser(schema, true)
      astSchmeaParser.parse()
      const parsedSchema = astSchmeaParser.schema
      if(parsedSchema) {
        compiledSchema = IOSchema.compile(parsedSchema)
      }
    }
    // If schema is already compiled, prioratize it over schema passed in text
    else if (schema instanceof  IOSchema) {
      compiledSchema = schema
    }
    // If object contains schema, parse and compile it
    else if (schema === null && parser.schema) {
      compiledSchema = IOSchema.compile(parser.schema)
    }

    const iObject = new InternetObject()
    if (compiledSchema === null) {
      iObject._data = DataParser.parse(data)
      iObject._schema = null
      return iObject
    }

    compiledSchema.apply(data)
    iObject._schema = compiledSchema
    iObject._data = compiledSchema.apply(data)
    return iObject
  }

  public static compileSchema(text:string):IOSchema {
    return IOSchema.compile(text)
  }
}

