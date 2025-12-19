# 🚀 Guía de Despliegue - Agenda Parlare
## De Local a Producción (Internet)

---

## 📍 Situación Actual

### ¿Dónde está la aplicación ahora?
- **Aplicación Web:** Local en tu computadora (`localhost:8081`)
- **Base de Datos:** Firebase Firestore (en la nube)
- **Acceso:** Solo desde tu computadora

### ¿Qué necesitas?
Que tu esposa y sus compañeras puedan acceder desde:
- ✅ Sus celulares
- ✅ Sus laptops
- ✅ Cualquier lugar con internet

---

## 🎯 Solución: Firebase Hosting (RECOMENDADO)

### ¿Por qué Firebase Hosting?

#### Ventajas:
1. **GRATIS** - Plan gratuito muy generoso
2. **Ya usas Firebase** - Todo en un solo lugar
3. **Rápido** - CDN global de Google
4. **Seguro** - HTTPS automático
5. **Fácil** - Comandos simples
6. **Confiable** - Infraestructura de Google

#### Costo:
- **Plan Spark (Gratis):**
  - 10 GB de almacenamiento
  - 360 MB/día de transferencia
  - Más que suficiente para un consultorio

- **Plan Blaze (Pago por uso):**
  - Solo si excedes el plan gratuito
  - Muy económico para uso pequeño

---

## 📋 PLAN COMPLETO DE DESPLIEGUE

### FASE 1: Preparación (CRÍTICO - Seguridad)

#### 1.1 Implementar Autenticación
**Problema actual:** Cualquiera puede acceder a los datos

**Solución:** Firebase Authentication

**Opciones de login:**
- Email y contraseña (recomendado)
- Google Sign-In
- Teléfono (SMS)

**Código a agregar:**
```javascript
// En firebase.js
import { getAuth, signInWithEmailAndPassword } from 'firebase/auth';

const auth = getAuth(app);

// Función de login
async function login(email, password) {
    try {
        await signInWithEmailAndPassword(auth, email, password);
        console.log('Login exitoso');
    } catch (error) {
        console.error('Error de login:', error);
    }
}
```

#### 1.2 Configurar Reglas de Seguridad
**Ubicación:** Firebase Console > Firestore Database > Rules

**Reglas actuales (INSEGURAS):**
```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    match /{document=**} {
      allow read, write: if true; // ❌ CUALQUIERA puede acceder
    }
  }
}
```

**Reglas seguras (RECOMENDADAS):**
```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    // Solo usuarios autenticados pueden leer/escribir
    match /{document=**} {
      allow read, write: if request.auth != null;
    }
    
    // Opcional: Reglas más específicas
    match /users/{userId}/appointments/{appointmentId} {
      allow read, write: if request.auth.uid == userId;
    }
  }
}
```

#### 1.3 Crear Página de Login
**Archivo nuevo:** `login.html`

```html
<!DOCTYPE html>
<html lang="es">
<head>
    <meta charset="UTF-8">
    <title>Login - Agenda Parlare</title>
    <script src="https://cdn.tailwindcss.com"></script>
</head>
<body class="bg-gradient-to-br from-blue-50 to-indigo-100 min-h-screen flex items-center justify-center">
    <div class="bg-white p-8 rounded-xl shadow-2xl w-96">
        <h1 class="text-2xl font-bold text-center mb-6">Agenda Parlare</h1>
        <form id="loginForm">
            <input type="email" id="email" placeholder="Email" 
                   class="w-full p-3 border rounded-lg mb-4">
            <input type="password" id="password" placeholder="Contraseña" 
                   class="w-full p-3 border rounded-lg mb-4">
            <button type="submit" 
                    class="w-full bg-blue-600 text-white p-3 rounded-lg hover:bg-blue-700">
                Iniciar Sesión
            </button>
        </form>
    </div>
    <script type="module" src="js/login.js"></script>
</body>
</html>
```

#### 1.4 Crear Usuarios
**En Firebase Console:**
1. Ir a Authentication
2. Click en "Add user"
3. Crear usuarios para:
   - Tu esposa
   - Cada compañera

---

### FASE 2: Instalación de Herramientas

#### 2.1 Instalar Node.js (si no lo tienes)
**Descargar:** https://nodejs.org/
**Versión:** LTS (Long Term Support)

**Verificar instalación:**
```bash
node --version
npm --version
```

#### 2.2 Instalar Firebase CLI
**Comando:**
```bash
npm install -g firebase-tools
```

**Verificar:**
```bash
firebase --version
```

---

### FASE 3: Configuración de Firebase Hosting

#### 3.1 Login a Firebase
```bash
firebase login
```
- Se abrirá el navegador
- Inicia sesión con tu cuenta de Google
- Autoriza Firebase CLI

#### 3.2 Inicializar Proyecto
**En la carpeta de tu proyecto:**
```bash
cd "G:/Mi unidad/AG"
firebase init hosting
```

**Responde las preguntas:**
```
? What do you want to use as your public directory? 
  → . (punto - directorio actual)

? Configure as a single-page app (rewrite all urls to /index.html)? 
  → No

? Set up automatic builds and deploys with GitHub? 
  → No (por ahora)

? File index.html already exists. Overwrite? 
  → No
```

**Esto creará:**
- `firebase.json` - Configuración de hosting
- `.firebaserc` - Configuración del proyecto

#### 3.3 Configurar firebase.json
**Editar el archivo creado:**
```json
{
  "hosting": {
    "public": ".",
    "ignore": [
      "firebase.json",
      "**/.*",
      "**/node_modules/**",
      "backups/**",
      "*.ps1",
      "*.md"
    ],
    "rewrites": [
      {
        "source": "**",
        "destination": "/index.html"
      }
    ],
    "headers": [
      {
        "source": "**/*.@(js|css)",
        "headers": [
          {
            "key": "Cache-Control",
            "value": "max-age=3600"
          }
        ]
      }
    ]
  }
}
```

---

### FASE 4: Despliegue

#### 4.1 Preparar Archivos
**Verificar que tienes:**
- ✅ `index.html`
- ✅ `login.html` (si implementaste auth)
- ✅ Carpeta `js/` con todos los archivos
- ✅ Carpeta `css/` (si tienes)
- ✅ Imágenes/assets

**Eliminar archivos innecesarios:**
- ❌ Carpeta `backups/`
- ❌ Archivos `.ps1`
- ❌ Archivos `.md` (documentación)

#### 4.2 Desplegar
**Comando:**
```bash
firebase deploy --only hosting
```

**Salida esperada:**
```
✔  Deploy complete!

Project Console: https://console.firebase.google.com/project/tu-proyecto/overview
Hosting URL: https://tu-proyecto.web.app
```

#### 4.3 Probar
1. Abre la URL en tu navegador
2. Prueba desde tu celular
3. Comparte la URL con tu esposa

---

### FASE 5: Configuración Post-Despliegue

#### 5.1 Dominio Personalizado (Opcional)
**Si quieres:** `agenda-parlare.com` en lugar de `tu-proyecto.web.app`

**Pasos:**
1. Comprar dominio (GoDaddy, Namecheap, etc.)
2. En Firebase Console > Hosting > Add custom domain
3. Seguir instrucciones de DNS

**Costo:** ~$10-15/año

#### 5.2 Configurar Notificaciones
**Para alertas de errores:**
- Firebase Crashlytics
- Email de errores

#### 5.3 Backup Automático
**Script para backup de Firestore:**
```bash
firebase firestore:export gs://tu-bucket/backups/$(date +%Y%m%d)
```

---

## 🔄 Actualizar la Aplicación

### Cuando hagas cambios:

#### 1. Probar localmente
```bash
# Servidor local
powershell -ExecutionPolicy Bypass -File ./server.ps1
```

#### 2. Desplegar cambios
```bash
firebase deploy --only hosting
```

**Tiempo:** ~30 segundos

#### 3. Verificar
- Abrir URL de producción
- Probar cambios
- Verificar en celular

---

## 👥 Gestión de Usuarios

### Crear nuevo usuario:
1. Firebase Console > Authentication
2. Add user
3. Email y contraseña
4. Compartir credenciales de forma segura

### Eliminar usuario:
1. Firebase Console > Authentication
2. Buscar usuario
3. Delete user

### Resetear contraseña:
1. Implementar "Olvidé mi contraseña"
2. O resetear manualmente desde Console

---

## 📊 Monitoreo

### Ver estadísticas:
**Firebase Console > Hosting > Dashboard**
- Visitas
- Transferencia de datos
- Errores

### Ver logs:
**Firebase Console > Firestore > Usage**
- Lecturas/escrituras
- Almacenamiento usado

---

## 💰 Costos Proyectados

### Escenario: 3 usuarias, 50 citas/día

**Firebase Hosting (Gratis):**
- Almacenamiento: ~100 MB (muy por debajo del límite)
- Transferencia: ~10 MB/día (muy por debajo del límite)

**Firebase Firestore (Gratis):**
- Lecturas: ~500/día (límite: 50,000)
- Escrituras: ~100/día (límite: 20,000)
- Almacenamiento: ~1 GB (límite: 1 GB gratis)

**Total:** $0/mes (dentro del plan gratuito)

### Si crece el negocio:
**Plan Blaze (pago por uso):**
- Primeros 50K lecturas: Gratis
- Siguientes 100K: $0.06
- Muy económico incluso con mucho uso

---

## 🆘 Solución de Problemas

### Error: "Permission denied"
**Causa:** Reglas de seguridad muy restrictivas
**Solución:** Revisar reglas en Firebase Console

### Error: "Module not found"
**Causa:** Ruta de import incorrecta
**Solución:** Verificar rutas relativas en imports

### No se ven cambios después de deploy
**Causa:** Caché del navegador
**Solución:** 
```bash
# Limpiar caché y redesplegar
firebase deploy --only hosting
# Luego Ctrl+Shift+R en el navegador
```

### Aplicación lenta
**Causa:** Muchas lecturas de Firestore
**Solución:** Implementar caché local

---

## 📱 Optimización para Móviles

### PWA (Progressive Web App)
**Agregar:** `manifest.json`

```json
{
  "name": "Agenda Parlare",
  "short_name": "Agenda",
  "start_url": "/",
  "display": "standalone",
  "background_color": "#ffffff",
  "theme_color": "#3b82f6",
  "icons": [
    {
      "src": "/icon-192.png",
      "sizes": "192x192",
      "type": "image/png"
    },
    {
      "src": "/icon-512.png",
      "sizes": "512x512",
      "type": "image/png"
    }
  ]
}
```

**Beneficio:** Se puede "instalar" en el celular como app

---

## 🔐 Checklist de Seguridad

Antes de hacer público:
- [ ] Autenticación implementada
- [ ] Reglas de Firestore configuradas
- [ ] HTTPS habilitado (automático en Firebase)
- [ ] Usuarios creados con contraseñas seguras
- [ ] Backup configurado
- [ ] Monitoreo activo

---

## 📞 Soporte

### Documentación oficial:
- Firebase Hosting: https://firebase.google.com/docs/hosting
- Firebase Auth: https://firebase.google.com/docs/auth
- Firestore: https://firebase.google.com/docs/firestore

### Comunidad:
- Stack Overflow: Tag `firebase`
- Firebase Discord
- Reddit: r/Firebase

---

## 🎯 Resumen Ejecutivo

### Para desplegar la aplicación:

1. **Preparar (1-2 horas):**
   - Implementar autenticación
   - Configurar reglas de seguridad
   - Crear usuarios

2. **Instalar (15 minutos):**
   - Node.js
   - Firebase CLI

3. **Desplegar (5 minutos):**
   ```bash
   firebase login
   firebase init hosting
   firebase deploy
   ```

4. **Compartir:**
   - URL: `https://tu-proyecto.web.app`
   - Credenciales a usuarias

### Costo total: $0/mes

### Tiempo total: ~2-3 horas (primera vez)

### Actualizaciones futuras: ~1 minuto

---

## 📝 Notas Importantes

1. **No borres** el archivo `firebase.js` con tu configuración
2. **Guarda** las credenciales de usuarios de forma segura
3. **Haz backup** antes de cada despliegue importante
4. **Prueba** siempre en local antes de desplegar
5. **Monitorea** el uso para no exceder límites gratuitos

---

## 🚀 Próximos Pasos (Cuando estés listo)

1. Terminar todas las funcionalidades
2. Probar exhaustivamente en local
3. Implementar autenticación
4. Configurar seguridad
5. Desplegar a Firebase Hosting
6. Capacitar a usuarias
7. ¡Lanzar! 🎉

---

**Fecha de creación:** 2025-11-22
**Última actualización:** 2025-11-22
**Versión:** 1.0

---

## 💡 Tip Final

**No te apures con el despliegue.** Es mejor:
1. Terminar todas las funcionalidades
2. Probar bien en local
3. Luego desplegar con confianza

La aplicación funciona perfectamente en local mientras desarrollas.
El despliegue es solo el último paso cuando todo esté listo.

**¡Éxito con tu proyecto!** 🎉
