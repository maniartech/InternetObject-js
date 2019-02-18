
export default class Schema {

}



const test = "name:{ string, max_length: 20 }, age?:number, address?:{ building:{ max_length: 100}, street?, city }"

const compiled = {
  name: {
    index: 0,
    type: "string",
    max_length: 20,
    optional: false
  },
  age: {
    index: 1,
    type: "number",
    optional: true
  },
  address: {
    index: 2,
    type: "object",
    optional: true,
    schema: {
      building: {
        index: 1,
        type: "string",
        max_length: 100
      }
    }
  }
}