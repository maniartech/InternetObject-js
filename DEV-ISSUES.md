# Issues Found

This document lists issues found in the codebase that need to be addressed.

## Do not find all validation errors per object (Schema validation)

When processing an object against a schema, if there are multiple validation errors (e.g., multiple required properties missing), only the first error is reported. The processor should collect and report all validation errors for better debugging.

## Invalid Def-inferrance for Additional Properties

See the following JSON example test case:

```json
{
  "result": {
    "questions": {
      "QID1": {
        "questionName": "Q2",
        "choices": {
          "1": {
            "recode": [
              "0"
            ]
          },
          "2": {
            "recode": [
              "1"
            ]
          }
        }
      },
      "QID2": {
        "questionName": "Q1",
        "choices": {
          "1": {
            "recode": [
              "4234230"
            ]
          },
          "2": {
            "recode": [
              "1"
            ]
          }
        }
      }
    }
  },
  "detail": "hello"
}
```

When loading with inferring of the definitions, it should generate the following document with definitions and data:

```io
~ $choice: {*: {recode: []}}
~ $questions: { *: {questionName, choices: $choice} }
~ $result: { questions: $questions}
~ $schema: { result: $result, detail? }
---
{
  {
    QID1: { "Q2", { "1": { ["0"] }, "2": { ["1"] } } },
    QID2: { "Q1", { "1": { recode: ["4234230"] }, "2": { ["1"] } } }
  }
}, hello
```

However, the current implementation generates following incorrect document:

```io
~ $result: {questions: object}
~ $question: {questionName: string, choices: object}
~ $choice: {recode: array}
~ $schema: {result: $result, detail: string}
---
{
  { { Q2, { { [ "0" ] }, { [ "1" ] } } }, { Q1, { { [ "4234230" ] }, { [ "1" ] } } } }
}, hello
```

When converted back to JSON, it produces the following incorrect JSON:

```json
{
  "result": {
    "questions": {
      "0": {
        "0": "Q2",
        "1": {
          "0": {
            "0": [
              "0"
            ]
          },
          "1": {
            "0": [
              "1"
            ]
          }
        }
      },
      "1": {
        "0": "Q1",
        "1": {
          "0": {
            "0": [
              "4234230"
            ]
          },
          "1": {
            "0": [
              "1"
            ]
          }
        }
      }
    }
  },
  "detail": "hello"
}
```

## Multisection Document Inference

Currently multisection inference is not supported. For example, see the following JSON:

```json
{
  "accounting" : [
    { "firstName" : "John",
      "lastName"  : "Doe",
      "age"       : 23 },

    { "firstName" : "Mary",
      "lastName"  : "Smith",
      "age"      : 32 }
  ],
  "sales"      : [
      { "firstName" : "Sally",
        "lastName"  : "Green",
        "age"      : 27 },

      { "firstName" : "Jim",
        "lastName"  : "Galley",
        "age"       : 41 }
  ]
}

It infers the loads with inferred schema the following IO document.

```io
~ $accounting: {firstName: string, lastName: string, age: number}
~ $sale: {firstName: string, lastName: string, age: number}
~ $schema: {accounting: [$accounting], sales: [$sale]}
---
[
  { John, Doe, 23 },
  { Mary, Smith, 32 }
], [
  { Sally, Green, 27 },
  { Jim, Galley, 41 }
]
```

While the output and schema is correct, it would have been better if the following document with multisection data would have been generated instead:

```io
~ $accounting: {firstName: string, lastName: string, age: number}
~ $sale: {firstName: string, lastName: string, age: number}

--- $sale
~ John, Doe, 23
~ Mary, Smith, 32

--- $accounting
~ Sally, Green, 27
~ Jim, Galley, 41
```

Both forms are valid, but the latter is more readable and better represents the IO and it provides isolation between the sections and records. Do you understand? Also did you notice that in the latter form, we didn't need the default $schema, becuase we are directly using specific schemas for each section?
