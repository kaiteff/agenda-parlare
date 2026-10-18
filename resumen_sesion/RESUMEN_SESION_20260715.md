# Resumen de sesión — 15 de Julio de 2026

## Qué se hizo
- UX **celular landscape** (Pixel 10 Pro): el ancho >768px activaba layout de escritorio (header amontonado, sin Agenda|Pacientes|Más, sidebar muy ancho).
- Iteraciones v1→v3:
  - `js/utils/viewport.js` — detección por **lado corto ≤600** (+ respaldo altura).
  - `html.phone-landscape` + CSS: header compacto, sidebar ~28vw, lista pacientes con scroll, bottom nav visible.
  - `CalendarUI`: banner día seleccionado; en vista **Día** el encabezado **ya no es sticky** (no tapa citas al scrollear).
- Cierre: Manual + pop-up **`parlare_onboarding_v9_11`**.

## Seguridad
Sin cambios en auth, Firestore rules ni secretos.

## Deploy
```powershell
cd d:\agbc\Ag_Pa
npm run build
firebase deploy --only hosting
```
`viewport.js` v3 ya estaba en producción al cierre; redeploy necesario si falta el pop-up v9.11 / manual.

## Validar en Pixel
1. Recarga forzada (cerrar pestaña o borrar caché del sitio).
2. Girar a horizontal → barra **Agenda · Pacientes · Más**.
3. Pacientes más angosto; lista baja con el dedo.
4. Vista Día → scrollear horas: el día no se queda pegado encima de las citas.
5. **Más** → Control Maestro / Corte.
