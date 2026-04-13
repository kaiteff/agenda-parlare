# 🚀 Plan de Implementación - Agenda Parlare Multi-Usuario

**Fecha de Creación:** 24 de Noviembre 2025  
**Estado:** APROBADO  
**Enfoque:** Híbrido Modular (preparado para POO futura)

---

## 📊 Contexto del Proyecto

### Usuarios del Sistema
1. **Diana** (Administrador/Terapeuta Principal)
   - 40+ pacientes activos
   - Acceso total al sistema
   - Puede ver pacientes de todos

2. **Sam** (Terapeuta Ayudante)
   - 20+ pacientes activos
   - Solo ve sus propios pacientes
   - Permisos limitados

3. **Recepcionista** (Gestión Administrativa)
   - No tiene pacientes propios
   - Agenda para Diana y Sam
   - Gestiona pagos
   - Solo edita lo que ella creó

4. **Prueba** (Modo Testing)
   - Para validación antes de producción

### Integraciones Requeridas
- ✅ Google Calendar (sincronización bidireccional)
- ✅ Google Drive (carpetas por paciente)
- ✅ Google Docs (historial automático)
- ✅ Google Sheets (consolidado de pagos)

---

## 🎯 Fases de Implementación

### **FASE 1: Sistema de Usuarios y Roles** 
**Duración:** 3-4 días  
**Prioridad:** CRÍTICA

#### Objetivos
- [ ] Implementar autenticación con roles
- [ ] Sistema de permisos granular
- [ ] UI adaptativa según usuario
- [ ] Migración de datos existentes

#### Tareas Detalladas

**1.1 Estructura de Datos**
```javascript
// Firebase: Nueva colección "users"
{
    uid: "firebase-auth-uid",
    email: "diana@parlare.com",
    role: "admin",
    therapist: "diana",
    name: "Diana",
    displayName: "Diana (Jefa)",
    googleCalendarId: "diana@parlare.com",
    createdAt: timestamp,
    isActive: true
}

// Roles disponibles
const ROLES = {
    admin: {
        level: 3,
        permissions: [
            'view_all_patients',
            'view_all_appointments',
            'create_patient',
            'edit_any_patient',
            'delete_patient',
            'create_appointment',
            'edit_any_appointment',
            'delete_appointment',
            'view_all_payments',
            'edit_payments',
            'view_reports',
            'manage_users',
            'export_data'
        ]
    },
    therapist: {
        level: 2,
        permissions: [
            'view_own_patients',
            'create_patient',
            'edit_own_patient',
            'create_appointment',
            'edit_own_appointment',
            'view_own_payments',
            'edit_own_payments'
        ]
    },
    receptionist: {
        level: 1,
        permissions: [
            'view_all_patients',
            'view_all_appointments',
            'create_patient',
            'edit_patient',
            'create_appointment',
            'edit_own_appointment', // Solo lo que ella creó
            'view_all_payments',
            'edit_payments',
            'view_reports',
            'export_data'
        ]
    }
};
```

**1.2 Sistema de Permisos**
```javascript
// js/managers/AuthManager.js
export const AuthManager = {
    currentUser: null,
    
    async login(email, password) {
        const result = await loginUser(email, password);
        if (result.success) {
            // Obtener datos de usuario
            const userData = await this.getUserData(result.user.uid);
            this.currentUser = userData;
            return { success: true, user: userData };
        }
        return result;
    },
    
    can(permission) {
        if (!this.currentUser) return false;
        const role = ROLES[this.currentUser.role];
        return role.permissions.includes(permission);
    },
    
    isAdmin() {
        return this.currentUser?.role === 'admin';
    },
    
    isTherapist() {
        return this.currentUser?.role === 'therapist';
    },
    
    isReceptionist() {
        return this.currentUser?.role === 'receptionist';
    },
    
    canEditItem(item) {
        if (this.isAdmin()) return true;
        if (this.isTherapist()) {
            return item.therapist === this.currentUser.therapist;
        }
        if (this.isReceptionist()) {
            return item.createdBy === this.currentUser.email;
        }
        return false;
    }
};
```

**1.3 UI Adaptativa**
```javascript
// Mostrar/ocultar elementos según permisos
function renderPatientActions(patient) {
    return `
        ${AuthManager.can('edit_any_patient') || 
          (AuthManager.can('edit_own_patient') && AuthManager.canEditItem(patient)) ?
            '<button onclick="editPatient()">Editar</button>' : ''}
        
        ${AuthManager.can('delete_patient') ?
            '<button onclick="deletePatient()">Eliminar</button>' : ''}
    `;
}
```

---

### **FASE 2: Multi-Terapeuta**
**Duración:** 2-3 días  
**Prioridad:** ALTA

#### Objetivos
- [ ] Separar pacientes por terapeuta
- [ ] Filtros por terapeuta en UI
- [ ] Selector de terapeuta (solo admin/recepcionista)
- [ ] Migración de datos existentes

#### Tareas Detalladas

**2.1 Actualizar Estructura de Datos**
```javascript
// Agregar campo "therapist" a patientProfiles
{
    name: "Juan Pérez",
    therapist: "diana", // NUEVO
    assignedBy: "recepcion@parlare.com", // NUEVO
    assignedAt: timestamp, // NUEVO
    // ... resto de campos
}

// Agregar campo "therapist" a appointments
{
    name: "Juan Pérez",
    therapist: "diana", // NUEVO
    createdBy: "recepcion@parlare.com", // NUEVO
    // ... resto de campos
}
```

**2.2 Script de Migración**
```javascript
// migrate_add_therapist.js
async function migrateExistingData() {
    // 1. Migrar pacientes existentes (asignar a Diana por defecto)
    const patients = await getDocs(collection(db, 'patientProfiles'));
    for (const doc of patients.docs) {
        await updateDoc(doc.ref, {
            therapist: 'diana',
            assignedBy: 'system',
            assignedAt: serverTimestamp()
        });
    }
    
    // 2. Migrar citas existentes
    const appointments = await getDocs(collection(db, 'patientsData'));
    for (const doc of appointments.docs) {
        await updateDoc(doc.ref, {
            therapist: 'diana',
            createdBy: 'system'
        });
    }
    
    console.log('✅ Migración completada');
}
```

**2.3 Selector de Terapeuta en UI**
```javascript
// Solo visible para admin y recepcionista
function renderTherapistSelector() {
    if (!AuthManager.can('view_all_patients')) {
        return ''; // Terapeutas no ven el selector
    }
    
    return `
        <div class="flex items-center gap-3 mb-4">
            <label class="text-sm font-semibold text-gray-700">Ver pacientes de:</label>
            <select id="therapistFilter" class="px-4 py-2 border rounded-lg">
                <option value="all">Todos</option>
                <option value="diana">Diana</option>
                <option value="sam">Sam</option>
            </select>
        </div>
    `;
}
```

**2.4 Filtros Actualizados**
```javascript
// PatientFilters.js
export const PatientFilters = {
    getByTherapist(therapist) {
        if (therapist === 'all') {
            return patientProfiles.filter(p => p.isActive);
        }
        return patientProfiles.filter(p => 
            p.isActive && p.therapist === therapist
        );
    },
    
    getTodayByTherapist(therapist) {
        const today = this.getToday();
        if (therapist === 'all') return today;
        return today.filter(p => p.therapist === therapist);
    }
};
```

---

### **FASE 3: Integración Google Calendar**
**Duración:** 2-3 días  
**Prioridad:** ALTA

#### Objetivos
- [ ] Sincronizar citas al crear
- [ ] Sincronizar citas al editar
- [ ] Sincronizar citas al eliminar
- [ ] Sincronizar al reagendar
- [ ] Colores por terapeuta

#### Recordatorios
⚠️ **PREGUNTAR A DIANA:**
- ¿Qué emails usan para Google Calendar?
- ¿Calendarios separados o compartido?
- ¿Mantener eventos existentes?

#### Tareas Detalladas

**3.1 Configuración**
```javascript
// js/integrations/GoogleCalendar.js
export const GoogleCalendarIntegration = {
    async init() {
        await gapi.load('client:auth2', async () => {
            await gapi.client.init({
                apiKey: 'TU_API_KEY',
                clientId: 'TU_CLIENT_ID',
                discoveryDocs: ['https://www.googleapis.com/discovery/v1/apis/calendar/v3/rest'],
                scope: 'https://www.googleapis.com/auth/calendar'
            });
        });
    },
    
    async createEvent(appointment) {
        const therapistCalendar = this.getTherapistCalendar(appointment.therapist);
        
        const event = {
            summary: `Sesión - ${appointment.name}`,
            description: `Paciente: ${appointment.name}\nCosto: $${appointment.cost}`,
            start: {
                dateTime: new Date(appointment.date).toISOString(),
                timeZone: 'America/Mexico_City'
            },
            end: {
                dateTime: new Date(new Date(appointment.date).getTime() + 3600000).toISOString(),
                timeZone: 'America/Mexico_City'
            },
            colorId: this.getTherapistColor(appointment.therapist),
            reminders: {
                useDefault: false,
                overrides: [
                    { method: 'popup', minutes: 30 },
                    { method: 'email', minutes: 1440 } // 1 día antes
                ]
            }
        };
        
        const response = await gapi.client.calendar.events.insert({
            calendarId: therapistCalendar,
            resource: event
        });
        
        return response.result.id;
    },
    
    async updateEvent(eventId, appointment) {
        const therapistCalendar = this.getTherapistCalendar(appointment.therapist);
        
        await gapi.client.calendar.events.patch({
            calendarId: therapistCalendar,
            eventId: eventId,
            resource: {
                start: {
                    dateTime: new Date(appointment.date).toISOString(),
                    timeZone: 'America/Mexico_City'
                },
                end: {
                    dateTime: new Date(new Date(appointment.date).getTime() + 3600000).toISOString(),
                    timeZone: 'America/Mexico_City'
                }
            }
        });
    },
    
    async deleteEvent(eventId, therapist) {
        const therapistCalendar = this.getTherapistCalendar(therapist);
        
        await gapi.client.calendar.events.delete({
            calendarId: therapistCalendar,
            eventId: eventId
        });
    },
    
    getTherapistCalendar(therapist) {
        const calendars = {
            diana: 'diana@parlare.com',
            sam: 'sam@parlare.com'
        };
        return calendars[therapist];
    },
    
    getTherapistColor(therapist) {
        const colors = {
            diana: '11', // Rojo
            sam: '7'     // Turquesa
        };
        return colors[therapist];
    }
};
```

**3.2 Integrar en AppointmentService**
```javascript
// services/appointmentService.js
export async function createAppointment(data, existingAppointments) {
    // ... validaciones existentes ...
    
    // Crear en Firebase
    const docRef = await addDoc(collection(db, collectionPath), appointmentData);
    
    // NUEVO: Crear en Google Calendar
    try {
        const eventId = await GoogleCalendarIntegration.createEvent({
            ...appointmentData,
            id: docRef.id
        });
        
        // Guardar ID del evento
        await updateDoc(docRef, {
            googleCalendarEventId: eventId
        });
    } catch (error) {
        console.error('Error al crear evento en Calendar:', error);
        // No fallar la creación si Calendar falla
    }
    
    return { success: true, id: docRef.id };
}

export async function updateAppointment(id, data) {
    // ... código existente ...
    
    // NUEVO: Actualizar en Google Calendar
    if (data.googleCalendarEventId) {
        try {
            await GoogleCalendarIntegration.updateEvent(
                data.googleCalendarEventId,
                data
            );
        } catch (error) {
            console.error('Error al actualizar evento en Calendar:', error);
        }
    }
}
```

---

### **FASE 4: Integración Google Drive**
**Duración:** 3-4 días  
**Prioridad:** MEDIA

#### Objetivos
- [ ] Crear carpeta por paciente
- [ ] Link a carpeta en modal
- [ ] Documento de historial automático
- [ ] Archivo consolidado de pagos

#### Tareas Detalladas

**4.1 Configuración Google Drive**
```javascript
// js/integrations/GoogleDrive.js
export const GoogleDriveIntegration = {
    PARENT_FOLDER_ID: 'ID_CARPETA_RAIZ', // Configurar
    
    async createPatientFolder(patient) {
        const folder = await gapi.client.drive.files.create({
            resource: {
                name: `Paciente - ${patient.name}`,
                mimeType: 'application/vnd.google-apps.folder',
                parents: [this.PARENT_FOLDER_ID]
            },
            fields: 'id, webViewLink'
        });
        
        // Crear subcarpetas
        await this.createSubfolders(folder.result.id);
        
        return folder.result;
    },
    
    async createSubfolders(parentId) {
        const subfolders = ['Consentimientos', 'Estudios', 'Notas de Sesión'];
        
        for (const name of subfolders) {
            await gapi.client.drive.files.create({
                resource: {
                    name: name,
                    mimeType: 'application/vnd.google-apps.folder',
                    parents: [parentId]
                }
            });
        }
    }
};
```

**4.2 Integrar en PatientService**
```javascript
// services/patientService.js
export async function createPatientProfile(fullName, firstName, lastName, therapist) {
    // Crear perfil en Firebase
    const docRef = await addDoc(collection(db, patientProfilesPath), {
        name: fullName,
        therapist: therapist,
        // ... resto de campos
    });
    
    // NUEVO: Crear carpeta en Drive
    try {
        const folder = await GoogleDriveIntegration.createPatientFolder({
            name: fullName,
            id: docRef.id
        });
        
        await updateDoc(docRef, {
            driveFolderUrl: folder.webViewLink,
            driveFolderId: folder.id
        });
    } catch (error) {
        console.error('Error al crear carpeta en Drive:', error);
    }
    
    return { success: true, id: docRef.id };
}
```

---

### **FASE 5: Testing y Refinamiento**
**Duración:** 2-3 días  
**Prioridad:** ALTA

#### Objetivos
- [ ] Testing con Diana
- [ ] Testing con Sam
- [ ] Testing con Recepcionista
- [ ] Ajustes de UI/UX
- [ ] Documentación de usuario
- [ ] Capacitación

---

## 📅 Cronograma Estimado

| Fase | Duración | Inicio | Fin |
|------|----------|--------|-----|
| Fase 1: Usuarios y Roles | 3-4 días | Día 1 | Día 4 |
| Fase 2: Multi-Terapeuta | 2-3 días | Día 5 | Día 7 |
| Fase 3: Google Calendar | 2-3 días | Día 8 | Día 10 |
| Fase 4: Google Drive | 3-4 días | Día 11 | Día 14 |
| Fase 5: Testing | 2-3 días | Día 15 | Día 17 |

**Total: 12-17 días de desarrollo**

---

## 🎯 Criterios de Éxito

### Fase 1
- ✅ Diana puede ver todos los pacientes
- ✅ Sam solo ve sus pacientes
- ✅ Recepcionista puede agendar para ambas
- ✅ Permisos funcionan correctamente

### Fase 2
- ✅ Pacientes separados por terapeuta
- ✅ Filtros funcionan correctamente
- ✅ Datos migrados sin pérdida

### Fase 3
- ✅ Citas se crean en Google Calendar
- ✅ Reagendar actualiza Calendar
- ✅ Colores diferentes por terapeuta

### Fase 4
- ✅ Carpeta creada por paciente
- ✅ Link funciona en modal
- ✅ Archivo de pagos se actualiza

### Fase 5
- ✅ Usuarios capacitados
- ✅ Sin bugs críticos
- ✅ Documentación completa

---

## ⚠️ Riesgos y Mitigaciones

| Riesgo | Probabilidad | Impacto | Mitigación |
|--------|--------------|---------|------------|
| Pérdida de datos en migración | Media | Alto | Backup completo antes de migrar |
| Problemas con Google APIs | Media | Medio | Implementar fallbacks |
| Confusión de usuarios | Alta | Medio | Capacitación exhaustiva |
| Permisos mal configurados | Baja | Alto | Testing riguroso |

---

## 📝 Notas Importantes

### Preparación para POO Futura
- Código modular facilita conversión
- Estado centralizado = fácil de convertir en clases
- Métodos organizados = métodos de clase directos

### Cuándo Migrar a POO
- 100+ pacientes por terapeuta
- 5+ terapeutas
- Otro desarrollador en el equipo
- Reportes muy complejos

---

## 🚀 Próximos Pasos Inmediatos

1. **Aprobar este plan**
2. **Hacer backup completo**
3. **Crear rama Git: `feature/multi-user-system`**
4. **Comenzar Fase 1**

---

**Última actualización:** 24 de Noviembre 2025  
**Aprobado por:** [Pendiente]  
**Fecha de inicio estimada:** [Por definir]
