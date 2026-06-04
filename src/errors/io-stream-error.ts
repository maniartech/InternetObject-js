import PositionRange from "../core/positions"
import InternetObjectError from "./io-error"

/**
 * Represents a streaming transport/lifecycle error in Internet Object — the `stream`
 * error category (PROTOCOL.md §7.3). Unlike syntax/validation errors, these are not
 * data-semantic; they signal that the stream itself could not proceed (buffer limit
 * exceeded, source/transport failure, or cancellation).
 */
class IOStreamError extends InternetObjectError {
  constructor(errorCode: string, fact?: string, posRange?: PositionRange, isEof: boolean = false, ssf?: any) {
    super(errorCode, fact, posRange, isEof, ssf)
    this.name = 'InternetObject(StreamError)'
    this.updateMessage()
  }
}

export default IOStreamError
