import 'jest'

import InternetObject from '../../src'
import DataParser from '../../src/data/index'
import Tokenizer from '../../src/parser/tokenizer'
import ASTParser from '../../src/parser/ast-parser'

describe('Tokenizer', () => {
  it('parsers comments', () => {
    const text = String.raw`
    # The object
    { # The object opening
      # Describes the Person
      name: "John Doe", # The person's name
      age: 25 # The age
    } # The object closing
    `
    const tokenizer: Tokenizer = new Tokenizer(text)
    tokenizer.readAll()
    const tokens = tokenizer.tokens

    expect(tokens[0].type).toBe('comment')
    expect(tokens[0].token).toBe('# The object')
    expect(tokens[0].value).toBe('The object')

    expect(tokens[1].type).toBe('sep')
    expect(tokens[1].token).toBe('{')
    expect(tokens[1].value).toBe('{')

    expect(tokens[2].type).toBe('comment')
    expect(tokens[2].token).toBe('# The object opening')
    expect(tokens[2].value).toBe('The object opening')

    expect(tokens[3].type).toBe('comment')
    expect(tokens[3].token).toBe('# Describes the Person')
    expect(tokens[3].value).toBe('Describes the Person')

    expect(tokens[4].type).toBe('string')
    expect(tokens[4].token).toBe('name')
    expect(tokens[4].value).toBe('name')

    expect(tokens[5].type).toBe('sep')
    expect(tokens[5].token).toBe(':')
    expect(tokens[5].value).toBe(':')

    expect(tokens[6].type).toBe('string')
    expect(tokens[6].token).toBe('"John Doe"')
    expect(tokens[6].value).toBe('John Doe')

    expect(tokens[7].type).toBe('sep')
    expect(tokens[7].token).toBe(',')
    expect(tokens[7].value).toBe(',')

    expect(tokens[8].type).toBe('comment')
    expect(tokens[8].token).toBe("# The person's name")
    expect(tokens[8].value).toBe("The person's name")

    expect(tokens[9].type).toBe('string')
    expect(tokens[9].token).toBe('age')
    expect(tokens[9].value).toBe('age')

    expect(tokens[10].type).toBe('sep')
    expect(tokens[10].token).toBe(':')
    expect(tokens[10].value).toBe(':')

    expect(tokens[11].type).toBe('number')
    expect(tokens[11].token).toBe('25')
    expect(tokens[11].value).toBe(25)

    expect(tokens[12].type).toBe('comment')
    expect(tokens[12].token).toBe('# The age')
    expect(tokens[12].value).toBe('The age')

    expect(tokens[13].type).toBe('sep')
    expect(tokens[13].token).toBe('}')
    expect(tokens[13].value).toBe('}')

    expect(tokens[14].type).toBe('comment')
    expect(tokens[14].token).toBe('# The object closing')
    expect(tokens[14].value).toBe('The object closing')
  })
})
