# SmartPlant Cloud - Local HTTP Server
$port = 8080
$listener = New-Object System.Net.HttpListener
$listener.Prefixes.Add("http://localhost:$port/")

try {
    $listener.Start()
} catch {
    Write-Host "Port 8080 is in use, trying 8081..." -ForegroundColor Yellow
    $port = 8081
    $listener = New-Object System.Net.HttpListener
    $listener.Prefixes.Add("http://localhost:$port/")
    $listener.Start()
}

$url = "http://localhost:$port/dashboard.html"

Write-Host "========================================================" -ForegroundColor Green
Write-Host "  SmartPlant Cloud - IoT Dashboard and PWA" -ForegroundColor Green
Write-Host "  Server running at: $url" -ForegroundColor Cyan
Write-Host "  Opening browser..." -ForegroundColor Yellow
Write-Host "  Keep this window open. Press Ctrl+C to stop server." -ForegroundColor Gray
Write-Host "========================================================" -ForegroundColor Green

Start-Process $url

$root = $PSScriptRoot
if (-not $root) { $root = (Get-Location).Path }

$mimeTypes = @{
    '.html'        = 'text/html; charset=utf-8'
    '.htm'         = 'text/html; charset=utf-8'
    '.js'          = 'text/javascript; charset=utf-8'
    '.mjs'         = 'text/javascript; charset=utf-8'
    '.css'         = 'text/css; charset=utf-8'
    '.json'        = 'application/json; charset=utf-8'
    '.webmanifest' = 'application/manifest+json; charset=utf-8'
    '.png'         = 'image/png'
    '.jpg'         = 'image/jpeg'
    '.jpeg'        = 'image/jpeg'
    '.gif'         = 'image/gif'
    '.svg'         = 'image/svg+xml'
    '.ico'         = 'image/x-icon'
}

while ($listener.IsListening) {
    try {
        $context = $listener.GetContext()
        $request = $context.Request
        $response = $context.Response

        $path = $request.Url.LocalPath.TrimStart('/')
        if ([string]::IsNullOrEmpty($path)) { $path = 'dashboard.html' }

        $filePath = Join-Path $root $path
        $fullPath = [System.IO.Path]::GetFullPath($filePath)

        if (-not $fullPath.StartsWith([System.IO.Path]::GetFullPath($root))) {
            $response.StatusCode = 403
            $response.Close()
            continue
        }

        if (Test-Path $fullPath -PathType Leaf) {
            $ext = [System.IO.Path]::GetExtension($fullPath).ToLower()
            $mime = $mimeTypes[$ext]
            if (-not $mime) { $mime = 'application/octet-stream' }

            $bytes = [System.IO.File]::ReadAllBytes($fullPath)
            $response.ContentType = $mime
            $response.ContentLength64 = $bytes.Length
            $response.AddHeader('Access-Control-Allow-Origin', '*')
            $response.AddHeader('Cache-Control', 'no-cache')
            $response.OutputStream.Write($bytes, 0, $bytes.Length)
            $response.StatusCode = 200
        } else {
            $response.StatusCode = 404
            $errBytes = [System.Text.Encoding]::UTF8.GetBytes("404 Not Found")
            $response.ContentType = 'text/plain'
            $response.ContentLength64 = $errBytes.Length
            $response.OutputStream.Write($errBytes, 0, $errBytes.Length)
        }
        $response.Close()
    } catch {
        # Ignore client aborts
    }
}
