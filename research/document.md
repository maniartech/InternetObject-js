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

const doc = io.parse(`
  name, age, married
  ---
  John, 30, true
`)

// Get the header
const header = doc.header // returns the header

header.schema // returns the schema object
header.definitions

const data = doc.data // returns the data
const section = doc.sections[0] // returns the first section of the data

section.name // The name of the section
section.alias // The alias of the section
section.schema // The schema of the section
section.data // The data of the section


```