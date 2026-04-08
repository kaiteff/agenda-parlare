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
        const btn = document.getElementById('openSupportVaultBtn');
        if (btn) btn.style.display = 'flex';
        this.isInitialized = true;
    },

    injectHTML() {
        const html = `
        <div id="supportVaultModal" class="hidden fixed inset-0 z-[9999] flex items-center justify-center bg-black bg-opacity-70 p-4 backdrop-blur-sm">
            <div class="bg-gray-900 rounded-xl shadow-2xl w-full max-w-6xl h-[90vh] flex flex-col border border-purple-500/30 overflow-hidden relative">
                <div class="bg-gradient-to-r from-purple-900 to-gray-900 p-6 flex justify-between items-center border-b border-purple-500/50">
                    <div class="flex items-center gap-4">
                        <div class="p-3 bg-purple-500/20 rounded-lg text-purple-400">
                            <svg class="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z"></path></svg>
                        </div>
                        <div>
                            <h2 class="text-2xl font-black text-white tracking-widest uppercase">Bóveda de Soporte</h2>
                            <p class="text-purple-300 text-sm font-medium">Control Absoluto del Sistema — Cambios irreversibles</p>
                        </div>
                    </div>
                    <button id="closeSupportVaultBtn" class="text-gray-400 hover:text-white transition-colors p-2">
                        <svg class="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"></path></svg>
                    </button>
                </div>

                <div class="p-4 bg-gray-800 border-b border-gray-700 flex items-center gap-4">
                    <div class="relative flex-1">
                        <svg class="absolute left-3 top-2.5 w-5 h-5 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"></path></svg>
                        <input type="text" id="vaultSearchInput" placeholder="Buscar paciente..." class="w-full pl-10 pr-4 py-2 bg-gray-900 border border-gray-700 rounded-lg text-gray-200 focus:ring-2 focus:ring-purple-500 outline-none">
                    </div>
                    <div class="text-gray-400 text-sm font-medium pr-2">
                        Total: <span id="vaultTotalCount" class="text-white font-bold">0</span> pacientes
                    </div>
                </div>

                <div class="flex-1 overflow-y-auto bg-gray-900 scroller">
                    <table class="w-full text-left text-sm text-gray-300">
                        <thead class="text-xs text-gray-400 uppercase bg-gray-800 sticky top-0 z-10 shadow-md">
                            <tr>
                                <th class="px-6 py-4">Paciente</th>
                                <th class="px-6 py-4 text-center">Estado</th>
                                <th class="px-6 py-4">Teléfono</th>
                                <th class="px-6 py-4">Terapeuta</th>
                                <th class="px-6 py-4 text-right">Acciones</th>
                            </tr>
                        </thead>
                        <tbody id="vaultTableBody" class="divide-y divide-gray-800"></tbody>
                    </table>
                </div>
            </div>
        </div>`;
        document.body.insertAdjacentHTML('beforeend', html);
    },

    bindEvents() {
        document.getElementById('closeSupportVaultBtn')?.addEventListener('click', () => this.close());
        document.getElementById('vaultSearchInput')?.addEventListener('input', (e) => this.renderTable(e.target.value));

        const openBtn = document.getElementById('openSupportVaultBtn');
        if (openBtn) openBtn.addEventListener('click', () => this.open());
    },

    open() {
        document.getElementById('supportVaultModal').classList.remove('hidden');
        document.getElementById('vaultSearchInput').value = '';
        this.renderTable('');
        document.getElementById('vaultSearchInput').focus();
    },

    close() {
        document.getElementById('supportVaultModal').classList.add('hidden');
    },

    renderTable(filter) {
        const tbody = document.getElementById('vaultTableBody');
        const countSpan = document.getElementById('vaultTotalCount');
        if (!tbody || !countSpan) return;

        const patients = PatientState.patients || [];
        const lowerFilter = (filter || '').toLowerCase().trim();
        const filtered = patients.filter(p => p.name.toLowerCase().includes(lowerFilter));

        countSpan.textContent = filtered.length;
        tbody.innerHTML = '';

        if (filtered.length === 0) {
            tbody.innerHTML = '<tr><td colspan="5" class="text-center py-10 text-gray-600 uppercase tracking-widest text-xs">Sin resultados</td></tr>';
            return;
        }

        filtered.sort((a, b) => a.name.localeCompare(b.name)).forEach(p => {
            const tr = document.createElement('tr');
            tr.className = 'hover:bg-gray-800/50 transition-colors';

            const isInactive = p.isActive === false;
            const statusDot = isInactive ? 'bg-red-500' : 'bg-emerald-500';
            const statusText = isInactive ? 'Inactivo' : 'Activo';
            const initial = (p.name || '?').charAt(0).toUpperCase();
            const phone = p.phone || '—';
            const therapist = p.therapist || 'diana';

            tr.innerHTML =
                '<td class="px-6 py-4 font-bold text-gray-100">' +
                    '<div class="flex items-center gap-3">' +
                        '<div class="w-8 h-8 rounded-full bg-gray-700 flex items-center justify-center text-purple-400 font-bold text-sm flex-shrink-0">' + initial + '</div>' +
                        '<span>' + p.name + '</span>' +
                    '</div>' +
                '</td>' +
                '<td class="px-6 py-4 text-center">' +
                    '<span class="inline-flex items-center gap-1.5 py-1 px-2.5 rounded-full text-xs font-medium bg-gray-800 text-gray-300 border border-gray-700">' +
                        '<span class="w-1.5 h-1.5 rounded-full ' + statusDot + '"></span>' + statusText +
                    '</span>' +
                '</td>' +
                '<td class="px-6 py-4 text-gray-400 text-sm">' + phone + '</td>' +
                '<td class="px-6 py-4">' +
                    '<span class="text-xs uppercase px-2 py-1 bg-gray-800 rounded text-gray-400 font-bold">' + therapist + '</span>' +
                '</td>' +
                '<td class="px-6 py-4 text-right space-x-2">' +
                    '<button class="edit-btn px-3 py-1.5 bg-gray-800 hover:bg-gray-700 text-blue-400 rounded text-xs font-bold uppercase tracking-wider transition-colors">Editar</button>' +
                    '<button class="nuke-btn px-3 py-1.5 bg-red-900/30 hover:bg-red-600 text-red-500 hover:text-white rounded text-xs font-bold uppercase tracking-wider border border-red-900/50 hover:border-red-500 transition-colors">Nuke</button>' +
                '</td>';

            tr.querySelector('.nuke-btn').onclick = () => this.nukePatient(p);
            tr.querySelector('.edit-btn').onclick = () => this.deepEditPatient(p);
            tbody.appendChild(tr);
        });
    },

    async nukePatient(patient) {
        const ok1 = await ModalService.confirm(
            '⚠️ PURGA TOTAL',
            'Esto borrará <b>' + patient.name + '</b>, TODAS sus citas (pasadas y futuras) y eliminará los eventos de Google Calendar.<br><br>¿Estás seguro?',
            'SÍ, PURGAR', 'Cancelar', 'danger'
        );
        if (!ok1) return;

        const ok2 = await ModalService.confirm(
            'ÚLTIMA ADVERTENCIA',
            '¿Confirmas la eliminación permanente de <b>' + patient.name + '</b>?',
            'ANIQUILAR', 'Cancelar', 'danger'
        );
        if (!ok2) return;

        ToastService.info('Iniciando purga de ' + patient.name + '...');

        try {
            // Buscar citas por patientId
            const q1 = query(collection(db, collectionPath), where('patientId', '==', patient.id));
            const snap1 = await getDocs(q1);

            // Buscar citas por nombre (legacies sin patientId)
            const q2 = query(collection(db, collectionPath), where('name', '==', patient.name));
            const snap2 = await getDocs(q2);

            const allDocs = new Map();
            snap1.docs.forEach(d => allDocs.set(d.id, d));
            snap2.docs.forEach(d => allDocs.set(d.id, d));

            ToastService.info('Se encontraron ' + allDocs.size + ' citas para eliminar.');

            const batch = writeBatch(db);
            let calDeleted = 0;

            for (const [id, docSnap] of allDocs.entries()) {
                try {
                    await GoogleCalendarService.deleteEvent(id);
                    calDeleted++;
                } catch (e) {
                    console.warn('No se pudo borrar de Google Calendar:', id);
                }
                batch.delete(docSnap.ref);
            }

            // Borrar perfil
            batch.delete(doc(db, patientProfilesPath, patient.id));

            await batch.commit();

            ToastService.success('Purga completada: ' + patient.name + ' eliminado. (' + allDocs.size + ' citas, ' + calDeleted + ' de Google Cal).');
            this.renderTable(document.getElementById('vaultSearchInput').value);

        } catch (err) {
            console.error('Error durante purga:', err);
            ModalService.alert('Error de Purga', 'Algo falló: ' + err.message, 'error');
        }
    },

    async deepEditPatient(patient) {
        const newName = prompt('EDICIÓN PROFUNDA\nNombre actual: ' + patient.name + '\n\nEscribe el nuevo nombre:', patient.name);
        if (!newName || newName.trim() === '' || newName.trim() === patient.name) return;

        const trimmed = newName.trim();
        const ok = await ModalService.confirm(
            'Renombrar Paciente',
            'Cambiarás "' + patient.name + '" a "' + trimmed + '".<br>Se actualizará el perfil y todas sus citas. ¿Continuar?',
            'Renombrar', 'Cancelar'
        );
        if (!ok) return;

        ToastService.info('Aplicando cambio de nombre...');

        try {
            await updatePatientProfile(patient.id, {
                name: trimmed,
                firstName: trimmed.split(' ')[0],
                lastName: trimmed.split(' ').slice(1).join(' ') || ''
            });

            const q1 = query(collection(db, collectionPath), where('patientId', '==', patient.id));
            const snap1 = await getDocs(q1);
            const q2 = query(collection(db, collectionPath), where('name', '==', patient.name));
            const snap2 = await getDocs(q2);

            const allDocs = new Map();
            snap1.docs.forEach(d => allDocs.set(d.id, d));
            snap2.docs.forEach(d => allDocs.set(d.id, d));

            const batch = writeBatch(db);
            allDocs.forEach(docSnap => batch.update(docSnap.ref, { name: trimmed }));
            await batch.commit();

            ToastService.success('Renombrado exitosamente a ' + trimmed);
            this.renderTable(document.getElementById('vaultSearchInput').value);

        } catch (err) {
            console.error('Error en edición profunda:', err);
            ModalService.alert('Error', 'Falló: ' + err.message, 'error');
        }
    }
};
