# Roadmap SaaS — Agenda para clínicas + acceso Parláre Support

> **Fecha:** 22 Jun 2026  
> **Pregunta guía:** ¿Podemos tener **una app** donde yo entro con **login Parláre Support** y **entro a la clínica** (empezando por Centro Parláre)?  
> **Respuesta corta:** **Sí, es viable.** Hoy ya tienes el 80 % del producto para **una** clínica; falta el **modelo de organización** (`clinicId`), auth de plataforma y un **selector de clínica** tras el login.

Documentos relacionados: `VISION_PARLARE_V2.md` (Opción A multiclínica), `DOCUMENTACION_MIGRACION_BLAZE.md` (clon por Firebase), `PLAN_DE_TRABAJO.md`.

---

## 1. Comparativa: hoy vs lo que quieres

| Dimensión | **Hoy (Centro Parláre)** | **Tu visión (producto)** |
|-----------|--------------------------|---------------------------|
| **App** | Una SPA en `taconotaco-d94fc.web.app` | La misma app (luego Capacitor / tiendas) |
| **Clientes** | 1 clínica implícita | N clínicas, empezando por Parláre |
| **Login support** | Daniel = `admin` en el mismo Firebase (`rodriguezd.danielrob@gmail.com`) | Usuario **Parláre Support** que elige clínica |
| **Entrar a Parláre** | Ya funciona: admin ve todas las agendas (`therapist: all`) | Mismo resultado, pero con paso explícito «Estás en: Centro Parláre» |
| **Entrar a otra clínica** | No existe | Selector → datos aislados por `clinicId` |
| **Datos** | `appointments`, `patientProfiles` sin `clinicId` | Todo documento con `clinicId` + reglas Firestore |
| **Config** | `settings/clinicConfig` (una sola) | `settings/{clinicId}` o subcolección por clínica |
| **Terapeutas** | Hardcoded `diana`, `sam`, `vero` | Lista dinámica por clínica |
| **Excel / Calendar** | IDs fijos en JS | IDs en config por clínica (o finanzas nativas) |
| **SupportVault** | Solo email Daniel; sugerencias globales | Panel plataforma + contexto de clínica activa |

### Lo que ya tienes a favor (no empezar de cero)

- Agenda completa (día/semana, móvil, pagos, WhatsApp, Copiloto, recepción).
- Roles (`admin`, `therapist`, `receptionist`) y permisos en `AuthManager`.
- Admin que cambia vista de terapeuta (`switch_therapist_view`) — **patrón similar** al futuro «cambiar clínica».
- `SettingsManager` leyendo config desde Firestore (primer paso hacia DB-driven).
- Backend en Cloud Functions replicable por proyecto (`firebase deploy`).
- Campos «SaaS Ready» (recibos, cédula) guardados pero UI deshabilitada.
- Blaze + Secret Manager para Twilio/Google.

### Lo que bloquea vender / segunda clínica hoy

1. Sin `clinicId` en datos ni queries.
2. Emails hardcoded en `firestore.rules` y `AUTHORIZED_USERS` (S-005).
3. Terapeutas y Sheets/Calendar hardcoded.
4. Un solo `firebaseConfig` en `firebase.js`.
5. No existe rol `platform_support` ni pantalla «elegir clínica».

---

## 2. Dos modelos posibles (y cuál encaja con tu idea)

### Modelo A — **Una app, multiclínica** (recomendado para tu idea)

- **Un** proyecto Firebase (o uno «plataforma»).
- Cada cita/paciente/settings lleva `clinicId`.
- Login → si eres staff de clínica → entras directo a tu `clinicId`.
- Login **Parláre Support** → pantalla **«Seleccionar clínica»** → `sessionStorage.activeClinicId` → toda la app filtra por ese id.
- Monetización futura: Stripe por asientos por `clinicId`.

**Encaja con:** «una app que sirva como agenda a clínicas» + support que «se meta» a Parláre u otra.

### Modelo B — **Un Firebase por clínica** (clon / white-label)

- Cada cliente = proyecto Firebase nuevo + `firebase deploy`.
- Support abre URL distinta o un «portal» con lista de enlaces/proyectos.
- Aislamiento máximo; más costo operativo para ti (N proyectos, N deploys).

**Encaja con:** clínicas que quieren datos 100 % separados en GCP; **no** encaja tan bien con «un login support, un selector, una app».

### Decisión propuesta para el roadmap

**Seguir Modelo A** (alineado con `VISION_PARLARE_V2` Opción A), usando **Centro Parláre** como primer tenant `clinicId: 'centro_parlare'`.

Modelo B queda como opción **enterprise** más adelante (exportar / dedicar proyecto).

---

## 3. ¿Se puede hacer lo que pides ya?

### Funcionalmente hoy (sin código nuevo)

| Usuario | ¿Ve agenda Parláre completa? |
|---------|------------------------------|
| Daniel (`admin`, `therapist: all`) | ✅ Sí |
| Diana / Yari (`admin` / recepción) | ✅ Sí (toda la clínica) |
| Sam / Vero | Solo su agenda |

**Conclusión:** El **producto agenda para Parláre** ya existe. Lo que **no** existe es el **producto plataforma** (support → elegir clínica → mismo binario para N clientes).

### Con el primer hito de SaaS (Fase 0 abajo)

- Cuenta `support@parlare.mx` (o similar) con rol `platform_support`.
- Tras login: pantalla «Centro Parláre» (única opción al inicio).
- Banner fijo: «Modo soporte — Centro Parláre».
- Misma agenda que hoy, datos migrados con `clinicId: 'centro_parlare'`.

**Esfuerzo estimado Fase 0:** 2–4 semanas de ingeniería enfocada (migración + reglas + selector), sin reescribir agenda.

---

## 4. Arquitectura objetivo (diagrama)

```mermaid
flowchart TD
    subgraph App["App única Parláre Agenda"]
        Login[Firebase Auth login]
        Router{¿Rol?}
        ClinicPicker[Selector de clínica]
        Agenda[Agenda / Pacientes / Pagos]
    end

    subgraph Auth["Perfil usuario"]
        Staff[staff: clinicId fijo]
        Support[platform_support: elige clínica]
        AdminClinic[admin clínica: su clinicId]
    end

    subgraph Firestore["Firestore"]
        Clinics[clinics/{clinicId}]
        Appts[appointments WHERE clinicId]
        Profiles[patientProfiles WHERE clinicId]
        Settings[settings per clinicId]
    end

    Login --> Router
    Router -->|platform_support| ClinicPicker
    Router -->|staff / admin| Agenda
    ClinicPicker -->|activeClinicId| Agenda
    Agenda --> Appts
    Agenda --> Profiles
    Agenda --> Settings
    Clinics --> ClinicPicker
```

---

## 5. Roadmap por fases

### Fase 0 — **«Support entra a Parláre»** (MVP plataforma) — 🔒 **rama paralela OFF** (30 jun 2026)

> **Producción Parláre:** `SAAS_MULTICLINIC_ENABLED = false` en `js/core/clinicConstants.js`. La agenda actual **no ejecuta** selector, filtros ni settings por `clinicId`. Ver `js/saas/README.md`.

**Objetivo:** Un login support + selector con una sola clínica (Parláre). Sin segundo cliente aún.

| # | Entregable | Detalle | Estado |
|---|------------|---------|--------|
| 0.0 | **Feature flag** | `SAAS_MULTICLINIC_ENABLED = false` por defecto | ✅ |
| 0.1 | Colección `clinics` | Doc `centro_parlare` — ver `SAAS_FASE0_SETUP.md` | ⏳ seed manual (solo al activar flag) |
| 0.2 | Campo `clinicId` | Filtro + stamp (solo si flag ON); `backfillClinicId` callable | ✅ código dormido |
| 0.3 | Rol `platform_support` | `AuthManager` + `support@parlare.mx` (inactivo si flag OFF) | ✅ código |
| 0.5 | Filtros en listeners | `CalendarData`, `PatientManager`, batch Excel Header | ✅ código |
| 0.6 | Reglas Firestore | `clinics/{id}` lectura auth | ✅ reglas |
| 0.7 | Cuenta support | Crear en Firebase Auth | ⏳ manual |
| 0.8 | Contabilidad por clínica | `settings/{clinicId}.integrations.google` — ver `CONTABILIDAD_MULTICLINICA.md` | ✅ código |

**Archivos nuevos:** `js/core/ClinicContext.js`, `clinicConstants.js`, `ClinicSelector.js`, `clinicData.js`, `CONTABILIDAD_MULTICLINICA.md`, `SAAS_FASE0_SETUP.md`, `functions/clinic_saas.py`.

**Criterio de éxito:** Support inicia sesión → elige «Centro Parláre» → ve exactamente lo que Diana/Yari ven (según permisos que definan para support).

**Riesgo:** Migración `clinicId` en producción — hacer script idempotente + backup + ventana de mantenimiento corta.

---

### Fase 1 — **Segunda clínica piloto** (validar multitenancy)

**Objetivo:** Alta de `clinica_demo` o cliente beta real; datos 100 % aislados de Parláre.

| # | Entregable |
|---|------------|
| 1.1 | Wizard mínimo alta clínica (solo Daniel/support): nombre, slug, logo |
| 1.2 | Invitar primer admin de clínica (email → `users` con `clinicId`) |
| 1.3 | Terapeutas dinámicos (dejar de hardcodear diana/sam/vero en `Header.js`) |
| 1.4 | `settings/{clinicId}` en lugar de un solo `clinicConfig` |
| 1.5 | Branding por clínica (CSS variables desde doc `clinics`) |

**Criterio de éxito:** Dos clínicas en la misma app; usuario de clínica A **nunca** ve datos de B (probar en consola y UI).

---

### Fase 2 — **Config agnóstica y onboarding**

| # | Entregable |
|---|------------|
| 2.1 | IDs Google Sheets / Calendar en Firestore por clínica |
| 2.2 | Setup wizard: conectar Google OAuth del admin cliente |
| 2.3 | Panel costos/comisiones 100 % desde UI (sin defaults en código) |
| 2.4 | Activar módulos «SaaS Ready» (recibos, cédula) por flag en `clinics` |
| 2.5 | Custom claims (cerrar S-005): sin emails en `firestore.rules` |

---

### Fase 3 — **Producto comercial**

| # | Entregable |
|---|------------|
| 3.1 | Stripe: planes por número de terapeutas |
| 3.2 | Límite de asientos al invitar terapeutas |
| 3.3 | Capacitor + iconos tienda (misma app, login detecta clínica) |
| 3.4 | Dashboard financiero nativo (opcional: reducir dependencia Excel) |
| 3.5 | Auditoría support: log «support entró a clínica X» |

---

### Fase 4 — **Escala y enterprise** (opcional)

- Proyecto Firebase dedicado por cliente grande (Modelo B).
- SLA, backups exportables, dominio custom `agenda.clinicaX.com`.
- API / integraciones.

---

## 6. Rol «Parláre Support» — permisos sugeridos

| Acción | Support | Admin clínica | Terapeuta |
|--------|---------|---------------|-----------|
| Ver selector de clínicas | ✅ | ❌ | ❌ |
| Entrar a agenda de clínica | ✅ (elegida) | ✅ (la suya) | ✅ (la suya) |
| Ver pacientes / citas | ✅ lectura; escritura según política | ✅ | Solo los suyos |
| Marcar pagado / Excel | ⚠️ Recomendado: solo lectura o con confirmación | ✅ | Según rol |
| Configuración clínica | ❌ o solo lectura | ✅ | ❌ |
| SupportVault / sugerencias globales | ✅ | ❌ | ❌ |
| Alta nueva clínica | ✅ (Fase 1+) | ❌ | ❌ |

**Recomendación:** Support con **lectura + acciones de diagnóstico** al inicio; escritura en pagos solo si el equipo lo pide (reduce riesgo en Excel).

---

## 7. Migración suave de Parláre (sin romper producción)

Orden sugerido:

1. **Deploy reglas** que acepten documentos con o sin `clinicId` (transición).
2. **Script** que ponga `clinicId: 'centro_parlare'` en todos los docs existentes.
3. **Deploy frontend** que siempre filtre por `activeClinicId` (Parláre staff: fijo; support: elegido).
4. **Reglas estrictas** que rechacen docs sin `clinicId`.
5. Índices compuestos: `clinicId + date`, `clinicId + name`, etc.

Backfill estimado: miles de citas — ejecutar en horario bajo (domingo noche).

---

## 8. Comparación con documentación previa

| Tema | `VISION_PARLARE_V2` | Este roadmap |
|------|---------------------|--------------|
| App única multiclínica | ✅ Opción A | ✅ Confirmado |
| `clinicId` obligatorio | ✅ | Fase 0–1 |
| Master Template | ✅ | Mismo repo; Fase 0 no requiere fork |
| Clon Firebase por cliente | Mencionado como aislamiento | Reservado Fase 4 enterprise |
| Capacitor | Fase 2–3 móvil | Fase 3 comercial |
| Finanzas nativas vs Excel | Opción futura | Fase 3 opcional |

---

## 9. Próximos pasos concretos (cuando decidan implementar)

1. **Validar decisión:** Modelo A (multiclínica un Firebase) — recomendado.
2. **Definir slug:** `centro_parlare` como primer `clinicId`.
3. **Crear cuenta Firebase Auth** `support@...` (no reutilizar solo el Gmail personal).
4. **Spike técnico 2 días:** migración 100 citas de prueba + un listener con `where clinicId`.
5. **Fase 0 completa** antes de vender a clínica externa.

---

## 10. Respuesta final a tu pregunta

> *¿Crees que podamos hacer eso?*

**Sí.** Tu escenario («login Parláre Support → entrar a la agenda de Centro Parláre») es el **primer paso natural** del SaaS Opción A:

- **Hoy:** Daniel ya entra y ve Parláre entero; falta el **marco** (rol support, selector, `clinicId`).
- **Mañana (Fase 0):** Misma app, mismo Firebase, datos etiquetados, support elige «Centro Parláre» explícitamente.
- **Después (Fase 1+):** Misma app, misma pantalla de login, **otras clínicas** en el selector.

No hace falta una app distinta ni reescribir la agenda: hace falta **capa de organización + auth de plataforma + migración de datos**.

---

*Última actualización: 30 Jun 2026 — Fase 0 en código (ClinicContext, Support selector, contabilidad por clínica).*
