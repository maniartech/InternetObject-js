import Token from "../tokenizer/tokens";

// export default class InternetObjectErrorTrial extends Error {
//   public errorCode?: string;
//   public row?: number;
//   public col?: number;
//   public pos?: number;

//   constructor(errorCode: string, message: string, token?: Token) {
//     super();

//     let errorMsg: string = errorCode;
//     this.errorCode = errorCode;
//     this.name = 'InternetObjectError';

//     if (token) {
//       this.row = token.row;
//       this.col = token.col;
//       this.pos = token.pos;
//       errorMsg = `${errorCode} at (${token.row}, ${token.col})`;
//     } else {
//       errorMsg = errorCode;
//     }

//     // The message generally does not contain the position information
//     // we update the message with the position information if the token
//     // is provided. For example:
//     // "Expecitng }" => "Expecitng } at row 2, col 5"
//     this.message = message ? `${errorMsg}: ${message}` : errorMsg;

//     this.captureAndCleanStackTrace();
//   }

//   private captureAndCleanStackTrace() {
//     if (typeof Error.captureStackTrace === 'function') {
//       // V8-based environments: Node.js, some browsers
//       Error.captureStackTrace(this, InternetObjectError);
//       this.skipLibraryFrames();
//     } else {
//       // Other environments: manually adjust the stack
//       if (this.stack) {
//         const lines = this.stack.split('\n');
//         lines.splice(1, 0, `    at InternetObjectError: ${this.message}`);
//         this.stack = lines.join('\n');
//       }
//     }
//   }

//   private skipLibraryFrames() {
//     if (!this.stack) return;

//     const lines = this.stack.split('\n');
//     const filteredLines = lines.filter(line => {
//       // Logic to identify and remove library-specific frames
//       // Example: If your library is named 'ioLib', you can remove frames containing it:
//       return !line.includes('ioLib');
//     });

//     this.stack = filteredLines.join('\n');
//   }
// }

