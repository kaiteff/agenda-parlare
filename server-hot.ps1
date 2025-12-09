# server-hot.ps1 - HTTP Server with Hot Reload
# Uso: .\server-hot.ps1

$port = 8086
Write-Host "Starting server with HOT RELOAD on http://localhost:$port" -ForegroundColor Green

# Script de auto-reload que se inyecta en el HTML
$reloadScript = @"
<script>
(function() {
    let lastCheck = Date.now();
    let failures = 0;
    
    // Polling function
    const checkReload = async () => {
        try {
            const response = await fetch('/check-reload?t=' + lastCheck, {
                cache: 'no-store',
                keepalive: true
            });
            if (!response.ok) throw new Error('Network response was not ok');
            
            const data = await response.text();
            failures = 0; // Reset failures on success
            
            if (data === 'reload') {
                console.log('🔄 Hot reload: cambios detectados');
                location.reload();
            }
            lastCheck = Date.now();
        } catch(e) {
            failures++;
            // Exponential backoff for errors up to 10s
            if (failures > 10) console.warn("Hot reload connection lost, retrying...");
        }
        
        // Schedule next check
        // If failing, back off (min 1s, max 10s)
        const nextDelay = failures > 0 ? Math.min(10000, 1000 * Math.pow(1.5, failures)) : 1000;
        setTimeout(checkReload, nextDelay);
    };

    // Start polling
    checkReload();
})();
</script>
"@

$listener = [System.Net.HttpListener]::new()
$listener.Prefixes.Add("http://localhost:$port/")
$listener.Start()

Write-Host "Server ready! Open http://localhost:$port in your browser" -ForegroundColor Cyan
Write-Host "Hot Reload: ENABLED (watching .js, .html, .css files)" -ForegroundColor Yellow
Write-Host "Press Ctrl+C to stop" -ForegroundColor Yellow

# Guardar timestamps de archivos
$script:fileTimestamps = @{}

function Get-FileTimestamps {
    $timestamps = @{}
    Get-ChildItem -Path . -Include *.js, *.html, *.css -Recurse -File | ForEach-Object {
        $timestamps[$_.FullName] = $_.LastWriteTime
    }
    return $timestamps
}

function Check-FilesChanged {
    $current = Get-FileTimestamps
    foreach ($file in $current.Keys) {
        if (-not $script:fileTimestamps.ContainsKey($file) -or 
            $script:fileTimestamps[$file] -ne $current[$file]) {
            return $true
        }
    }
    return $false
}

$script:fileTimestamps = Get-FileTimestamps

while ($listener.IsListening) {
    $context = $listener.GetContext()
    $request = $context.Request
    $response = $context.Response

    $path = $request.Url.LocalPath.TrimStart('/')
    
    # Endpoint especial para check de reload
    if ($path -eq 'check-reload') {
        $response.ContentType = 'text/plain'
        if (Check-FilesChanged) {
            $script:fileTimestamps = Get-FileTimestamps
            $bytes = [System.Text.Encoding]::UTF8.GetBytes('reload')
            Write-Host "🔄 Cambios detectados - enviando reload" -ForegroundColor Magenta
        }
        else {
            $bytes = [System.Text.Encoding]::UTF8.GetBytes('ok')
        }
        $response.OutputStream.Write($bytes, 0, $bytes.Length)
        $response.Close()
        continue
    }
    
    if ($path -eq '') { $path = 'index.html' }
    
    $filePath = Join-Path (Get-Location) $path

    if (Test-Path $filePath) {
        $ext = [IO.Path]::GetExtension($filePath)
        $contentType = switch ($ext) {
            '.html' { 'text/html' }
            '.js' { 'application/javascript' }
            '.css' { 'text/css' }
            '.png' { 'image/png' }
            default { 'text/plain' }
        }
        
        $response.ContentType = $contentType
        $response.Headers.Add("Cache-Control", "no-cache, no-store, must-revalidate")
        $response.Headers.Add("Pragma", "no-cache")
        $response.Headers.Add("Expires", "0")
        
        # Si es HTML, inyectar script de reload
        if ($ext -eq '.html') {
            $content = [IO.File]::ReadAllText($filePath)
            $content = $content -replace '</body>', "$reloadScript</body>"
            $bytes = [System.Text.Encoding]::UTF8.GetBytes($content)
        }
        else {
            $bytes = [IO.File]::ReadAllBytes($filePath)
        }
        
        $response.OutputStream.Write($bytes, 0, $bytes.Length)
        Write-Host "200 $path" -ForegroundColor Green
    }
    else {
        $response.StatusCode = 404
        Write-Host "404 $path" -ForegroundColor Red
    }
    
    $response.Close()
}
