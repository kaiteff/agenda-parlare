# Guía de Seguridad para Firebase Firestore

Esta guía te explicará paso a paso cómo proteger tu base de datos para que **solo tú** (usuario autenticado) puedas ver y modificar la información.

## 1. ¿Por qué hacer esto?

Actualmente, es probable que tus reglas estén en "modo de prueba", lo que significa que cualquiera con la dirección de tu base de datos podría leer o borrar datos. Al activar estas reglas, cerramos la puerta con llave y solo tu usuario (con email y contraseña) tendrá la llave.

## 2. Pasos para Configurar

1. Ve a la **Consola de Firebase**: [https://console.firebase.google.com/](https://console.firebase.google.com/)
2. Selecciona tu proyecto (**agenda-parlare** o el nombre que le hayas puesto).
3. En el menú de la izquierda, haz clic en **Firestore Database**.
4. En la parte superior, busca la pestaña que dice **Reglas** (o **Rules**).
5. Verás un editor de código. Borra todo lo que hay ahí y pega el siguiente código:

```javascript
rules_version = '2';

service cloud.firestore {
  match /databases/{database}/documents {
    
    // Regla Global: Bloquear todo por defecto
    match /{document=**} {
      allow read, write: if false;
    }

    // Regla Específica: Permitir acceso SOLO a usuarios autenticados
    // Esto aplica para TODAS las colecciones (citas, pacientes, notificaciones)
    match /{path=**} {
      allow read, write: if request.auth != null;
    }
  }
}
```

## 3. ¿Qué hace este código?

* `rules_version = '2';`: Usa la versión más moderna de las reglas.
* `allow read, write: if request.auth != null;`: Esta es la línea mágica. Dice: "Permite leer o escribir datos **SI Y SOLO SI** la petición viene de alguien que ha iniciado sesión (`request.auth` no es nulo)".

## 4. Guardar Cambios

Una vez pegado el código, haz clic en el botón **Publicar** (Publish) que aparecerá arriba a la derecha.

## 5. Verificación

1. Vuelve a tu aplicación (localhost).
2. Asegúrate de haber iniciado sesión.
3. Intenta crear o modificar una cita. Debería funcionar perfectamente.
4. (Prueba opcional): Si abres una ventana de incógnito y tratas de acceder sin login (si tuvieras una forma de hacerlo), la base de datos rechazaría la conexión.

¡Listo! Tu agenda ahora es privada y segura.
