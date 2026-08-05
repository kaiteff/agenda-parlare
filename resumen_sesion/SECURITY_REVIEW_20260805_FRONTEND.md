# Application security review — 5 Aug 2026 (frontend / rules / hosting)

**Commit scanned:** `5f74d955ebd92ae0198f323a8e0d9e421d1a7ed9`  
**Branch:** `cursor/application-security-review-67a3`  
**Scope:** `js/` (focus list below), `firestore.rules`, `storage.rules`, `firebase.json` hosting exposure  
**Result:** **4 NEW** medium/high findings with validated end-to-end paths (not in the prior 77 flagged set)

## Focus files reviewed (no new issue unless noted)

| File | Outcome |
|------|---------|
| `AdminSettingsModal.js` | **NEW** baseCosts XSS (themes already covered 2026-08-01) |
| `NewFeatureAlert.js` | Static brand/copy only — no attacker input |
| `SuggestionsModal.js` | Form writes `suggestions`; no HTML render of user text |
| `Header.js` | `getDisplayName()` in `innerHTML` is self-XSS / allowlisted names — not reported |
| `AbsenceModal.js` | Conflict names escaped; no new medium+ |
| `ScheduleManager.js` | Patient name via `textContent` — safe |
| `SchedulingQueueService.js` + Reception/expediente UI | Queue fields bound via `.value` / numeric badges — safe |
| `CalendarSuggestions.js` | Suggestion chip uses fixed day/time labels — safe |
| Hosting ignore gaps | SA key / Twilio / internal docs / webhook typo — already flagged |
| AuthManager catch / missing-role | Already flagged |
| Storage any-auth justificantes | Already flagged; no confirmed path-traversal past `{fileName}` segment |

---

## NEW findings

### 1. Clinic baseCosts cost/fee values render as HTML in Admin Settings — **high**

- **Location:** `js/modules/admin/AdminSettingsModal.js`
- **Attacker:** Firestore `isSuper()` principal who can write `settings/clinicConfig` (receptionist via SDK/console bypassing the `SettingsManager.isAdmin()` UI gate; admins via UI).
- **Controlled input:** `settings/clinicConfig.baseCosts.{diana|sam|vero}.cost` and `.fee` (untyped strings accepted by Firestore).
- **Reach path:** Write `baseCosts.diana.cost` to `"><img src=x onerror=…>`. Admin opens **Panel de Configuración → Costos y Comisiones**. `_renderCosts` builds `value="${data.cost}"` / `value="${data.fee}"` into `innerHTML` with no escaping.
- **Impact:** Stored XSS in the admin settings session (CSP allows `unsafe-inline`); theft of Firebase/Google tokens from `localStorage` and actions as the admin.
- **Evidence:** `_renderCosts` ~289–305 interpolates `data.cost` / `data.fee` into attribute values inside `container.innerHTML`. `firestore.rules` `settings` write: `isSuper()`. License/institution fields only `.replace(/"/g,'&quot;')` (still incomplete for other contexts) but cost/fee have **zero** encoding.
- **Why not duplicate:** 2026-08-01 theme-catalog finding covers `themes[].name` / subthemes / items / `theme.id` onclick (and PatientModals theme UIs). It does **not** cover the **Costs** tab `baseCosts.*.cost|fee` sinks.

### 2. AuditPanel activity rows render `userName` as HTML — **high**

- **Location:** `js/modules/admin/AuditPanel.js`
- **Attacker:** Firestore `isSuper()` principal (receptionist/admin) who can create documents in `audit_logs` (default rule `allow read, write: if isSuper()`).
- **Controlled input:** `audit_logs/{id}.userName` (and optionally `action`).
- **Reach path:** `addDoc('audit_logs', { userName: '<img src=x onerror=…>', action: 'CREATE', … })`. Admin/reception opens Bitácora. `createLogCard` inserts `${log.userName}` into `innerHTML` without `escapeHTML`.
- **Impact:** Stored XSS in the audit UI used by admin/reception; session/token theft.
- **Evidence:** `AuditPanel.js` ~175: `<span class="font-bold text-gray-900">${log.userName}</span>`. Normal `AuditService.log` sets `userName` from `displayName`, but rules do not constrain fields on direct writes.
- **Why not duplicate:** Prior AuditPanel findings cover `details.patientName`, `details.therapist`, and WhatsApp `details.message` / cancel notes — not `userName`.

### 3. Multi-therapist calendar chips render raw `appointments.therapist` as HTML — **high**

- **Location:** `js/modules/calendar/CalendarUI.js`
- **Attacker:** Authenticated therapist who can update an appointment they currently own (`isOwner(resource.data.therapist)` on pre-update doc).
- **Controlled input:** `appointments/{id}.therapist` set to markup (e.g. `<img src=x onerror=…>`).
- **Reach path:** Update owned appointment `therapist` to HTML. Firestore update allows it (ownership checked on **existing** therapist only). Afterward only `isSuper()` can read that doc. Admin/reception “Todas” view loads it; multi-therapist chip path does `therapistName = tKey.charAt(0).toUpperCase() + tKey.slice(1)` then interpolates `${therapistName}` into `chip.innerHTML` (paid/blocked/cancelled/default branches ~263–279) with no escape.
- **Impact:** Stored therapist→admin/reception XSS on the main calendar; token theft / actions as privileged staff.
- **Evidence:** `CalendarUI.js` ~235–288 (`isViewAll` chip `innerHTML`). Contrasts with single-therapist cards that `escapeHTML(evt.name)` but still leave `cancelledBy` unescaped (already flagged separately).
- **Why not duplicate:** Prior CalendarUI items are appointment **names** and **cancelledBy** chips. Therapist-key XSS was flagged in Sidebar/Financial/Corte/Audit/PatientModals — **not** this CalendarUI all-view chip builder. Distinct from the Firestore “move records” privilege issue (same write primitive, different impact: XSS vs cross-calendar move).

### 4. Appointment justification “Ver” opens attacker-controlled URLs — **medium**

- **Location:** `js/modules/calendar/CalendarModal.js`
- **Attacker:** Authenticated therapist who can update an owned cancelled appointment.
- **Controlled input:** `appointments/{id}.justificationUrl` (plus `justified: true`, optional `justificationFileName`).
- **Reach path:** Set `justificationUrl` to `https://evil.example/phish` (or `data:text/html,…`). Victim staff opens the cancelled appointment modal and clicks **Ver**. Handler is `window.open(ev.justificationUrl, '_blank')` with no allowlist (https Storage URL only).
- **Impact:** Open redirect / phishing from a trusted clinic UI control; credential harvesting against staff. (`javascript:` is inconsistently blocked by modern browsers; `https:` and `data:` paths are enough for medium.)
- **Evidence:** `CalendarModal.js` ~393–398 (and re-bind ~640 after upload). Upload path writes real Storage download URLs; Firestore update does not restrict `justificationUrl` shape.
- **Why not duplicate:** Prior PatientModals finding is **HTML attribute breakout** inside an inline `onclick="window.open('${url}')"` string. This sink is a **programmatic** `window.open` in CalendarModal with no scheme/host allowlist — different location and failure mode (redirect/phishing vs attribute XSS).

---

## Explicitly not re-reported

Themes/subthemes/items/`theme.id` in `AdminSettingsModal` (bundled into 2026-08-01 PatientModals theme finding); AuthManager missing-role/catch-admin; receptionist settings write; storage justificantes any-auth; hosting SA/Twilio/internal docs/webhook ignore typo; OAuth logout/token; Calendar/Sheets client wipe; open signup users/settings read; appointment cross-read; clinical note squat; etc. (full list in automation flagged JSON).
