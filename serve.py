import http.server
import socketserver
import socket
import os
import sys
import webbrowser

# Configuración
START_PORT = 8000
MAX_RETRIES = 100

class Handler(http.server.SimpleHTTPRequestHandler):
    def end_headers(self):
        # Agregar headers para evitar caché agresivo durante desarrollo
        self.send_header('Cache-Control', 'no-cache, no-store, must-revalidate')
        self.send_header('Pragma', 'no-cache')
        self.send_header('Expires', '0')
        super().end_headers()

def get_free_port(start_port):
    port = start_port
    while port < start_port + MAX_RETRIES:
        try:
            with socket.socket(socket.AF_INET, socket.SOCK_STREAM) as s:
                s.bind(('', port))
                return port
        except OSError:
            port += 1
    raise IOError("No se encontraron puertos libres.")

def run():
    # Cambiar al directorio del script
    os.chdir(os.path.dirname(os.path.abspath(__file__)))
    
    try:
        port = get_free_port(START_PORT)
        
        with socketserver.TCPServer(("", port), Handler) as httpd:
            url = f"http://localhost:{port}"
            print(f"\n[OK] Servidor iniciado exitosamente")
            print(f"URL: {url}")
            print(f"Directorio: {os.getcwd()}")
            print(f"Presiona Ctrl+C para detener\n")
            
            # Abrir navegador automáticamente
            webbrowser.open(url)
            
            httpd.serve_forever()
            
    except KeyboardInterrupt:
        print("\n[STOP] Servidor detenido.")
    except Exception as e:
        print(f"\n[ERROR] Error: {e}")

if __name__ == "__main__":
    run()
