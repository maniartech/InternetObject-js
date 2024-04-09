const http = require('http');

class ResponseBuilder {
  constructor() {
      this.buffer = [];
  }

  addBinary(data, sectionName) {
      this.buffer.push(`--- ${sectionName} (${data.length} bytes)\n`);
      this.buffer.push(Buffer.from(data));
      this.buffer.push('\n');
  }

  addText(text, sectionName) {
      this.buffer.push(`--- ${sectionName}\n`);
      this.buffer.push(text);
      this.buffer.push('\n');
  }

  toStream() {
      return Buffer.concat(this.buffer.map(part => Buffer.from(part)));
  }
}

const server = http.createServer((req, res) => {
    const rb = new ResponseBuilder();
    rb.addBinary([0x23, 0x41, 0x56, 0x18, 0x12 ], 'binary section');
    rb.addText('Hello World', 'text section');

    res.setHeader('Content-Type', 'text/plain');
    res.end(rb.toStream());
});

server.listen(8080);
