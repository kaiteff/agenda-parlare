# 🎯 Plan de Migración: Enfoque Híbrido Modular

**Fecha de Decisión:** 24 de Noviembre 2025  
**Estado:** APROBADO - Para implementación futura  
**Prioridad:** Media-Alta

---

## 📋 Decisión Estratégica

**IMPORTANTE:** Este proyecto migrará gradualmente a un **enfoque híbrido modular** que combina:
- ✅ Organización modular clara
- ✅ Encapsulación de estado
- ✅ Métodos cohesivos
- ❌ Sin POO pura (evitar complejidad innecesaria)
- ❌ Sin clases complejas (mantener simplicidad con Firebase)

---

## 🏗️ Arquitectura Objetivo

### Estructura de Archivos
```
js/
├── managers/
│   ├── PatientManager.js      # Gestión completa de pacientes
│   ├── CalendarManager.js     # Gestión del calendario
│   └── NotificationManager.js # Gestión de notificaciones
├── services/
│   ├── appointmentService.js  # Ya existe ✅
│   └── patientService.js      # Ya existe ✅
├── utils/
│   ├── dateUtils.js           # Ya existe ✅
│   └── validators.js          # Ya existe ✅
└── app.js                     # Punto de entrada
```

---

## 💡 Ejemplo Concreto: PatientManager

### ❌ Código Actual (Funcional Disperso)
```javascript
// patients.js - 973 líneas con todo mezclado

let selectedPatient = null;
let viewMode = 'today';
let patientsList, patientsHeader, patientHistoryModal;

function getTodayPatients() { /* ... */ }
function getTomorrowPatients() { /* ... */ }
function renderPatientsList() { /* ... */ }
function openPatientHistoryModal(patient) { /* ... */ }
function deactivatePatient(id, name) { /* ... */ }
// ... 50+ funciones más
```

### ✅ Código Objetivo (Híbrido Modular)

#### 1. **PatientManager.js** (Punto de Entrada)
```javascript
// js/managers/PatientManager.js

import { PatientState } from './patient/PatientState.js';
import { PatientFilters } from './patient/PatientFilters.js';
import { PatientUI } from './patient/PatientUI.js';
import { PatientActions } from './patient/PatientActions.js';
import { PatientModals } from './patient/PatientModals.js';

/**
 * Manager principal para gestión de pacientes
 * Coordina todos los submódulos y expone API pública
 */
export const PatientManager = {
    // Estado centralizado
    state: PatientState,
    
    // Submódulos organizados por responsabilidad
    filters: PatientFilters,
    ui: PatientUI,
    actions: PatientActions,
    modals: PatientModals,
    
    /**
     * Inicializa el sistema de pacientes
     */
    init() {
        console.log("🏥 Inicializando PatientManager...");
        this.state.initDOM();
        this.ui.setupEventListeners();
        this.ui.setupDataListeners();
        console.log("✅ PatientManager inicializado");
    },
    
    /**
     * API pública para otros módulos
     */
    api: {
        getPatient: (id) => PatientState.patients.find(p => p.id === id),
        getActivePatients: () => PatientState.patients.filter(p => p.isActive),
        getTodayCount: () => PatientFilters.getToday().length,
        refreshList: () => PatientUI.renderList()
    }
};

// Exponer funciones necesarias globalmente (para HTML)
window.PatientManager = PatientManager;
window.openPatientHistory = (patient) => PatientManager.modals.openHistory(patient);
window.closePatientHistory = () => PatientManager.modals.closeHistory();
```

#### 2. **PatientState.js** (Estado Centralizado)
```javascript
// js/managers/patient/PatientState.js

/**
 * Estado centralizado del módulo de pacientes
 * Todas las variables de estado viven aquí
 */
export const PatientState = {
    // Datos
    patients: [],
    appointments: [],
    
    // UI State
    selectedPatient: null,
    viewMode: 'today', // 'today' | 'tomorrow' | 'all'
    
    // Referencias DOM
    dom: {
        patientsList: null,
        patientsHeader: null,
        patientHistoryModal: null,
        inactivePatientsModal: null,
        newPatientModal: null,
        // ... más referencias
    },
    
    /**
     * Inicializa referencias DOM
     */
    initDOM() {
        this.dom.patientsList = document.getElementById('patientsList');
        this.dom.patientsHeader = document.getElementById('patientsHeader');
        this.dom.patientHistoryModal = document.getElementById('patientHistoryModal');
        // ... más inicializaciones
    },
    
    /**
     * Actualiza lista de pacientes
     */
    updatePatients(newPatients) {
        this.patients = newPatients;
        console.log(`📊 ${newPatients.length} pacientes cargados`);
    },
    
    /**
     * Cambia el modo de vista
     */
    setViewMode(mode) {
        if (!['today', 'tomorrow', 'all'].includes(mode)) {
            console.error(`❌ Modo inválido: ${mode}`);
            return;
        }
        this.viewMode = mode;
        console.log(`🔄 Modo cambiado a: ${mode}`);
    }
};
```

#### 3. **PatientFilters.js** (Lógica de Filtrado)
```javascript
// js/managers/patient/PatientFilters.js

import { patientsData } from '../../firebase.js';

/**
 * Funciones puras de filtrado
 * No modifican estado, solo procesan datos
 */
export const PatientFilters = {
    /**
     * Obtiene pacientes con citas hoy
     * @returns {Array} Lista de pacientes con cita hoy
     */
    getToday() {
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        const tomorrow = new Date(today);
        tomorrow.setDate(tomorrow.getDate() + 1);

        const todayAppointments = patientsData.filter(apt => {
            const aptDate = new Date(apt.date);
            return aptDate >= today && 
                   aptDate < tomorrow && 
                   !apt.isCancelled;
        });

        return this._groupByPatient(todayAppointments);
    },
    
    /**
     * Obtiene pacientes con citas mañana
     * @returns {Array} Lista de pacientes con cita mañana
     */
    getTomorrow() {
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        const tomorrow = new Date(today);
        tomorrow.setDate(tomorrow.getDate() + 1);
        const dayAfter = new Date(tomorrow);
        dayAfter.setDate(dayAfter.getDate() + 1);

        const tomorrowAppointments = patientsData.filter(apt => {
            const aptDate = new Date(apt.date);
            return aptDate >= tomorrow && 
                   aptDate < dayAfter && 
                   !apt.isCancelled;
        });

        return this._groupByPatient(tomorrowAppointments);
    },
    
    /**
     * Obtiene pagos pendientes de un paciente
     * @param {string} patientName - Nombre del paciente
     * @returns {Array} Lista de citas con pago pendiente
     */
    getPendingPayments(patientName) {
        const today = new Date();
        today.setHours(0, 0, 0, 0);

        return patientsData.filter(apt => {
            const aptDate = new Date(apt.date);
            return apt.name === patientName &&
                   aptDate < today &&
                   !apt.isPaid &&
                   !apt.isCancelled;
        }).sort((a, b) => new Date(b.date) - new Date(a.date));
    },
    
    /**
     * Agrupa citas por paciente (primera cita del día)
     * @private
     */
    _groupByPatient(appointments) {
        const patientsMap = new Map();
        
        appointments.forEach(apt => {
            const existing = patientsMap.get(apt.name);
            const aptTime = new Date(apt.date);

            if (!existing || aptTime < existing.appointmentTime) {
                patientsMap.set(apt.name, {
                    name: apt.name,
                    appointmentTime: aptTime,
                    confirmed: apt.confirmed || false
                });
            }
        });

        return Array.from(patientsMap.values())
            .sort((a, b) => a.appointmentTime - b.appointmentTime);
    }
};
```

#### 4. **PatientUI.js** (Renderizado)
```javascript
// js/managers/patient/PatientUI.js

import { PatientState } from './PatientState.js';
import { PatientFilters } from './PatientFilters.js';
import { patientProfiles, patientsData } from '../../firebase.js';

/**
 * Gestión de UI y renderizado
 * Responsable de actualizar el DOM
 */
export const PatientUI = {
    /**
     * Renderiza la lista de pacientes según el modo actual
     */
    renderList() {
        const { dom, viewMode } = PatientState;
        if (!dom.patientsList) return;

        const activePatients = patientProfiles.filter(p => p.isActive !== false);
        let patientsToShow;

        // Aplicar filtro según modo
        switch(viewMode) {
            case 'today':
                patientsToShow = this._filterTodayPatients(activePatients);
                break;
            case 'tomorrow':
                patientsToShow = this._filterTomorrowPatients(activePatients);
                break;
            default:
                patientsToShow = activePatients;
        }

        // Agregar totales de pagos
        const patientsWithTotals = this._addPaymentTotals(patientsToShow);
        
        // Ordenar
        this._sortPatients(patientsWithTotals, viewMode);
        
        // Actualizar header
        this._updateHeader(patientsWithTotals.length);
        
        // Renderizar lista
        this._renderPatientItems(patientsWithTotals);
    },
    
    /**
     * Actualiza el header con contadores
     * @private
     */
    _updateHeader(count) {
        const { dom, viewMode } = PatientState;
        if (!dom.patientsHeader) return;

        const totalActive = patientProfiles.filter(p => p.isActive !== false).length;
        const todayCount = PatientFilters.getToday().length;
        const tomorrowCount = PatientFilters.getTomorrow().length;

        const modeLabel = {
            'today': `HOY (${count})`,
            'tomorrow': `MAÑANA (${count})`,
            'all': `ACTIVOS (${count})`
        }[viewMode];

        dom.patientsHeader.innerHTML = `
            <div class="flex items-center justify-between mb-2">
                <div class="flex items-center gap-2">
                    <span class="text-xs font-bold text-gray-600">${modeLabel}</span>
                    <button id="btnNewPatient" class="text-xs bg-green-100 text-green-700 px-2 py-0.5 rounded hover:bg-green-200 transition-colors flex items-center gap-1">
                        <svg class="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4"></path>
                        </svg>
                        Nuevo
                    </button>
                </div>
                <div class="flex gap-1">
                    <button id="btnViewToday" class="text-xs px-2 py-1 rounded transition-colors ${viewMode === 'today' ? 'bg-blue-600 text-white' : 'bg-blue-50 text-blue-600 hover:bg-blue-100'}">
                        Hoy (${todayCount})
                    </button>
                    <button id="btnViewTomorrow" class="text-xs px-2 py-1 rounded transition-colors ${viewMode === 'tomorrow' ? 'bg-indigo-600 text-white' : 'bg-indigo-50 text-indigo-600 hover:bg-indigo-100'}">
                        Mañana (${tomorrowCount})
                    </button>
                    <button id="btnViewAll" class="text-xs px-2 py-1 rounded transition-colors ${viewMode === 'all' ? 'bg-gray-600 text-white' : 'bg-gray-50 text-gray-600 hover:bg-gray-100'}">
                        Todos (${totalActive})
                    </button>
                </div>
            </div>
        `;

        // Attach event listeners
        this._attachHeaderListeners();
    },
    
    /**
     * Adjunta listeners a los botones del header
     * @private
     */
    _attachHeaderListeners() {
        document.getElementById('btnViewToday')?.addEventListener('click', () => {
            PatientState.setViewMode('today');
            this.renderList();
        });
        
        document.getElementById('btnViewTomorrow')?.addEventListener('click', () => {
            PatientState.setViewMode('tomorrow');
            this.renderList();
        });
        
        document.getElementById('btnViewAll')?.addEventListener('click', () => {
            PatientState.setViewMode('all');
            this.renderList();
        });
        
        document.getElementById('btnNewPatient')?.addEventListener('click', () => {
            window.PatientManager.modals.openNewPatient();
        });
    },
    
    /**
     * Configura listeners de eventos
     */
    setupEventListeners() {
        const { dom } = PatientState;
        
        if (dom.closeNewPatientModalBtn) {
            dom.closeNewPatientModalBtn.onclick = () => {
                dom.newPatientModal.classList.add('hidden');
            };
        }
        
        if (dom.saveNewPatientBtn) {
            dom.saveNewPatientBtn.onclick = () => {
                window.PatientManager.actions.saveNewPatient();
            };
        }
        
        const viewInactiveBtn = document.getElementById('viewInactivePatientsBtn');
        if (viewInactiveBtn) {
            viewInactiveBtn.onclick = () => {
                window.PatientManager.modals.openInactive();
            };
        }
    },
    
    /**
     * Configura listeners de datos (Firebase)
     */
    setupDataListeners() {
        // Implementación similar a la actual
        console.log("🔄 Listeners de datos configurados");
    },
    
    // Métodos privados de ayuda
    _filterTodayPatients(activePatients) { /* ... */ },
    _filterTomorrowPatients(activePatients) { /* ... */ },
    _addPaymentTotals(patients) { /* ... */ },
    _sortPatients(patients, mode) { /* ... */ },
    _renderPatientItems(patients) { /* ... */ }
};
```

#### 5. **PatientActions.js** (Acciones CRUD)
```javascript
// js/managers/patient/PatientActions.js

import { db, updateDoc, doc, collectionPath } from '../../firebase.js';
import { createPatientProfile } from '../../services/patientService.js';
import { PatientState } from './PatientState.js';
import { PatientUI } from './PatientUI.js';

/**
 * Acciones del usuario sobre pacientes
 * Operaciones CRUD y lógica de negocio
 */
export const PatientActions = {
    /**
     * Marca un pago como pagado
     * @param {string} appointmentId - ID de la cita
     */
    async markAsPaid(appointmentId) {
        const button = event?.target;
        
        try {
            if (button) {
                button.textContent = '⏳ Guardando...';
                button.disabled = true;
            }

            await updateDoc(doc(db, collectionPath, appointmentId), {
                isPaid: true
            });

            if (button) {
                button.textContent = '✓ Pagado!';
                button.classList.remove('bg-green-600', 'hover:bg-green-700');
                button.classList.add('bg-green-700', 'cursor-default');
            }

            // Actualizar UI si el modal está abierto
            setTimeout(() => {
                if (PatientState.selectedPatient && 
                    !PatientState.dom.patientHistoryModal.classList.contains('hidden')) {
                    window.PatientManager.modals.openHistory(PatientState.selectedPatient);
                }
            }, 300);

        } catch (error) {
            console.error("❌ Error al marcar como pagado:", error);
            alert("Error al marcar como pagado: " + error.message);
            
            if (button) {
                button.textContent = '✓ Pagado';
                button.disabled = false;
            }
        }
    },
    
    /**
     * Guarda un nuevo paciente
     */
    async saveNewPatient() {
        const { dom } = PatientState;
        const firstName = dom.newPatientFirstName.value.trim();
        const lastName = dom.newPatientLastName.value.trim();

        if (!firstName || !lastName) {
            alert("Por favor ingrese nombre y apellidos.");
            return;
        }

        const fullName = `${firstName} ${lastName}`.trim();

        try {
            dom.saveNewPatientBtn.disabled = true;
            dom.saveNewPatientBtn.textContent = "Guardando...";

            const result = await createPatientProfile(fullName, firstName, lastName);

            if (result.success) {
                alert(`Paciente "${fullName}" creado exitosamente.`);
                dom.newPatientModal.classList.add('hidden');
                
                if (PatientState.viewMode !== 'all') {
                    PatientState.setViewMode('all');
                    PatientUI.renderList();
                }
            } else {
                alert("Error al crear paciente: " + result.error);
            }
        } catch (error) {
            console.error("❌ Error:", error);
            alert("Error: " + error.message);
        } finally {
            dom.saveNewPatientBtn.disabled = false;
            dom.saveNewPatientBtn.textContent = "Crear Paciente";
        }
    },
    
    /**
     * Desactiva un paciente
     * @param {string} profileId - ID del perfil
     * @param {string} patientName - Nombre del paciente
     */
    async deactivatePatient(profileId, patientName) {
        // Implementación similar a la actual
        console.log(`🚫 Desactivando paciente: ${patientName}`);
    },
    
    /**
     * Reactiva un paciente
     * @param {string} profileId - ID del perfil
     * @param {string} patientName - Nombre del paciente
     */
    async reactivatePatient(profileId, patientName) {
        // Implementación similar a la actual
        console.log(`✅ Reactivando paciente: ${patientName}`);
    }
};
```

---

## 📊 Comparación Visual

### Antes (Actual)
```
patients.js (973 líneas)
├── Variables globales dispersas
├── 50+ funciones mezcladas
├── Difícil de navegar
└── Sin organización clara
```

### Después (Objetivo)
```
managers/PatientManager.js (50 líneas)
├── patient/PatientState.js (80 líneas)
├── patient/PatientFilters.js (120 líneas)
├── patient/PatientUI.js (300 líneas)
├── patient/PatientActions.js (250 líneas)
└── patient/PatientModals.js (150 líneas)

Total: ~950 líneas organizadas en 6 archivos
```

---

## 🎯 Beneficios Concretos

### 1. **Mantenibilidad**
```javascript
// ❌ Antes: Buscar entre 973 líneas
// ¿Dónde está la lógica de filtrado de hoy?

// ✅ Después: Saber exactamente dónde buscar
import { PatientFilters } from './patient/PatientFilters.js';
PatientFilters.getToday(); // Aquí está!
```

### 2. **Testing**
```javascript
// ✅ Fácil de testear funciones puras
import { PatientFilters } from './patient/PatientFilters.js';

test('getToday excluye citas canceladas', () => {
    const result = PatientFilters.getToday();
    expect(result.every(p => !p.isCancelled)).toBe(true);
});
```

### 3. **Reutilización**
```javascript
// ✅ Usar en otros módulos
import { PatientManager } from './managers/PatientManager.js';

// En calendar.js:
const todayCount = PatientManager.api.getTodayCount();
console.log(`Hoy hay ${todayCount} pacientes`);
```

### 4. **Colaboración**
```javascript
// ✅ Trabajo en paralelo sin conflictos
// Persona A: Trabaja en PatientUI.js
// Persona B: Trabaja en PatientActions.js
// Sin conflictos de Git!
```

---

## 🚀 Plan de Migración Gradual

### Fase 1: Preparación (1-2 días)
- [ ] Crear estructura de carpetas `managers/patient/`
- [ ] Mover `PatientState.js` (más simple)
- [ ] Probar que todo sigue funcionando

### Fase 2: Filtros (1 día)
- [ ] Migrar `PatientFilters.js`
- [ ] Actualizar imports
- [ ] Probar filtros (Hoy/Mañana/Todos)

### Fase 3: UI (2-3 días)
- [ ] Migrar `PatientUI.js`
- [ ] Actualizar event listeners
- [ ] Probar renderizado completo

### Fase 4: Acciones (2-3 días)
- [ ] Migrar `PatientActions.js`
- [ ] Probar CRUD completo
- [ ] Verificar integración con Firebase

### Fase 5: Modales (1-2 días)
- [ ] Migrar `PatientModals.js`
- [ ] Probar todos los modales
- [ ] Verificar flujos completos

### Fase 6: Integración Final (1 día)
- [ ] Crear `PatientManager.js` principal
- [ ] Eliminar `patients.js` antiguo
- [ ] Testing exhaustivo
- [ ] Documentación

**Total estimado: 8-12 días de trabajo**

---

## ⚠️ Consideraciones Importantes

### 1. **No Romper lo que Funciona**
- Migrar un módulo a la vez
- Probar exhaustivamente después de cada cambio
- Mantener backup de versión funcional

### 2. **Mantener Compatibilidad con Firebase**
- No usar clases complejas para datos
- Mantener objetos planos para Firestore
- Serialización simple

### 3. **Exposición Global Mínima**
```javascript
// Solo exponer lo necesario para HTML
window.PatientManager = {
    openHistory: PatientManager.modals.openHistory,
    closeHistory: PatientManager.modals.closeHistory,
    markAsPaid: PatientManager.actions.markAsPaid
    // No exponer todo el manager
};
```

---

## 📝 Checklist de Migración

Cuando decidas migrar, sigue este checklist:

- [ ] Crear backup completo
- [ ] Crear rama Git nueva (`git checkout -b refactor/patient-manager`)
- [ ] Migrar un módulo
- [ ] Probar funcionalidad
- [ ] Commit incremental
- [ ] Repetir para cada módulo
- [ ] Testing completo
- [ ] Merge a main
- [ ] Eliminar archivos antiguos

---

## 🎓 Recursos de Aprendizaje

Si necesitas refrescar conceptos:
- **Módulos ES6:** https://developer.mozilla.org/es/docs/Web/JavaScript/Guide/Modules
- **Patrones de Diseño:** https://www.patterns.dev/
- **Clean Code JS:** https://github.com/ryanmcdermott/clean-code-javascript

---

## 📌 Nota Final

**Este enfoque híbrido es el camino aprobado para este proyecto.**

Todas las futuras refactorizaciones y nuevas funcionalidades deben seguir este patrón:
- Estado centralizado en módulos `*State.js`
- Lógica pura en módulos `*Filters.js` o `*Utils.js`
- UI en módulos `*UI.js`
- Acciones en módulos `*Actions.js`
- Coordinación en `*Manager.js`

**No usar POO pura con clases complejas.**
**No dispersar estado en variables globales.**
**Sí usar módulos funcionales organizados.**
