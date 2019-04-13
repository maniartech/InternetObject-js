import { isString } from "./is";


export const print = (...args:any[]) => {
  const msgs:any = []
  args.forEach(o => {
    if (isString(o)) {
      msgs.push(o)
    }
    else {
      msgs.push(JSON.stringify(o, null, 2))
    }
  })
  console.log(msgs.join(' '))
}

export const _ = (o:any):any => {
  return JSON.stringify(o, null, 2)
}