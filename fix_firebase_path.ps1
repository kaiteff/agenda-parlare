# Script para corregir la ruta de patientProfilesPath en firebase.js

$firebaseFile = "js\firebase.js"

# Leer el contenido
$content = Get-Content $firebaseFile -Raw -Encoding UTF8

# Reemplazar la ruta incorrecta por la correcta
$oldPattern = 'export const patientProfilesPath = `/artifacts/\$\{appId\}/public/data/patientProfiles`;'
$newPattern = 'export const patientProfilesPath = ''patientProfiles'';'

$content = $content -replace [regex]::Escape($oldPattern), $newPattern

# También intentar con variaciones
$content = $content -replace 'export const patientProfilesPath = `/artifacts/[^`]+`;', 'export const patientProfilesPath = ''patientProfiles'';'

# Guardar
$content | Set-Content $firebaseFile -Encoding UTF8 -NoNewline

Write-Host "✅ Ruta corregida en firebase.js" -ForegroundColor Green
Write-Host "📝 Ahora patientProfilesPath apunta a 'patientProfiles'" -ForegroundColor Cyan
