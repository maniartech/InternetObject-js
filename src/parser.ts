import Token from '../dist/types/token';


export default class Parser {

  private stack:any[] = []
  private data:any = null
  private lastObj:any = null
  private lastToken:Token|null = null

  constructor() {
    //
  }



  process = (token:Token, isFinalToken:boolean = false) => {
    let obj = this.lastObj
    let lastToken = this.lastToken

    // not yet started
    if(this.data === null) {
      // If scalar
      if (isFinalToken) {
        this.pushValue(token)
      }
      else {
        this.pushObject(token)
      }
    }

  }

  pushObject = (token:Token, key?:Token) => {
    //
  }

  pushValue = (value:Token, key?:Token) => {
    this.data
  }

  pushArray = (token:Token, key?:Token) => {

  }


}