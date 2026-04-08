/**
 * SupportVault.js
 * Módulo Administrativo Maestro para Soporte Técnico.
 * Permite purgar por completo pacientes y todas sus citas (incluyendo sync con Google Calendar).
 */

import { db, collectionPath, patientProfilesPath, collection, query, where, getDocs, writeBatch, doc } from '../../firebase.js';
import { PatientState } from '../../managers/patient/PatientState.js';
import { ModalService } from '../../utils/ModalService.js';
import { ToastService } from '../../utils/ToastService.js';
import { GoogleCalendarService } from '../../services/google/GoogleCalendarService.js';
import { updatePatientProfile } from '../../services/patientService.js';

export const SupportVault = {
    isInitialized: false,

    init() {
        if (this.isInitialized) return;
        this.injectHTML();
        this.bindEvents();
        this.isInitialized = true;
    },

    injectHTML() {
        const html = `
        <div id="supportVaultModal" class="hidden fixed inset-0 z-[9999] flex items-center justify-center bg-black bg-opacity-70 p-4 backdrop-blur-sm">
            <div class="bg-gray-900 rounded-xl shadow-2xl w-full max-w-6xl h-[90vh] flex flex-col border border-purple-500/30 overflow-hidden relative">
                
                <!-- Header -->
                <div class="bg-gradient-to-r from-purple-900 to-gray-900 p-6 flex justify-between items-center border-b border-purple-500/50">
                    <div class="flex items-center gap-4">
                        <div class="p-3 bg-purple-500/20 rounded-lg text-purple-400">
                            <svg class="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z"></path></svg>
                        </div>
                        <div>
                            <h2 class="text-2xl font-black text-white tracking-widest uppercase">Bóveda de Soporte</h2>
                            <p class="text-purple-300 text-sm font-medium">Control Absoluto del Sistema - Cuidado con los cambios</p>
                        </div>
                    </div>
                    <button id="closeSupportVaultBtn" class="text-gray-400 hover:text-white transition-colors p-2">
                        <svg class="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"></path></svg>
                    </button>
                </div>

                <!-- Controls -->
                <div class="p-4 bg-gray-800 border-b border-gray-700 flex items-center gap-4">
                    <div class="relative flex-1">
                        <svg class="absolute left-3 top-2.5 w-5 h-5 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"></path></svg>
                        <input type="text" id="vaultSearchInput" placeholder="Buscar paciente por nombre para purgar o editar..." class="w-full pl-10 pr-4 py-2 bg-gray-900 border border-gray-700 rounded-lg text-gray-200 focus:ring-2 focus:ring-purple-500 outline-none">
                    </div>
                    <div class="text-gray-400 text-sm font-medium pr-2">
                        Total: <span id="vaultTotalCount" class="text-white font-bold">0</span> pacientes
                    </div>
                </div>

                <!-- Table Content -->
                <div class="flex-1 overflow-y-auto bg-gray-900 p-0 scroller">
                    <table class="w-full text-left text-sm text-gray-300">
                        <thead class="text-xs text-gray-400 uppercase bg-gray-800 sticky top-0 z-10 shadow-md">
                            <tr>
                                <th class="px-6 py-4">Paciente</th>
                                <th class="px-6 py-4 text-center">Estado</th>
                                <th class="px-6 py-4">Teléfono</th>
                                <th class="px-6 py-4">Notas / Terapeuta</th>
                                <th class="px-6 py-4 text-right">Acción Destructiva</th>
                            </tr>
                        </thead>
                        <tbody id="vaultTableBody" class="divide-y divide-gray-800">
                            <!-- Injected by JS -->
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
        `;
        document.body.insertAdjacentHTML('beforeend', html);
    },

    bindEvents() {
        const openBtn = document.getElementById('openSupportVaultBtn');
        const closeBtn = document.getElementById('closeSupportVaultBtn');
        const searchInput = document.getElementById('vaultSearchInput');

        if (openBtn) openBtn.addEventListener('click', () => this.open());
        if (closeBtn) closeBtn.addEventListener('click', () => this.close());
        
        if (searchInput) {
            searchInput.addEventListener('input', (e) => this.renderTable(e.target.value));
        }
    },

    open() {
        document.getElementById('supportVaultModal').classList.remove('hidden');
        this.renderTable('');
        document.getElementById('vaultSearchInput').value = '';
        document.getElementById('vaultSearchInput').focus();
    },

    close() {
        document.getElementById('supportVaultModal').classList.add('hidden');
    },

    renderTable(filter = '') {
        const tbody = document.getElementById('vaultTableBody');
        const countSpan = document.getElementById('vaultTotalCount');
        const patients = PatientState.patients || [];
        
        const lowerFilter = filter.toLowerCase().trim();
        const filtered = patients.filter(p => p.name.toLowerCase().includes(lowerFilter));
        
        countSpan.textContent = filtered.length;
        tbody.innerHTML = '';

        if (filtered.length === 0) {
            tbody.innerHTML = '<tr><td colspan="5" class="text-center py-8 text-gray-500 uppercase tracking-widest">No hay pacientes encontrados</td></tr>';
            return;
        }

        filtered.sort((a, b) => a.name.localeCompare(b.name)).forEach(p => {
            const tr = document.createElement('tr');
            tr.className = 'hover:bg-gray-800/50 transition-colors group';

            const statusColor = p.isActive === false ? 'bg-red-500' : 'bg-emerald-500';
            const statusText = p.isActive === false ? 'Inactivo' : 'Activo';

            tr.innerHTML = \`
                <td class="px-6 py-4 font-bold text-gray-100 flex items-center gap-3">
                    <div class="w-8 h-8 rounded-full bg-gray-700 flex items-center justify-center text-purple-400">
                        \${p.name.charAt(0).toUpperCase()}
                    </div>
                    \${p.name}
                </td>
                <td class="px-6 py-4 text-center">
                    <span class="inline-flex items-center gap-1.5 py-1 px-2.5 rounded-full text-xs font-medium bg-gray-800 text-gray-300 border border-gray-700">
                        <span class="w-1.5 h-1.5 rounded-full \${statusColor}"></span>
                        \${statusText}
                    </span>
                </td>
                <td class="px-6 py-4 text-gray-400">\${p.phone || '-'}</td>
                <td class="px-6 py-4 text-gray-400">
                    <span class="text-xs uppercase px-2 py-1 bg-gray-800 rounded text-gray-500 font-bold">\${p.therapist || 'Diana'}</span>
                    <div class="mt-1 line-clamp-1 text-xs">\${p.notes || ''}</div>
                </td>
                <td class="px-6 py-4 text-right space-x-2">
                    <button class="edit-btn px-3 py-1.5 bg-gray-800 hover:bg-gray-700 text-blue-400 rounded transition-colors text-xs font-bold uppercase tracking-wider" data-id="\${p.id}">
                        Editar Full
                    </button>
                    <button class="nuke-btn px-3 py-1.5 bg-red-900/30 hover:bg-red-600 text-red-500 hover:text-white rounded transition-colors text-xs font-bold uppercase tracking-wider border border-red-900/50 hover:border-red-500" data-id="\${p.id}">
                        Nuke
                    </button>
                </td>
            \`;

            // EVENT LISTENERS
            tr.querySelector('.nuke-btn').onclick = () => this.nukePatient(p);
            tr.querySelector('.edit-btn').onclick = () => this.deepEditPatient(p);

            tbody.appendChild(tr);
        });
    },

    async nukePatient(patient) {
        const confirm1 = await ModalService.confirm(
            "⚠️ PURGA TOTAL DE PACIENTE",
            \`Estás a punto de borrar todos los rastros de <b>\${patient.name}</b>.<br><br>Esto DESTRUIRÁ su perfil, eliminará TODAS sus citas de la base de datos (pasadas y futuras) y borrará los eventos sincronizados de Google Calendar (Drive).<br><br>¿Estás seguro?\`,
            "SÍ, PURGAR", "Cancelar", "danger"
        );
        if (!confirm1) return;

        const confirm2 = await ModalService.confirm(
            "ÚLTIMA ADVERTENCIA",
            \`¿Confirmas la aniquilación permanente de \${patient.name}?\`,
            "ANIQUILAR", "Cancelar", "danger"
        );
        if (!confirm2) return;

        ToastService.info(\`Iniciando purga de \${patient.name}...\`);

        try {
            // 1. Buscar TODAS sus citas en Firebase (pasadas y futuras)
            const appointmentsQuery = query(collection(db, collectionPath), where("patientId", "==", patient.id));
            const snapshot = await getDocs(appointmentsQuery);
            const appointmentsCount = snapshot.docs.length;
            
            // Backup por nombre por si las viejas no tenían patientId
            const backupQuery = query(collection(db, collectionPath), where("name", "==", patient.name));
            const backupSnapshot = await getDocs(backupQuery);
            
            const allDocsMap = new Map();
            snapshot.docs.forEach(doc => allDocsMap.set(doc.id, doc));
            backupSnapshot.docs.forEach(doc => allDocsMap.set(doc.id, doc));

            ToastService.info(\`Se encontraron \${allDocsMap.size} citas para destruir.\`);

            const batch = writeBatch(db);
            let deletedFromDrive = 0;

            // 2. Iterar y borrar de Google Drive / Calendar
            for (const [id, docSnap] of allDocsMap.entries()) {
                // Borrar de Google Calendar (intenta silenciosamente)
                try {
                    await GoogleCalendarService.deleteEvent(id);
                    deletedFromDrive++;
                } catch (e) {
                    console.warn("No se pudo borrar evento del calendario:", e);
                }
                // Añadir a batch para destruir en Firestore
                batch.delete(docSnap.ref);
            }

            // 3. Destruir perfil de paciente
            const profileRef = doc(db, patientProfilesPath, patient.id);
            batch.delete(profileRef);

            // 4. Ejecutar aniquilación
            await batch.commit();

            ToastService.success(\`Purga Completada: \${patient.name} erradicado. (\${allDocsMap.size} citas eliminadas, \${deletedFromDrive} borradas de Drive/Calendar).\`);
            this.renderTable(document.getElementById('vaultSearchInput').value);

        } catch (error) {
            console.error("Error durante purga:", error);
            ModalService.alert("Error de Purga", "Algo falló durante la aniquilación: " + error.message, "error");
        }
    },

    async deepEditPatient(patient) {
        // Un prompt nativo especial para cambiarle el nombre maestro
        const newName = prompt(\`EDICIÓN PROFUNDA\\nNombre actual: \${patient.name}\\n\\nEscribe el nuevo nombre exacto para reescribir todo su historial:\`, patient.name);
        
        if (!newName || newName.trim() === '' || newName === patient.name) return;

        const confirm = await ModalService.confirm(
            "Renombrar Paciente",
            \`Vas a cambiar el nombre del expediente de "\${patient.name}" a "\${newName}".<br>Esto también actualizará todas sus citas existentes y su perfil. ¿Continuar?\`,
            "Renombrar", "Cancelar"
        );
        if (!confirm) return;

        ToastService.info("Aplicando cirugía de nombre...");

        try {
            // Change Profile
            await updatePatientProfile(patient.id, {
                name: newName,
                firstName: newName.split(' ')[0],
                lastName: newName.split(' ').slice(1).join(' ') || ''
            });

            // Change Appointments Name
            const appointmentsQuery = query(collection(db, collectionPath), where("patientId", "==", patient.id));
            const snapshot = await getDocs(appointmentsQuery);
            
            const backupQuery = query(collection(db, collectionPath), where("name", "==", patient.name));
            const backupSnapshot = await getDocs(backupQuery);
            
            const allDocsMap = new Map();
            snapshot.docs.forEach(doc => allDocsMap.set(doc.id, doc));
            backupSnapshot.docs.forEach(doc => allDocsMap.set(doc.id, doc));
            
            const batch = writeBatch(db);
            allDocsMap.forEach(docSnap => {
                batch.update(docSnap.ref, { name: newName });
            });
            await batch.commit();

            ToastService.success(\`Paciente renombrado exitosamente a \${newName}\`);
            this.renderTable(document.getElementById('vaultSearchInput').value);

        } catch (error) {
            console.error("Error editando profundamente:", error);
            ModalService.alert("Error de Edición", "Hubo un fallo: " + error.message, "error");
        }
    }
};
