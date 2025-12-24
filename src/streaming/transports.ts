import { IOStreamTransport } from './types';

/** Node.js HTTP transport (ServerResponse-like). */
export function nodeHttpTransport(res: { write: (chunk: any) => any; flush?: () => void }): IOStreamTransport {
  return {
    send(chunk) {
      res.write(chunk);
      if (typeof res.flush === 'function') res.flush();
    }
  };
}

/** WebSocket transport (ws or browser ws-like). */
export function webSocketTransport(ws: { send: (data: any) => any }): IOStreamTransport {
  return {
    send(chunk) {
      ws.send(chunk);
    }
  };
}
