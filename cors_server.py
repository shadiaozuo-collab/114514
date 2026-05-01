#!/usr/bin/env python3
import os
import sys
import socket
from http.server import HTTPServer, SimpleHTTPRequestHandler

class CORSHandler(SimpleHTTPRequestHandler):
    def end_headers(self):
        self.send_header('Access-Control-Allow-Origin', '*')
        self.send_header('Access-Control-Allow-Methods', 'GET, POST, OPTIONS')
        self.send_header('Access-Control-Allow-Headers', '*')
        super().end_headers()

    def do_OPTIONS(self):
        self.send_response(200)
        self.end_headers()

    def log_message(self, format, *args):
        # 只打印正常请求，隐藏连接中断的报错
        if 'ConnectionAborted' not in str(args) and 'BrokenPipe' not in str(args):
            print(f"[{self.log_date_time_string()}] {args[0]}")

class QuietServer(HTTPServer):
    def handle_error(self, request, client_address):
        # 忽略连接中断类错误，不打印堆栈
        exc_type, exc_value = sys.exc_info()[:2]
        if exc_type is not None and issubclass(exc_type, (ConnectionAbortedError, ConnectionResetError, BrokenPipeError)):
            return
        super().handle_error(request, client_address)

if __name__ == '__main__':
    port = int(sys.argv[1]) if len(sys.argv) > 1 else 5500
    os.chdir(os.path.join(os.path.dirname(__file__), 'dist'))
    print(f'========================================')
    print(f'  CORS 文件服务器已启动')
    print(f'  地址: http://localhost:{port}')
    print(f'  按 Ctrl+C 停止')
    print(f'========================================')
    try:
        QuietServer(('', port), CORSHandler).serve_forever()
    except KeyboardInterrupt:
        print('\n服务器已停止')
