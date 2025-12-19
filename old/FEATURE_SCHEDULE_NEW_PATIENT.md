# 🎯 Feature: Sugerencia de Horarios al Crear Paciente

## Objetivo
Mejorar el flujo de creación de pacientes mostrando horarios disponibles organizados por día de la semana, con opciones de citas recurrentes (semanales y quincenales).

## Flujo Actual vs Propuesto

### Flujo Actual:
1. Crear paciente
2. Cerrar modal
3. Buscar paciente en calendario
4. Crear cita manualmente

### Flujo Propuesto:
1. Crear paciente
2. **Modal automático**: "¿Desea agendar primera cita?"
3. **Vista de horarios disponibles** por día:
   - Lunes: 09:00, 10:00, 11:00...
   - Martes: 09:00, 10:00, 11:00...
   - etc.
4. **Opciones de recurrencia**:
   - Cita única
   - Semanal (mismo día/hora cada semana)
   - Quincenal (mismo día/hora cada 2 semanas)
5. Confirmar y crear cita(s)

## Componentes a Crear/Modificar

### 1. Nuevo Modal: `scheduleNewPatientModal`
- Título: "Agendar Primera Cita - [Nombre Paciente]"
- Secciones:
  - Selector de semana (próximas 2-4 semanas)
  - Grid de días de la semana
  - Horarios disponibles por día
  - Opciones de recurrencia
  - Botón "Agendar" y "Omitir"

### 2. Modificar `PatientActions.saveNewPatient()`
- Después de crear paciente exitosamente
- Abrir modal de sugerencia de horarios
- Pasar datos del paciente al modal

### 3. Nueva función: `getAvailableSlotsByDay()`
- Analizar próximas 2 semanas
- Agrupar horarios disponibles por día de la semana
- Considerar horarios del terapeuta seleccionado

### 4. Nueva función: `createRecurringAppointments()`
- Crear múltiples citas según recurrencia
- Validar disponibilidad de cada slot
- Manejar conflictos

## Diseño de UI

```
┌─────────────────────────────────────────────────┐
│ Agendar Primera Cita - Roberto Gomez Bolanos   │
│                                           [X]   │
├─────────────────────────────────────────────────┤
│                                                 │
│ Semana: [< 9-15 Dic >]                         │
│                                                 │
│ ┌─────────┬─────────┬─────────┬─────────┐     │
│ │ LUNES   │ MARTES  │ MIÉRCOLES│ JUEVES │     │
│ ├─────────┼─────────┼─────────┼─────────┤     │
│ │ ○ 09:00 │ ○ 09:00 │ ○ 10:00 │ ○ 09:00 │     │
│ │ ○ 10:00 │ ○ 11:00 │ ○ 11:00 │ ○ 10:00 │     │
│ │ ○ 14:00 │ ○ 14:00 │ ○ 15:00 │ ○ 14:00 │     │
│ └─────────┴─────────┴─────────┴─────────┘     │
│                                                 │
│ ┌─────────┬─────────┐                          │
│ │ VIERNES │ SÁBADO  │                          │
│ ├─────────┼─────────┤                          │
│ │ ○ 09:00 │ ○ 09:00 │                          │
│ │ ○ 10:00 │ ○ 10:00 │                          │
│ │ ○ 15:00 │         │                          │
│ └─────────┴─────────┘                          │
│                                                 │
│ Recurrencia:                                    │
│ ○ Cita única                                   │
│ ○ Semanal (mismo día y hora cada semana)      │
│ ○ Quincenal (cada 2 semanas)                  │
│                                                 │
│ [Número de sesiones: 4 ▼]                     │
│                                                 │
├─────────────────────────────────────────────────┤
│                    [Omitir]  [Agendar Cita(s)] │
└─────────────────────────────────────────────────┘
```

## Implementación Técnica

### Fase 1: HTML Modal
- Agregar nuevo modal al index.html
- Estructura básica con grid de días

### Fase 2: Lógica de Disponibilidad
- Función para obtener slots disponibles
- Agrupar por día de la semana
- Filtrar por terapeuta

### Fase 3: Integración con PatientActions
- Modificar saveNewPatient()
- Abrir modal automáticamente
- Pasar contexto del paciente

### Fase 4: Citas Recurrentes
- Lógica para crear múltiples citas
- Validación de disponibilidad
- Manejo de errores

## Consideraciones

### UX:
- Mostrar solo horarios realmente disponibles
- Indicar visualmente horarios ocupados
- Permitir omitir si no quiere agendar ahora
- Confirmación clara de citas creadas

### Validación:
- Verificar disponibilidad antes de crear
- Manejar conflictos de horarios
- Límite razonable de sesiones recurrentes (ej: máximo 12)

### Performance:
- Calcular disponibilidad de forma eficiente
- No bloquear UI durante cálculos
- Caché de horarios disponibles

## Próximos Pasos

1. ✅ Crear documento de diseño (este archivo)
2. ⏳ Implementar HTML del modal
3. ⏳ Crear funciones de disponibilidad
4. ⏳ Integrar con PatientActions
5. ⏳ Implementar citas recurrentes
6. ⏳ Testing y refinamiento

---

**Fecha:** 4 de Diciembre 2024  
**Estado:** En Diseño  
**Prioridad:** Alta
