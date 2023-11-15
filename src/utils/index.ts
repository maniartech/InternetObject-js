
export const print = (...args: any[]) => {
  const msgs: any = []
  args.forEach(o => {
    if (typeof o === 'string') {
      msgs.push(o)
    } else {
      msgs.push(JSON.stringify(o, null, 2))
    }
  })
  console.log(msgs.join(' '))
}

export const _ = (o: any): any => {
  return JSON.stringify(o, null, 2)
}

export const appendPath = (newPath: string, oldPath?: string) => {
  let path = newPath
  if (oldPath) {
    path =
      oldPath.endsWith('[') || newPath === '[' ? `${oldPath}${newPath}` : `${oldPath}.${newPath}`
  }

  return path
}
