import { InternetObject } from '../internet-object'
import AnyDef from '../types/any'
import ObjectDef from '../types/object'

export default class InternetObjectSerializer {
  public static serialize(io: InternetObject): string {
    const data = io.data
    const schema: any = io.schema

    const def = new ObjectDef()
    const serialized = def.serialize(
      data,
      {
        type: 'object',
        schema: schema._schema,
        path: ''
      },
      true
    )

    return serialized
  }
}
