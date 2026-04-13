# server.ps1 - Simple HTTP Server

$port = 8081
Write-Host "Starting server on http://localhost:$port" -ForegroundColor Green

$listener = [System.Net.HttpListener]::new()
$listener.Prefixes.Add("http://localhost:$port/")
$listener.Start()

Write-Host "Server ready! Open http://localhost:$port in your browser" -ForegroundColor Cyan
Write-Host "Press Ctrl+C to stop" -ForegroundColor Yellow

while ($listener.IsListening) {
    $context = $listener.GetContext()
    $request = $context.Request
    $response = $context.Response

    $path = $request.Url.LocalPath.TrimStart('/')
    if ($path -eq '') { $path = 'index.html' }
    
    $filePath = Join-Path (Get-Location) $path

    if (Test-Path $filePath) {
        $ext = [IO.Path]::GetExtension($filePath)
        $contentType = switch ($ext) {
            '.html' { 'text/html' }
            '.js'   { 'application/javascript' }
            '.css'  { 'text/css' }
            '.png'  { 'image/png' }
            default { 'text/plain' }
        }
        
        $response.ContentType = $contentType
        $response.Headers.Add("Cache-Control", "no-cache, no-store, must-revalidate")
        $response.Headers.Add("Pragma", "no-cache")
        $response.Headers.Add("Expires", "0")
        $content = [IO.File]::ReadAllBytes($filePath)
        $response.OutputStream.Write($content, 0, $content.Length)
        Write-Host "200 $path" -ForegroundColor Green
    } else {
        $response.StatusCode = 404
        Write-Host "404 $path" -ForegroundColor Red
    }
    
    $response.Close()
}
