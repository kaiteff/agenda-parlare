// notifications.js - Sistema de notificaciones persistentes

import { db, notificationsPath, userId, collection, onSnapshot, query, updateDoc, doc, deleteDoc } from './firebase.js';
import { getDocs } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";

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
}

// Listener de Firestore
function setupNotificationsListener() {
    const notifColRef = collection(db, notificationsPath);
    const notifQuery = query(notifColRef);

    onSnapshot(notifQuery, (snapshot) => {
        notificationList.innerHTML = '';
        let unreadCounter = 0;

        const notifications = [];
        snapshot.forEach((doc) => {
            notifications.push({ id: doc.id, ...doc.data() });
        });

        notifications.sort((a, b) => {
            const aTime = a.timestamp?.toDate?.() || new Date(a.timestamp);
            const bTime = b.timestamp?.toDate?.() || new Date(b.timestamp);
            return bTime - aTime;
        });

        if (notifications.length === 0) {
            notificationList.innerHTML = `
                <div class="p-8 text-center text-gray-400">
                    <svg class="w-12 h-12 mx-auto mb-2 opacity-50" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2-2v-5m16 0h-2.586a1 1 0 00-.707.293l-2.414 2.414a1 1 0 01-.707.293h-3.172a1 1 0 01-.707-.293l-2.414-2.414A1 1 0 006.586 13H4"></path>
                    </svg>
                    <p class="text-sm">No hay notificaciones</p>
                </div>
            `;
            updateNotificationBadge(0);
            return;
        }

        notifications.forEach(notif => {
            if (!notif.isRead) unreadCounter++;
            renderNotificationItem(notif);
        });

        updateNotificationBadge(unreadCounter);
    }, (error) => {
        console.error("Error Notifications: " + error.message);
    });
}

// Renderizar item de notificación
function renderNotificationItem(notification) {
    const notifEl = document.createElement('div');
    const bgClass = notification.isRead ? 'bg-white' : 'bg-blue-50';
    notifEl.className = `p-4 border-b border-gray-100 hover:bg-blue-100 cursor-pointer transition-colors ${bgClass}`;

    const oldDate = new Date(notification.oldDate);
    const newDate = new Date(notification.newDate);
    const oldStr = oldDate.toLocaleDateString('es-ES', { weekday: 'short', day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' });
    const newStr = newDate.toLocaleDateString('es-ES', { weekday: 'short', day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' });

    notifEl.innerHTML = `
        <div class="flex items-start gap-3">
            <div class="flex-shrink-0 w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center">
                <svg class="w-5 h-5 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"></path>
                </svg>
            </div>
            <div class="flex-1 min-w-0">
                <p class="text-sm font-semibold text-gray-800">🔄 ${notification.patientName} reagendada</p>
                <p class="text-xs text-gray-500 mt-1">Anterior: ${oldStr}</p>
                <p class="text-xs text-green-600 mt-0.5">Nueva: ${newStr}</p>
                <p class="text-xs text-gray-400 mt-2">${new Date(notification.timestamp?.toDate?.() || notification.timestamp).toLocaleString('es-ES')}</p>
            </div>
            ${!notification.isRead ? '<div class="w-2 h-2 bg-blue-600 rounded-full flex-shrink-0"></div>' : ''}
        </div>
    `;

    notifEl.onclick = () => markNotificationAsRead(notification.id, notification.isRead);
    notificationList.appendChild(notifEl);
}

// Marcar como leída
async function markNotificationAsRead(notifId, currentStatus) {
    if (currentStatus) return;
    try {
        await updateDoc(doc(db, notificationsPath, notifId), {
            isRead: true
        });
    } catch (e) {
        console.error("Error marking notification as read:", e);
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
    if (confirm('¿Limpiar todas las notificaciones?')) {
        try {
            const notifColRef = collection(db, notificationsPath);
            const snapshot = await getDocs(query(notifColRef));
            const deletePromises = [];
            snapshot.forEach((docSnap) => {
                deletePromises.push(deleteDoc(doc(db, notificationsPath, docSnap.id)));
            });
            await Promise.all(deletePromises);
        } catch (e) {
            console.error("Error clearing notifications:", e);
            alert("Error al limpiar notificaciones: " + e.message);
        }
    }
}

// Event listeners
function setupEventListeners() {
    notificationBell.onclick = () => {
        notificationPanel.classList.toggle('hidden');
    };

    document.addEventListener('click', (e) => {
        if (!notificationBell.contains(e.target) && !notificationPanel.contains(e.target)) {
            notificationPanel.classList.add('hidden');
        }
    });

    const clearBtn = document.getElementById('markAllReadBtn');
    if (clearBtn) {
        clearBtn.onclick = clearAllNotifications;
        clearBtn.textContent = "Limpiar todo";
    }
}
