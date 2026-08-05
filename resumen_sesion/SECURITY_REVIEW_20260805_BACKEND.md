# Appsec review — backend Python (5 Ago 2026)

**Branch:** `cursor/application-security-review-67a3`  
**Scope:** `/workspace/functions`, `whatsapp_webhook.py`, `serve.py`  
**Commit base:** `4ac1933` (+ mitigations this session)

## New findings (2)

### S-021 — high — Reminder phone_map routes WhatsApp to another therapist's patient by name

- **Location:** `functions/main.py`
- **Attacker:** Authenticated therapist who can create tomorrow-dated appointments they own.
- **Controlled input:** `appointments/{id}.name` (matching another therapist's patient) plus missing/invalid `profileId`.
- **Path:** Peer appointment tomorrow has `profileId` → cron preloads that profile into a **name-keyed** `phone_map`. Attacker creates owned apt with the same display name. Morning/evening reminder cron resolves the attacker apt via `phone_map[name.lower()]` and Twilio-sends the real parent's phone a clinic reminder for the forged slot.
- **Impact:** Cross-therapist WhatsApp to a real parent with attacker-controlled time/therapist; enables follow-on name-based confirm/cancel confusion.
- **Why not duplicate:** Distinct from webhook "name-only WhatsApp matching" (confirm/cancel actions) and Autopilot name-only profile lookup (offer candidates). This is **outbound reminder routing** via shared name index.
- **Mitigation (repo):** `_load_reminder_profiles_by_id` keys only by id; `_resolve_reminder_profile` name fallback requires same `therapist`.

### S-022 — medium — Planted Diana evaluation appointments hijack E2 WhatsApp and clinical flags

- **Location:** `functions/main.py`
- **Attacker:** Authenticated therapist who can update an appointment they currently own.
- **Controlled input:** `isEvaluation`, `evaluationStage`, `profileId`, `date` (today), then `therapist` → `diana` in an owner-authorized update.
- **Path:** Create eval apt under attacker therapist → reassign `therapist` to `diana` (rules check pre-update owner only). `execute_send_diana_evaluation_followup` (21:00) WhatsApps Diana's phone with attacker-chosen name/stage. If Diana taps `eval_yes` / `eval_entrega`, handlers mutate `dianaSession*` / `awaitingDianaNextStage` / `evaluationStage` without verifying the profile belongs to Diana.
- **Impact:** Spam/phishing Diana's WhatsApp under clinic templates; clinical evaluation workflow integrity corruption.
- **Why not duplicate:** Distinct from Autopilot cancel reassignment (offers) and calendar unknown-therapist→Diana OAuth writes. This is the **Diana eval E2/E3 WhatsApp + profile flag** path.
- **Mitigation (repo):** `_profile_therapist_is(profileId, 'diana')` required in E2 cron, `_find_diana_eval_apt_today`, and flag updates; awaiting-next-stage only for Diana profiles.

## Also hardened (already reported / bugs)

- Daily summary: unknown `therapist` keys no longer appended to Diana's roster (same class as prior finding; repo now matches intended fix).
- WhatsApp webhook: define `patient_names` before next-apt lookup (NameError crash).
- Webhook errors: stop reflecting exception strings to WhatsApp users.
- Quiet-hours release: replace undefined `logger` with `print`.

## Explicitly not re-reported (still live / previously flagged)

- `migrate_claims_temp` unauthenticated 200 (live confirmed on `taconotaco-d94fc`).
- Render `/webhook` unsigned; `/cron/*` and `/api/send-message` accept default `parlare_secret_2026`.
- CF `send_*` reject default key (401); CF webhook unsigned → 403.
- Autopilot / opt-in / receipt / staff / sheets formula / googleEventId / keyword substring / hosting SA+Twilio — prior list.

## Deploy

```bash
firebase deploy --only functions
```

## Rejected candidates

- Open-signup JWT → `send_message_api` / `send_reminders_api`: live 401.
- LOGO_URL SSRF: env-only, no attacker control.
- `serve.py` bind `0.0.0.0`: local dev only.
- Missing `webhook_security.py` in git: deploy integrity, not a new attacker path (live auth behaves hardened for default key).
