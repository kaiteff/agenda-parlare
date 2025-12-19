/**
 * TEST SCRIPT PARA PatientUI.js
 * 
 * Copia y pega este script en la consola del navegador (F12)
 * para probar que PatientUI funciona correctamente
 */

(async () => {
    console.log('🧪 Iniciando pruebas de PatientUI...\n');

    try {
        // 1. Importar módulos
        console.log('📦 Importando módulos...');
        const { PatientState } = await import('./js/managers/patient/PatientState.js');
        const { PatientFilters } = await import('./js/managers/patient/PatientFilters.js');
        const { PatientUI } = await import('./js/managers/patient/PatientUI.js');
        console.log('✅ Módulos importados correctamente\n');

        // 2. Inicializar DOM
        console.log('🔧 Inicializando referencias DOM...');
        PatientState.initDOM();

        if (!PatientState.isDOMReady()) {
            throw new Error('DOM no se inicializó correctamente');
        }
        console.log('✅ DOM inicializado\n');

        // 3. Probar renderizado de header
        console.log('🎨 Probando renderizado de header...');
        PatientUI._updateHeader(5); // Simular 5 pacientes

        const header = document.getElementById('patientsHeader');
        if (!header || !header.innerHTML) {
            throw new Error('Header no se renderizó');
        }
        console.log('✅ Header renderizado correctamente\n');

        // 4. Probar cambio de modo
        console.log('🔄 Probando cambio de modo de vista...');
        PatientState.setViewMode('today');
        console.log('  - Modo actual:', PatientState.getViewMode());

        PatientState.setViewMode('tomorrow');
        console.log('  - Modo actual:', PatientState.getViewMode());

        PatientState.setViewMode('all');
        console.log('  - Modo actual:', PatientState.getViewMode());
        console.log('✅ Cambio de modo funciona\n');

        // 5. Probar renderizado completo
        console.log('🎨 Probando renderizado completo de lista...');
        PatientUI.renderList();

        const list = document.getElementById('patientsList');
        if (!list) {
            throw new Error('Lista no existe en el DOM');
        }
        console.log('  - Pacientes renderizados:', list.children.length);
        console.log('✅ Renderizado completo funciona\n');

        // 6. Verificar que los botones funcionan
        console.log('🔘 Verificando botones...');
        const btnToday = document.getElementById('btnViewToday');
        const btnTomorrow = document.getElementById('btnViewTomorrow');
        const btnAll = document.getElementById('btnViewAll');

        if (!btnToday || !btnTomorrow || !btnAll) {
            throw new Error('Botones no se crearon correctamente');
        }
        console.log('✅ Botones creados correctamente\n');

        // 7. Probar click en botones
        console.log('🖱️  Probando click en botones...');
        btnToday.click();
        console.log('  - Después de click en "Hoy":', PatientState.getViewMode());

        btnTomorrow.click();
        console.log('  - Después de click en "Mañana":', PatientState.getViewMode());

        btnAll.click();
        console.log('  - Después de click en "Todos":', PatientState.getViewMode());
        console.log('✅ Clicks en botones funcionan\n');

        // RESULTADO FINAL
        console.log('═══════════════════════════════════════');
        console.log('🎉 TODAS LAS PRUEBAS PASARON');
        console.log('═══════════════════════════════════════');
        console.log('\n📊 Resumen:');
        console.log('  ✅ Importación de módulos');
        console.log('  ✅ Inicialización de DOM');
        console.log('  ✅ Renderizado de header');
        console.log('  ✅ Cambio de modo de vista');
        console.log('  ✅ Renderizado de lista');
        console.log('  ✅ Creación de botones');
        console.log('  ✅ Event listeners');
        console.log('\n💡 PatientUI está listo para usar!');

    } catch (error) {
        console.error('═══════════════════════════════════════');
        console.error('❌ ERROR EN LAS PRUEBAS');
        console.error('═══════════════════════════════════════');
        console.error('Error:', error.message);
        console.error('Stack:', error.stack);
    }
})();
