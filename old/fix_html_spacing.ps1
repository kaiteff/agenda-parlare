# Fix HTML spacing issues in patients.js

$file = "g:\Mi unidad\AG\js\patients.js"
$content = Get-Content $file -Raw

# Fix className spacing
$content = $content -replace 'p - 3 rounded - lg border', 'p-3 rounded-lg border'

# Fix opening div tag
$content = $content -replace '< div class="flex items-start justify-between" >', '<div class="flex items-start justify-between">'

# Fix closing div tags
$content = $content -replace '< /div>', '</div>'
$content = $content -replace '< /div >', '</div>'

# Save the file
Set-Content -Path $file -Value $content -NoNewline

Write-Host "✅ Fixed HTML spacing issues in patients.js"
