from http.server import SimpleHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path
import functools

class Handler(SimpleHTTPRequestHandler):
    extensions_map = {**SimpleHTTPRequestHandler.extensions_map, '.js': 'text/javascript', '.mjs': 'text/javascript'}
    def end_headers(self):
        self.send_header('Cache-Control', 'no-store')
        super().end_headers()

server = ThreadingHTTPServer(('127.0.0.1', 0), functools.partial(Handler, directory=str(Path(__file__).parent / 'dist')))
print(f'http://127.0.0.1:{server.server_port}/', flush=True)
server.serve_forever()
