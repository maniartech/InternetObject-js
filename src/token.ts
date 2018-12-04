import { TRUE, FALSE } from './constants';
import { INVALID_TYPE } from './errors';


export default class Token {

  constructor(text:string, start:number=0, end:number=0) {
    this._text = text
    this._start = start
    this._end = end
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
  public set start(v : number) {
    this._start = v;
  }

  private _end : number;
  public get end() : number {
    return this._end;
  }
  public set end(v : number) {
    this._end = v;
  }

  get length():number {
    return this.end - this.start;
  };

  get isBoolean () {
    let token = this.token;
    return token === TRUE || token === FALSE
  }

  get booleanVal () {
    if (this.isBoolean) {
      return this.token === TRUE
    }
    throw INVALID_TYPE
  }

}