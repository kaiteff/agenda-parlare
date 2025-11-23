# update-firebase.ps1 - Script para actualizar firebase.js desde el example

Write-Host "🔧 Actualizando firebase.js..." -ForegroundColor Cyan

# Verificar si existe firebase.js
if (Test-Path ".\js\firebase.js") {
    Write-Host "✅ Encontrado firebase.js existente" -ForegroundColor Green
    
    # Hacer backup
    $backupName = ".\js\firebase.js.backup_$(Get-Date -Format 'yyyyMMdd_HHmmss')"
    Copy-Item ".\js\firebase.js" $backupName
    Write-Host "📦 Backup creado: $backupName" -ForegroundColor Yellow
}
else {
    Write-Host "⚠️  No se encontró firebase.js, se creará uno nuevo" -ForegroundColor Yellow
}

# Copiar el archivo example
Copy-Item ".\js\firebase.example.js" ".\js\firebase.js" -Force
Write-Host "✅ Archivo copiado desde firebase.example.js" -ForegroundColor Green

Write-Host ""
Write-Host "⚠️  IMPORTANTE: Ahora debes editar js\firebase.js y reemplazar:" -ForegroundColor Red
Write-Host "   - apiKey" -ForegroundColor Yellow
Write-Host "   - authDomain" -ForegroundColor Yellow
Write-Host "   - projectId" -ForegroundColor Yellow
Write-Host "   - storageBucket" -ForegroundColor Yellow
Write-Host "   - messagingSenderId" -ForegroundColor Yellow
Write-Host "   - appId" -ForegroundColor Yellow
Write-Host "   - La constante appId exportada" -ForegroundColor Yellow
Write-Host ""
Write-Host "Presiona cualquier tecla para abrir el archivo en el editor..." -ForegroundColor Cyan
$null = $Host.UI.RawUI.ReadKey("NoEcho,IncludeKeyDown")

# Intentar abrir con VS Code, si no está disponible, usar notepad
if (Get-Command code -ErrorAction SilentlyContinue) {
    code ".\js\firebase.js"
}
else {
    notepad ".\js\firebase.js"
}

Write-Host "✅ Listo! Recuerda guardar el archivo después de editar las credenciales." -ForegroundColor Green
