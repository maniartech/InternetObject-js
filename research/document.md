# Internet Object

Scratch pad for desinging internet object document interface and implementation.

Install the package using NPM or Yarn

```bash
# NPM
npm install internet-object

# Yarn
yarn add internet-object
```

```js
import io from 'internet-object'
```

## Parsing the Document

```js
// Through the string literal
const ioDoc = io.doc`
  name, age, married
  ---
  John, 30, true
`

// Parse from string
const ioDoc2 = io.parse(`
  name, age, married
  ---
  John, 30, true
`)

// Parse from object
const ioDoc3 = io.parseDocument({
  name: 'John',
  age: 30,
  married: true
})
```

## Creating the document

```js

// Through the object
const ioDoc4 = new io.Document()
ioDoc4.header = io.header`
  name, age, married
`
ioDoc4.data = [
  { name: 'John' },
  { age: 30 },
  { married: true }
]

```

## Accessing the document

```js

const doc = io.dco(`
  name, age, married
  ---
  John, 30, true
`)

// Get the header
const header = doc.header // returns the header

header.schema // returns the schema object
header.$schema
header.recordCount

const data = doc.data // returns the data
const customers = data.customers // returns the customers sections which is second section in the data

```