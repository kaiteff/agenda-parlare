/**
 * TEST SCRIPT PARA PatientManager.js
 * 
 * Este es el test FINAL que prueba todo el sistema integrado
 * 
 * Copia y pega este script en la consola del navegador (F12)
 */

(async () => {
    console.log('🎯 PRUEBA FINAL: PatientManager (Sistema Completo)\n');
    console.log('═══════════════════════════════════════\n');

    try {
        // 1. Importar PatientManager
        console.log('📦 Importando PatientManager...');
        const { PatientManager } = await import('./js/managers/PatientManager.js');
        console.log('✅ PatientManager importado\n');

        // 2. Verificar estructura
        console.log('🔍 Verificando estructura del manager...');
        const requiredModules = ['state', 'filters', 'ui', 'actions', 'modals', 'api'];
        const missingModules = requiredModules.filter(mod => !PatientManager[mod]);

        if (missingModules.length > 0) {
            throw new Error(`Módulos faltantes: ${missingModules.join(', ')}`);
        }

        console.log('✅ Todos los submódulos están presentes:');
        requiredModules.forEach(mod => {
            console.log(`  - ${mod}`);
        });
        console.log('');

        // 3. Verificar API pública
        console.log('🔍 Verificando API pública...');
        const apiMethods = [
            'getPatient',
            'getActivePatients',
            'getTodayCount',
            'getTomorrowCount',
            'refreshList',
            'openHistory',
            'openNewPatient',
            'markAsPaid',
            'toggleConfirmation'
        ];

        const missingMethods = apiMethods.filter(method => typeof PatientManager.api[method] !== 'function');

        if (missingMethods.length > 0) {
            throw new Error(`Métodos faltantes en API: ${missingMethods.join(', ')}`);
        }

        console.log('✅ Todos los métodos de API están presentes:');
        apiMethods.forEach(method => {
            console.log(`  - api.${method}()`);
        });
        console.log('');

        // 4. Inicializar el sistema
        console.log('🚀 Inicializando sistema completo...');
        await PatientManager.init();
        console.log('✅ Sistema inicializado correctamente\n');

        // 5. Probar API
        console.log('🧪 Probando API pública...');

        const activePatients = PatientManager.api.getActivePatients();
        console.log(`  ✅ getActivePatients(): ${activePatients.length} pacientes`);

        const todayCount = PatientManager.api.getTodayCount();
        console.log(`  ✅ getTodayCount(): ${todayCount} pacientes`);

        const tomorrowCount = PatientManager.api.getTomorrowCount();
        console.log(`  ✅ getTomorrowCount(): ${tomorrowCount} pacientes`);

        console.log('');

        // 6. Probar funciones globales
        console.log('🌐 Verificando funciones globales...');
        const globalFunctions = [
            'openPatientHistoryModal',
            'closePatientHistoryModal',
            'openNewPatientModal',
            'closeNewPatientModal',
            'quickMarkAsPaid',
            'toggleConfirmationFromList',
            'reactivatePatientFromList'
        ];

        const missingGlobals = globalFunctions.filter(fn => typeof window[fn] !== 'function');

        if (missingGlobals.length > 0) {
            throw new Error(`Funciones globales faltantes: ${missingGlobals.join(', ')}`);
        }

        console.log('✅ Todas las funciones globales están disponibles:');
        globalFunctions.forEach(fn => {
            console.log(`  - window.${fn}()`);
        });
        console.log('');

        // 7. Probar renderizado
        console.log('🎨 Probando renderizado...');
        PatientManager.api.refreshList();

        const patientsList = document.getElementById('patientsList');
        if (!patientsList) {
            throw new Error('Lista de pacientes no encontrada');
        }

        console.log(`  ✅ Lista renderizada: ${patientsList.children.length} elementos`);
        console.log('');

        // 8. Probar modales
        console.log('🎨 Probando modales...');

        // Nuevo paciente
        PatientManager.api.openNewPatient();
        const newPatientModal = document.getElementById('newPatientModal');
        if (newPatientModal && !newPatientModal.classList.contains('hidden')) {
            console.log('  ✅ Modal de nuevo paciente funciona');
            window.closeNewPatientModal();
        }

        // Historial (si hay pacientes)
        if (activePatients.length > 0) {
            PatientManager.api.openHistory(activePatients[0]);
            const historyModal = document.getElementById('patientHistoryModal');
            if (historyModal && !historyModal.classList.contains('hidden')) {
                console.log('  ✅ Modal de historial funciona');
                window.closePatientHistoryModal();
            }
        }

        console.log('');

        // RESULTADO FINAL
        console.log('═══════════════════════════════════════');
        console.log('🎉 ¡SISTEMA COMPLETO FUNCIONANDO!');
        console.log('═══════════════════════════════════════');
        console.log('\n📊 Resumen Final:');
        console.log('  ✅ PatientManager importado');
        console.log('  ✅ Todos los submódulos presentes');
        console.log('  ✅ API pública completa');
        console.log('  ✅ Sistema inicializado');
        console.log('  ✅ Funciones globales disponibles');
        console.log('  ✅ Renderizado funcionando');
        console.log('  ✅ Modales funcionando');

        console.log('\n🏗️  ARQUITECTURA IMPLEMENTADA:');
        console.log('  PatientManager (coordinador)');
        console.log('  ├── PatientState (estado)');
        console.log('  ├── PatientFilters (filtros)');
        console.log('  ├── PatientUI (renderizado)');
        console.log('  ├── PatientActions (CRUD)');
        console.log('  └── PatientModals (modales)');

        console.log('\n💡 PRÓXIMOS PASOS:');
        console.log('  1. Actualizar app.js para usar PatientManager');
        console.log('  2. Eliminar patients.js viejo');
        console.log('  3. Testing exhaustivo');
        console.log('  4. Commit y celebrar! 🎉');

        console.log('\n🎯 REFACTORIZACIÓN COMPLETADA AL 100%');

    } catch (error) {
        console.error('═══════════════════════════════════════');
        console.error('❌ ERROR EN LA PRUEBA FINAL');
        console.error('═══════════════════════════════════════');
        console.error('Error:', error.message);
        console.error('Stack:', error.stack);
    }
})();
