import Token from './token';

type ObjectType = {[key:string] : any}

export default class Tokens {
  private _tokens:Token[];

  constructor () {
    this._tokens = []
  }

  get tokens():Token[] {
    return this._tokens.slice();
  }

  get length () {
    return this._tokens.length
  }

  push = (...items: Token[]): Tokens => {
    this._tokens.push(...items)
    return this;
  }

  get value (): ObjectType {
    const o:ObjectType = {}
    this._tokens.forEach((token, index) => {
      o[index] = token.value
    })
    return o
  }
}