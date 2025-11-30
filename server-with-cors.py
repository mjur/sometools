#!/usr/bin/env python3
"""
Simple HTTP server with CORS support for serving AI detector models
Run this from the project root directory to serve models with CORS headers

Usage:
    python server-with-cors.py

The server will start on port 5000 and serve files from the models/ directory
with CORS headers enabled to allow requests from localhost:4000
"""

from http.server import HTTPServer, SimpleHTTPRequestHandler
import os

class CORSRequestHandler(SimpleHTTPRequestHandler):
    def end_headers(self):
        # Add CORS headers
        self.send_header('Access-Control-Allow-Origin', '*')
        self.send_header('Access-Control-Allow-Methods', 'GET, OPTIONS')
        self.send_header('Access-Control-Allow-Headers', 'Content-Type')
        super().end_headers()
    
    def do_OPTIONS(self):
        # Handle preflight requests
        self.send_response(200)
        self.end_headers()
    
    def log_message(self, format, *args):
        # Custom logging
        print(f"[{self.address_string()}] {format % args}")

def main():
    # Change to models directory
    models_dir = os.path.join(os.path.dirname(__file__), 'models')
    if os.path.exists(models_dir):
        os.chdir(models_dir)
        print(f"Serving models from: {os.path.abspath(models_dir)}")
    else:
        print(f"Warning: models directory not found at {models_dir}")
        print("Serving from current directory instead")
    
    port = 5000
    server_address = ('', port)
    httpd = HTTPServer(server_address, CORSRequestHandler)
    
    print(f"\n{'='*60}")
    print(f"AI Detector Model Server (with CORS)")
    print(f"{'='*60}")
    print(f"Server running on: http://localhost:{port}")
    print(f"Serving from: {os.getcwd()}")
    print(f"\nCORS enabled: Allowing requests from any origin")
    print(f"Press Ctrl+C to stop the server")
    print(f"{'='*60}\n")
    
    try:
        httpd.serve_forever()
    except KeyboardInterrupt:
        print("\n\nServer stopped.")
        httpd.shutdown()

if __name__ == '__main__':
    main()



