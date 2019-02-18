export const DATA_TYPES = [
  "id",
  "any",
  "string",
  "number",
  "boolean",
  "date"
]

export const validate = () => {
  //
}

/**
 * Defines the SchemaValidator interface.
 */
export interface SchemaValidator {

  /**
   * Validates the value as per schema and returns the results
   * specifying whether the value adhers to the schema or not!
   */
  validate: (value:any, schema:object) => object
}