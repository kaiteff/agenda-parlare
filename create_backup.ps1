# Script para crear backups automáticos del proyecto
# Uso: .\create_backup.ps1 -Message "Descripción del backup"

param(
    [string]$Message = "Backup automático"
)

# Crear carpeta de backups si no existe
$backupRoot = "backups"
if (-not (Test-Path $backupRoot)) {
    New-Item -ItemType Directory -Path $backupRoot | Out-Null
}

# Crear carpeta con fecha y hora
$timestamp = Get-Date -Format "yyyy-MM-dd_HH-mm-ss"
$backupFolder = Join-Path $backupRoot $timestamp
New-Item -ItemType Directory -Path $backupFolder | Out-Null

# Archivos y carpetas a respaldar (excluyendo la carpeta de backups)
$itemsToBackup = Get-ChildItem -Path . -Force | Where-Object { $_.Name -ne 'backups' }

# Copiar archivos y carpetas
foreach ($item in $itemsToBackup) {
    Copy-Item -Path $item.FullName -Destination $backupFolder -Recurse -Force
}

# Copiar archivos


# Crear archivo de metadata
$metadata = "Backup creado: $timestamp`nMensaje: $Message"
$metadata | Out-File -FilePath (Join-Path $backupFolder "backup_info.txt") -Encoding UTF8

Write-Host "Backup creado exitosamente en: $backupFolder" -ForegroundColor Green
Write-Host "Mensaje: $Message" -ForegroundColor Cyan
