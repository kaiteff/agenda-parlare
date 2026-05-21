# Resumen de sesión — 21 Mayo 2026

## Hecho

- **Lógica de Excepción de Opt-In (WhatsApp):** Los pacientes antiguos (con `wantsWhatsapp == true`) no se ven bloqueados por las nuevas reglas de opt-in recurrente, permitiéndoles recibir recordatorios automáticos de manera habitual.
- **Flujo de Registro de Pacientes Nuevos:** Configurada la Cloud Function `on_patient_created` para inicializar a los nuevos pacientes con `wantsWhatsapp = false` y `recurrentOptIn = 'pending'` garantizando la solicitud inicial de consentimiento de forma limpia.
- **Acción Manual de Bienvenida:** Al presionar el botón **Bienvenida** en la interfaz, se fuerza `wantsWhatsapp = false` y `recurrentOptIn = 'pending'` para reiniciar el consentimiento si el usuario lo desea.
- **Reactivación Automática vía Webhook:** El webhook de WhatsApp enlazado con Twilio ahora procesa respuestas "Sí, autorizo" (`optin_yes`) actualizando Firestore con `recurrentOptIn = 'accepted'` y activando automáticamente `wantsWhatsapp = true`. Si responden "No, prefiero manual", se establece `recurrentOptIn = 'rejected'` y `wantsWhatsapp = false` creando una alerta de seguimiento en vivo en Recepción.
- **Bitácora de WhatsApp Enriquecida:** Incorporación de las sub-acciones `WHATSAPP_REMINDER_PM`, `WHATSAPP_REMINDER_SKIPPED` y `WHATSAPP_REMINDER_ERROR` en el panel de auditoría para Yari. El botón "Ver detalle" ahora muestra dinámicamente el mensaje o error exacto de forma colapsable.
- **Documentación Actualizada:**
  - Actualización del manual interno en la interfaz (`js/modules/help/HelpManual.js`).
  - Actualización de los manuales del repositorio: `MANUAL_USUARIO_PLATAFORMA.md`, `MANUAL_PLANTILLAS_WHATSAPP.md` y `MANUAL_TERAPEUTAS.md`.
  - Registro de avance en `PLAN_DE_TRABAJO.md`, `ANALISIS_ESTRATEGIA_MOVIL.md` y `VISION_PARLARE_V2.md`.
- **Recordatorios de Mañana:** Se ejecutó con éxito el envío de recordatorios de mañana desde producción enviando 11 mensajes a pacientes autorizados y omitiendo correctamente 1 paciente.

## Validar (usuario)

- [ ] Confirmar que los nuevos pacientes inician con el semáforo en amarillo (pendiente) y casilla desactivada.
- [ ] Confirmar que al recibir "Sí, autorizo" de un paciente de prueba, la casilla en el expediente se activa automáticamente a color verde.
- [ ] Auditar los detalles de envíos y omisiones de WhatsApp en **Más → Bitácora de Auditoría** (Pestaña WhatsApp).

## Deploy

```powershell
# Compilación y despliegue del frontend
npm run build
firebase deploy --only hosting

# Despliegue de funciones backend
firebase deploy --only functions
```

## Próxima sesión

Consulte **⏳ Falta** y **💡 Sugerencias** en `ANALISIS_ESTRATEGIA_MOVIL.md`.
