import 'jest'
import InternetObject from '../../src'

describe('String Patterns', () => {
  it('valid pattern values', () => {
    const objStr = String.raw`
    v1:{string, pattern:@"[a-zA-Z\s]+"}
    ---
    Lorem ipsum dolor sit amet
    `
    const obj = new InternetObject(objStr)
    expect(obj.data.v1).toBe('Lorem ipsum dolor sit amet')
  })

  it('invalid pattern values', () => {
    const t1 = () => {
      return new InternetObject(String.raw`
      v1:{string, pattern:"[a-zA-Z\s]+"}
      ---
      Lorem ipsum dolor sit amet?
      `)
    }
    const t2 = () => {
      return new InternetObject(String.raw`
        email:email
        ---
        spiderman
      `)
    }

    const t3 = () => {
      return new InternetObject(String.raw`
        email:email
        ---
        @marvel.com
      `)
    }
    expect(t1).toThrowError()
    expect(t2).toThrowError()
    expect(t3).toThrowError()
  })
})
