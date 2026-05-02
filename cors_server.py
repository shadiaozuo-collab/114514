#!/usr/bin/env python3
import http.server
import socketserver

PORT = 5500

class CORSRequestHandler(http.server.SimpleHTTPRequestHandler):
    def end_headers(self):
        self.send_header('Access-Control-Allow-Origin', '*')
        self.send_header('Access-Control-Allow-Methods', 'GET, POST, OPTIONS')
        self.send_header('Access-Control-Allow-Headers', 'Content-Type')
        super().end_headers()

    def do_OPTIONS(self):
        self.send_response(200)
        self.end_headers()

class ThreadedHTTPServer(socketserver.ThreadingMixIn, http.server.HTTPServer):
    allow_reuse_address = True

with ThreadedHTTPServer(("", PORT), CORSRequestHandler) as httpd:
    print(f"Serving at port {PORT} with CORS enabled (threaded)")
    httpd.serve_forever()
