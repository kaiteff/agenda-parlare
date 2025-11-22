
import { db, collection, addDoc } from './js/firebase.js';

async function addUnpaidAppointment() {
    const today = new Date();
    const pastDate = new Date(today);
    pastDate.setDate(today.getDate() - 5); // 5 days ago
    pastDate.setHours(10, 0, 0, 0);

    try {
        await addDoc(collection(db, 'appointments'), {
            name: 'Daniel',
            date: pastDate.toISOString(),
            cost: 500,
            isPaid: false,
            isConfirmed: true,
            createdAt: new Date().toISOString()
        });
        console.log('Cita impaga creada');
    } catch (e) {
        console.error('Error:', e);
    }
}

addUnpaidAppointment();

