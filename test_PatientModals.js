/**
 * TEST SCRIPT PARA PatientModals.js
 * 
 * Copia y pega este script en la consola del navegador (F12)
 * para probar que PatientModals funciona correctamente
 */

(async () => {
    console.log('🧪 Iniciando pruebas de PatientModals...\n');

    try {
        // 1. Importar módulos
        console.log('📦 Importando módulos...');
        const { PatientState } = await import('./js/managers/patient/PatientState.js');
        const { PatientModals } = await import('./js/managers/patient/PatientModals.js');
        console.log('✅ Módulos importados correctamente\n');

        // 2. Inicializar DOM
        console.log('🔧 Inicializando DOM...');
        PatientState.initDOM();
        console.log('✅ DOM inicializado\n');

        // 3. Verificar que todas las funciones existen
        console.log('🔍 Verificando funciones...');
        const requiredFunctions = [
            'openNewPatient',
            'closeNewPatient',
            'openHistory',
            'closeHistory',
            'openInactive',
            'closeInactive',
            'closeAll'
        ];

        const missingFunctions = requiredFunctions.filter(fn => typeof PatientModals[fn] !== 'function');

        if (missingFunctions.length > 0) {
            throw new Error(`Funciones faltantes: ${missingFunctions.join(', ')}`);
        }

        console.log('✅ Todas las funciones existen:');
        requiredFunctions.forEach(fn => {
            console.log(`  - ${fn}()`);
        });
        console.log('');

        // 4. Probar apertura de modal de nuevo paciente
        console.log('🎨 Probando modal de nuevo paciente...');
        PatientModals.openNewPatient();

        const newPatientModal = PatientState.dom.newPatientModal;
        if (!newPatientModal || newPatientModal.classList.contains('hidden')) {
            throw new Error('Modal de nuevo paciente no se abrió');
        }
        console.log('✅ Modal de nuevo paciente se abrió correctamente');

        // Cerrar modal
        PatientModals.closeNewPatient();
        if (!newPatientModal.classList.contains('hidden')) {
            throw new Error('Modal de nuevo paciente no se cerró');
        }
        console.log('✅ Modal de nuevo paciente se cerró correctamente\n');

        // 5. Probar apertura de modal de historial
        console.log('🎨 Probando modal de historial...');

        // Crear paciente de prueba
        const testPatient = {
            id: 'test-id',
            name: 'Paciente de Prueba',
            therapist: 'diana',
            isActive: true
        };

        PatientModals.openHistory(testPatient);

        const historyModal = PatientState.dom.patientHistoryModal;
        if (!historyModal || historyModal.classList.contains('hidden')) {
            throw new Error('Modal de historial no se abrió');
        }
        console.log('✅ Modal de historial se abrió correctamente');

        // Verificar que el paciente se guardó en el estado
        const selectedPatient = PatientState.getSelectedPatient();
        if (!selectedPatient || selectedPatient.name !== testPatient.name) {
            throw new Error('Paciente seleccionado no se guardó correctamente');
        }
        console.log('✅ Paciente seleccionado guardado en estado');

        // Cerrar modal
        PatientModals.closeHistory();
        if (!historyModal.classList.contains('hidden')) {
            throw new Error('Modal de historial no se cerró');
        }
        console.log('✅ Modal de historial se cerró correctamente\n');

        // 6. Probar apertura de modal de inactivos
        console.log('🎨 Probando modal de inactivos...');
        PatientModals.openInactive();

        const inactiveModal = PatientState.dom.inactivePatientsModal;
        if (!inactiveModal || inactiveModal.classList.contains('hidden')) {
            throw new Error('Modal de inactivos no se abrió');
        }
        console.log('✅ Modal de inactivos se abrió correctamente');

        // Cerrar modal
        PatientModals.closeInactive();
        if (!inactiveModal.classList.contains('hidden')) {
            throw new Error('Modal de inactivos no se cerró');
        }
        console.log('✅ Modal de inactivos se cerró correctamente\n');

        // 7. Probar closeAll
        console.log('🔒 Probando cierre de todos los modales...');

        // Abrir todos los modales
        PatientModals.openNewPatient();
        PatientModals.openHistory(testPatient);
        PatientModals.openInactive();

        // Cerrar todos
        PatientModals.closeAll();

        const allClosed =
            newPatientModal.classList.contains('hidden') &&
            historyModal.classList.contains('hidden') &&
            inactiveModal.classList.contains('hidden');

        if (!allClosed) {
            throw new Error('No todos los modales se cerraron');
        }
        console.log('✅ Todos los modales se cerraron correctamente\n');

        // RESULTADO FINAL
        console.log('═══════════════════════════════════════');
        console.log('🎉 TODAS LAS PRUEBAS PASARON');
        console.log('═══════════════════════════════════════');
        console.log('\n📊 Resumen:');
        console.log('  ✅ Importación de módulos');
        console.log('  ✅ Inicialización de DOM');
        console.log('  ✅ Todas las funciones existen');
        console.log('  ✅ Modal de nuevo paciente (abrir/cerrar)');
        console.log('  ✅ Modal de historial (abrir/cerrar)');
        console.log('  ✅ Modal de inactivos (abrir/cerrar)');
        console.log('  ✅ Cierre de todos los modales');
        console.log('  ✅ Estado del paciente seleccionado');

        console.log('\n🧪 PRUEBAS MANUALES SUGERIDAS:');
        console.log('  1. PatientModals.openNewPatient()');
        console.log('     → Verificar que se puede llenar el formulario');
        console.log('');
        console.log('  2. PatientModals.openHistory({ name: "Uriel Duarte", id: "..." })');
        console.log('     → Verificar que se muestra el historial real');
        console.log('');
        console.log('  3. PatientModals.openInactive()');
        console.log('     → Verificar lista de pacientes inactivos');
        console.log('');

        console.log('💡 PatientModals está listo para usar!');
        console.log('   Todos los modales funcionan correctamente.');

    } catch (error) {
        console.error('═══════════════════════════════════════');
        console.error('❌ ERROR EN LAS PRUEBAS');
        console.error('═══════════════════════════════════════');
        console.error('Error:', error.message);
        console.error('Stack:', error.stack);
    }
})();
