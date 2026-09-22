#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""Dev server over the BUILT tree, with caching disabled.

Serving the repo root would expose the authored sources, whose numbers are still
@@fact.tokens@@ and which have no JS-free meaning. Always serve dist/.
"""
import functools, http.server, os, subprocess, sys

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
PORT = int(sys.argv[1]) if len(sys.argv) > 1 else 4174


class H(http.server.SimpleHTTPRequestHandler):
    def end_headers(self):
        self.send_header('Cache-Control', 'no-store, must-revalidate')
        self.send_header('Pragma', 'no-cache')
        super().end_headers()

    def log_message(self, *a):
        pass


if __name__ == '__main__':
    os.chdir(ROOT)
    subprocess.run([sys.executable, 'tools/build.py'], check=True)
    subprocess.run([sys.executable, 'tools/bundle.py'], check=True)
    d = os.path.join(ROOT, 'dist')
    print(f'serving {d} on http://localhost:{PORT}/   (single file: /teddy-wu.html)')
    http.server.ThreadingHTTPServer(('0.0.0.0', PORT), functools.partial(H, directory=d)).serve_forever()
