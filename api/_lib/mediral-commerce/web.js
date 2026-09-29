import {Readable} from 'node:stream';

// Use Vercel's Web Request entry point: signature verification must see the
// original bytes, never the Node runtime's parsed req.body convenience getter.
export function webHandler(handler) {
  return async request => {
    const headers = Object.fromEntries(request.headers);
    headers.host ||= new URL(request.url).host;
    const input = request.body ? Readable.fromWeb(request.body) : Readable.from([]);
    Object.assign(input, {url:request.url, method:request.method, headers});
    const output = new Headers();
    let status = 200, bytes = '';
    await handler(input, {
      setHeader: (name,value) => output.set(name,value),
      set statusCode(value) { status = value; },
      end(value='') { bytes = value; },
    });
    return new Response(bytes, {status, headers:output});
  };
}
