import http.server
import socketserver
import socket
import os
import sys
import webbrowser

# Configuración
START_PORT = 8081
MAX_RETRIES = 100

class Handler(http.server.SimpleHTTPRequestHandler):
    def end_headers(self):
        # Agregar headers para evitar caché agresivo durante desarrollo
        self.send_header('Cache-Control', 'no-cache, no-store, must-revalidate')
        self.send_header('Pragma', 'no-cache')
        self.send_header('Expires', '0')
        super().end_headers()

def get_local_ip():
    try:
        # Intenta obtener todas las IPs
        host_name = socket.gethostname()
        ips = socket.gethostbyname_ex(host_name)[2]
        
        # Filtrar por 192.168 (comun en casa)
        for ip in ips:
            if ip.startswith("192.168."):
                return ip
        
        # Si no, fallback al metodo anterior
        s = socket.socket(socket.AF_INET, socket.SOCK_DGRAM)
        s.connect(("8.8.8.8", 80))
        local_ip = s.getsockname()[0]
        s.close()
        return local_ip
    except:
        return "127.0.0.1"

def get_free_port(start_port):
    # Intentar primero el puerto 8081 (Requerido para Google Auth)
    target_port = 8081
    try:
        with socket.socket(socket.AF_INET, socket.SOCK_STREAM) as s:
            s.bind(('', target_port))
            return target_port
    except OSError:
        print(f"\n[WARN] El puerto {target_port} está OCUPADO por otro proceso (posiblemente System/IIS).")
        print("Intentando buscar otro puerto libre...")
    
    # Buscar otro puerto si el 8081 falla
    port = start_port
    if port == target_port:
        port += 1
        
    while port < start_port + MAX_RETRIES:
        try:
            with socket.socket(socket.AF_INET, socket.SOCK_STREAM) as s:
                s.bind(('', port))
                return port
        except OSError:
            port += 1
            
    print("[ERROR] No se encontraron puertos libres.")
    sys.exit(1)

def run():
    # Cambiar al directorio del script
    os.chdir(os.path.dirname(os.path.abspath(__file__)))
    
    try:
        port = get_free_port(START_PORT)
        local_ip = get_local_ip()
        
        with socketserver.TCPServer(("", port), Handler) as httpd:
            url_local = f"http://localhost:{port}"
            url_lan = f"http://{local_ip}:{port}"
            
            print(f"\n[OK] Servidor iniciado exitosamente")
            print(f"URL Local : {url_local}")
            print(f"URL Movil : {url_lan}  <-- USALA EN TU CELULAR")
            print(f"Directorio: {os.getcwd()}")
            print(f"Presiona Ctrl+C para detener\n")
            
            if port != 8081:
                print("ADVERTENCIA: No se esta usando el puerto 8081. Google Auth podria fallar.")
            
            # Abrir navegador automaticamente
            webbrowser.open(url_local)
            
            httpd.serve_forever()
            
    except KeyboardInterrupt:
        print("\n[STOP] Servidor detenido.")
    except Exception as e:
        print(f"\n[ERROR] Error: {e}")

if __name__ == "__main__":
    run()
