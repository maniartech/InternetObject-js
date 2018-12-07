import { TRUE, FALSE } from './constants';
// import { INVALID_TYPE } from './errors';


export default class Token {

  constructor(text:string, start:number=0) {
    this._text = text
    this._start = start
    this._end = start
  }

  get token () {
    return this.text.substring(this.start, this.end);
  }

  private _text : string;
  public get text() : string {
    return this._text;
  }

  private _start : number;
  public get start() : number {
    return this._start;
  }

  private _end : number;
  public get end() : number {
    return this._end;
  }

  next = () => {
    this._end += 1
  }

  get length():number {
    return this.end - this.start;
  };

  get value () {
    const token = this.token

    // Boolean
    if (token === TRUE) return true
    if (token === FALSE) return false

    // Number
    const num = Number(token)
    if (!isNaN(num)) return num

    // String
    return token
  }

}