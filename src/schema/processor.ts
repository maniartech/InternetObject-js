import Collection from '../core/collection';
import Definitions from '../core/definitions';
import InternetObject from '../core/internet-object';
import CollectionNode from '../parser/nodes/collections';
import ObjectNode from '../parser/nodes/objects';
import TokenNode from '../parser/nodes/tokens';
import processObject from './object-processor';
import processCollection from './processing/collection-processor';
import { ProcessingContext } from './processing/processing-context';
import Schema from './schema';
import { ValidationUtils } from './utils/validation-utils';

type ProcessableData = ObjectNode | CollectionNode | null;
type SchemaType = Schema | TokenNode;
type ProcessResult = InternetObject | Collection<InternetObject> | null;

export default function processSchema(
  data: ProcessableData,
  schema: SchemaType,
  defs?: Definitions,
  errorCollector?: Error[]
): ProcessResult {
  // Early return for null data
  if (data === null) {
    return null;
  }

  // Validate inputs
  const { data: validData, schema: validSchema } = ValidationUtils.validateProcessingInputs(data, schema);

  // Route to appropriate processor
  if (validData instanceof ObjectNode) {
    // For single objects, create a context if errorCollector is provided
    if (errorCollector) {
      const ctx = new ProcessingContext();
      const result = processObject(validData, validSchema, defs, void 0, ctx);
      // Transfer errors to errorCollector
      if (ctx.hasErrors()) {
        errorCollector.push(...ctx.getErrors());
      }
      return result;
    }
    return processObject(validData, validSchema, defs);
  }

  // Must be CollectionNode at this point due to validation
  return processCollection(validData as CollectionNode, validSchema, defs, errorCollector);
}
