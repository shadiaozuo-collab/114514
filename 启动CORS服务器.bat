@echo off
chcp 65001 >nul
echo ========================================
echo   正在启动 CORS 文件服务器...
echo   地址: http://localhost:5500
echo   关闭此窗口即可停止服务器
echo ========================================
cd /d "%~dp0dist"
python -c "
import os, sys
from http.server import HTTPServer, SimpleHTTPRequestHandler

class H(SimpleHTTPRequestHandler):
    def end_headers(self):
        self.send_header('Access-Control-Allow-Origin', '*')
        self.send_header('Access-Control-Allow-Methods', 'GET, POST, OPTIONS')
        self.send_header('Access-Control-Allow-Headers', '*')
        super().end_headers()
    def do_OPTIONS(self):
        self.send_response(200); self.end_headers()
    def log_message(self, f, *a):
        if 'ConnectionAborted' not in str(a) and 'BrokenPipe' not in str(a):
            print(f'[{self.log_date_time_string()}] {a[0]}')

class S(HTTPServer):
    def handle_error(self, req, addr):
        t, v = sys.exc_info()[:2]
        if t and issubclass(t, (ConnectionAbortedError, ConnectionResetError, BrokenPipeError)):
            return
        super().handle_error(req, addr)

S(('', 5500), H).serve_forever()
"
pause
