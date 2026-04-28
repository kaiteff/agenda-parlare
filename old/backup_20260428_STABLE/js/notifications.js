// notifications.js - Sistema de notificaciones persistentes

import { db, notificationsPath, collection, onSnapshot, query, updateDoc, doc, deleteDoc, getDocs, getDoc, collectionPath } from './firebase.js'; // Added getDoc, collectionPath
import { ModalService } from './utils/ModalService.js';
import { Logger } from './utils/Logger.js';
import { CalendarModal } from './modules/calendar/CalendarModal.js'; // Import CalendarModal
import { CalendarState } from './modules/calendar/CalendarState.js'; // Import CalendarState
import { AuthManager } from './managers/AuthManager.js';

const log = Logger.create('Notifications');

// Referencias DOM
let notificationBell, notificationBadge, notificationPanel, notificationList;

// Inicializar notificaciones
export function initNotifications() {
    notificationBell = document.getElementById('notificationBell');
    notificationBadge = document.getElementById('notificationBadge');
    notificationPanel = document.getElementById('notificationList'); // El panel dropdown
    notificationList = document.getElementById('notificationItems'); // La lista de items

    setupEventListeners();
    setupNotificationsListener();
    log.info('Inicializado');
}

// Listener de Firestore
function setupNotificationsListener() {
    try {
        const notifColRef = collection(db, notificationsPath);
        const notifQuery = query(notifColRef);

        onSnapshot(notifQuery, (snapshot) => {
            if (!notificationList) return;

            notificationList.innerHTML = '';
            let unreadCounter = 0;
            const currentUser = AuthManager.currentUser;
            const userRole = currentUser?.role || 'therapist';
            const userTherapist = currentUser?.therapist || 'diana';

            const notifications = [];
            snapshot.forEach((doc) => {
                const data = doc.data();
                
                // --- LÓGICA DE FILTRADO ---
                // Yari (Admin/Manager): Ve notificaciones de tipo 'manager'
                if (userRole === 'admin' || userRole === 'receptionist') {
                    if (data.recipient === 'manager') {
                        notifications.push({ id: doc.id, ...data });
                    }
                }
                
                // Terapeutas (Sam, Diana, Vero): Ven notificaciones de tipo 'therapist'
                // pero filtradas por SU ID de terapeuta.
                if (userRole === 'therapist' || userRole === 'admin') {
                    if (data.recipient === 'therapist') {
                        // Si la notificación trae un ID de terapeuta, debe coincidir
                        if (data.therapist && data.therapist === userTherapist) {
                            notifications.push({ id: doc.id, ...data });
                        } 
                        // Si no trae terapeuta (fallback), la ignoramos o la mostramos si es admin
                        else if (!data.therapist && userRole === 'admin') {
                             notifications.push({ id: doc.id, ...data });
                        }
                    }
                }
            });

            // Ordenar por fecha desc
            notifications.sort((a, b) => {
                const aTime = a.timestamp?.toDate?.() || new Date(a.timestamp);
                const bTime = b.timestamp?.toDate?.() || new Date(b.timestamp);
                return bTime - aTime;
            });

            if (notifications.length === 0) {
                renderEmptyState();
                updateNotificationBadge(0);
                return;
            }

            notifications.forEach(notif => {
                if (!notif.isRead) unreadCounter++;
                renderNotificationItem(notif);
            });

            updateNotificationBadge(unreadCounter);
            log.debug(`Cargadas ${notifications.length} notificaciones filtradas para ${userRole} (${unreadCounter} sin leer)`);
        }, (error) => {
            log.error("Error en listener:", error);
        });
    } catch (error) {
        log.error("Error configurando listener:", error);
    }
}

function renderEmptyState() {
    notificationList.innerHTML = `
        <div class="p-8 text-center text-gray-400">
            <svg class="w-12 h-12 mx-auto mb-2 opacity-50" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2-2v-5m16 0h-2.586a1 1 0 00-.707.293l-2.414 2.414a1 1 0 01-.707.293h-3.172a1 1 0 01-.707-.293l-2.414-2.414A1 1 0 006.586 13H4"></path>
            </svg>
            <p class="text-sm">No hay notificaciones</p>
        </div>
    `;
}

// Renderizar item de notificación
function renderNotificationItem(notification) {
    const notifEl = document.createElement('div');
    const bgClass = notification.isRead ? 'bg-white' : 'bg-blue-50';
    notifEl.className = `p-4 border-b border-gray-100 hover:bg-blue-100 cursor-pointer transition-colors ${bgClass}`;

    // Determinar tipo de notificación
    const notifType = notification.type || 'reschedule';
    let icon, iconBg, title, details;

    if (notifType === 'whatsapp_cancel') {
        icon = `<svg class="w-5 h-5 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"></path></svg>`;
        iconBg = 'bg-red-100';
        title = `❌ ${notification.patientName} canceló por WhatsApp`;
        const aptDate = notification.appointmentDate ? new Date(notification.appointmentDate).toLocaleDateString('es-ES', { weekday: 'short', day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' }) : '';
        details = aptDate ? `<p class="text-xs text-red-500 mt-1">Cita cancelada: ${aptDate}</p>` : '';
    } else if (notifType === 'whatsapp_confirm') {
        icon = `<svg class="w-5 h-5 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7"></path></svg>`;
        iconBg = 'bg-green-100';
        title = `✅ ${notification.patientName} confirmó por WhatsApp`;
        const aptDate = notification.appointmentDate ? new Date(notification.appointmentDate).toLocaleDateString('es-ES', { weekday: 'short', day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' }) : '';
        details = aptDate ? `<p class="text-xs text-green-600 mt-1">Cita confirmada: ${aptDate}</p>` : '';
    } else if (['success', 'info', 'warning', 'error'].includes(notifType)) {
        // Notificaciones genéricas
        const config = {
            success: { text: 'text-green-600', bg: 'bg-green-100', icon: '<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7"></path>' },
            info: { text: 'text-blue-600', bg: 'bg-blue-100', icon: '<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path>' },
            warning: { text: 'text-yellow-600', bg: 'bg-yellow-100', icon: '<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"></path>' },
            error: { text: 'text-red-600', bg: 'bg-red-100', icon: '<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path>' }
        };

        const style = config[notifType] || config.info;
        icon = `<svg class="w-5 h-5 ${style.text}" fill="none" stroke="currentColor" viewBox="0 0 24 24">${style.icon}</svg>`;
        iconBg = style.bg;
        title = notification.title || 'Notificación';
        details = `<p class="text-xs text-gray-600 mt-1">${notification.message || ''}</p>`;

    } else {
        // Fallback: Default antigua (reagendada)
        // Solo si tenemos datos de paciente, sino mostramos genérico
        if (notification.patientName) {
            icon = `<svg class="w-5 h-5 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"></path></svg>`;
            iconBg = 'bg-blue-100';
            title = `🔄 ${notification.patientName} reagendada`;

            // Handle dates safely
            let oldStr = 'N/A', newStr = 'N/A';
            try {
                if (notification.oldDate) oldStr = new Date(notification.oldDate).toLocaleDateString('es-ES', { weekday: 'short', day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' });
                if (notification.newDate) newStr = new Date(notification.newDate).toLocaleDateString('es-ES', { weekday: 'short', day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' });
            } catch (e) { log.warn('Error formateando fechas', e); }

            details = `<p class="text-xs text-gray-500 mt-1">Anterior: ${oldStr}</p><p class="text-xs text-green-600 mt-0.5">Nueva: ${newStr}</p>`;
        } else {
            // Fallback total si no hay tipo ni nombre
            icon = `<svg class="w-5 h-5 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9"></path></svg>`;
            iconBg = 'bg-gray-100';
            title = notification.title || 'Notificación';
            details = `<p class="text-xs text-gray-600 mt-1">${notification.message || ''}</p>`;
        }
    }

    const timestamp = notification.timestamp?.toDate?.() || (notification.timestamp ? new Date(notification.timestamp) : new Date());

    notifEl.innerHTML = `
        <div class="flex items-start gap-3">
            <div class="flex-shrink-0 w-10 h-10 ${iconBg} rounded-full flex items-center justify-center">
                ${icon}
            </div>
            <div class="flex-1 min-w-0">
                <p class="text-sm font-semibold text-gray-800">${title}</p>
                ${details}
                <p class="text-xs text-gray-400 mt-2">${timestamp.toLocaleString('es-ES')}</p>
            </div>
            ${!notification.isRead ? '<div class="w-2 h-2 bg-blue-600 rounded-full flex-shrink-0"></div>' : ''}
        </div>
    `;

    notifEl.onclick = async () => {
        markNotificationAsRead(notification.id, notification.isRead);

        // Cierra el panel
        notificationPanel.classList.add('hidden');

        if (notification.appointmentId) {
            log.info(`Abriendo cita desde notificación: ${notification.appointmentId}`);
            try {
                // 1. Buscar en estado local
                let appointment = CalendarState.appointments.find(a => a.id === notification.appointmentId);

                // 2. Si no está en memoria, buscar en DB
                if (!appointment) {
                    const docSnap = await getDoc(doc(db, collectionPath, notification.appointmentId));
                    if (docSnap.exists()) {
                        appointment = { id: docSnap.id, ...docSnap.data() };
                    }
                }

                if (appointment) {
                    CalendarModal.openEditModal(appointment);
                } else {
                    await ModalService.alert('Información', 'La cita ya no existe o fue eliminada.', 'info');
                }
            } catch (err) {
                log.error("Error abriendo cita desde notificación:", err);
            }
        }
    };

    notificationList.appendChild(notifEl);
}

// Marcar como leída
async function markNotificationAsRead(notifId, currentStatus) {
    if (currentStatus) return;
    try {
        await updateDoc(doc(db, notificationsPath, notifId), {
            isRead: true
        });
        log.debug(`Notificación ${notifId} marcada como leída`);
    } catch (e) {
        log.error("Error marcando notificación como leída:", e);
    }
}

// Actualizar badge
function updateNotificationBadge(count) {
    if (count > 0) {
        notificationBadge.textContent = count > 99 ? '99+' : count;
        notificationBadge.classList.remove('hidden');
    } else {
        notificationBadge.classList.add('hidden');
    }
}

// Limpiar todas
async function clearAllNotifications() {
    if (await ModalService.confirm("Limpiar Notificaciones", "¿Estás seguro de eliminar todas las notificaciones?", "Limpiar", "Cancelar")) {
        try {
            const notifColRef = collection(db, notificationsPath);
            const snapshot = await getDocs(query(notifColRef));
            const deletePromises = [];
            snapshot.forEach((docSnap) => {
                deletePromises.push(deleteDoc(doc(db, notificationsPath, docSnap.id)));
            });
            await Promise.all(deletePromises);
            log.success('Todas las notificaciones eliminadas');
        } catch (e) {
            log.error("Error clearing notifications:", e);
            await ModalService.alert("Error", "Error al limpiar notificaciones: " + e.message, "error");
        }
    }
}

// Event listeners
function setupEventListeners() {
    if (notificationBell) {
        notificationBell.onclick = () => {
            notificationPanel.classList.toggle('hidden');
        };
    }

    document.addEventListener('click', (e) => {
        if (notificationBell && notificationPanel &&
            !notificationBell.contains(e.target) &&
            !notificationPanel.contains(e.target)) {
            notificationPanel.classList.add('hidden');
        }
    });

    const clearBtn = document.getElementById('markAllReadBtn');
    if (clearBtn) {
        clearBtn.onclick = clearAllNotifications;
        clearBtn.textContent = "Limpiar todo";
    }
}
