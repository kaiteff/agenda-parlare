import os
import shutil
import datetime

def make_backup():
    fecha = datetime.datetime.now().strftime("%Y%m%d_%H%M%S")
    backup_name = f"backup_{fecha}_antes_cambios_cursor"
    backup_dir = os.path.join("d:\\agbc\\Ag_Pa\\_backups", backup_name)
    
    os.makedirs(backup_dir, exist_ok=True)
    
    items = ['js', 'functions', 'firestore.rules', 'firestore.indexes.json', 'firebase.json', 'index.html', 'index.css', 'package.json', 'serve.py', 'whatsapp_webhook.py']
    
    for item in items:
        src = os.path.join("d:\\agbc\\Ag_Pa", item)
        if not os.path.exists(src):
            continue
        dst = os.path.join(backup_dir, item)
        if os.path.isdir(src):
            shutil.copytree(src, dst)
        else:
            shutil.copy2(src, dst)
            
    print(f"Backup completado exitosamente en: _backups/{backup_name}")

if __name__ == "__main__":
    make_backup()
