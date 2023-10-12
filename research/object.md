# Internet Object

Scratch pad for desinging internet object interface and implementation.


```js
console.log(io.header.schema)
console.log(io.data[0])

// Through the object
const o2 = new io.InternetObject({
  name: 'John',
  age: 30,
  married: true
})

o2[address] = {
  street: '123 Main St',
  city: 'New York',
  state: 'NY',
  zip: 10010
}



// Through the array
const o3 = io.InternetObject.fromArray([
  [name, 'John'],
  [age, 30],
  [married, true],
  [,{
    street: '123 Main St',
    city: 'New York',
    state: 'NY',
    zip: 10010
  }]
])



```
