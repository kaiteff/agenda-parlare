// app.js - Punto de entrada principal de la aplicación

import { initializeFirebase } from './firebase.js';
import { initCalendar } from './calendar.js';
import { initNotifications } from './notifications.js';
import { initPatients } from './patients.js';

// Inicializar aplicación
console.log("🚀 Iniciando Agenda Parlare...");

initializeFirebase((user) => {
    console.log("✅ Firebase inicializado, usuario:", user.uid);

    // Inicializar módulos con manejo de errores
    try {
        console.log("🚀 Inicializando Patients...");
        initPatients();
    } catch (e) { console.error("❌ Error initPatients:", e); }

    try {
        console.log("🚀 Inicializando Calendar...");
        initCalendar();
    } catch (e) { console.error("❌ Error initCalendar:", e); }

    try {
        console.log("🚀 Inicializando Notifications...");
        initNotifications();
    } catch (e) { console.error("❌ Error initNotifications:", e); }

    console.log("✅ Todos los módulos inicializados");
});
