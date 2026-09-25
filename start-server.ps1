# Simple HTTP Server for CoinDrop
$port = 8080
$url = "http://localhost:$port/"

Write-Host "Starting CoinDrop server on $url" -ForegroundColor Green
Write-Host "Press Ctrl+C to stop the server" -ForegroundColor Yellow
Write-Host ""

# Create HTTP listener
$listener = New-Object System.Net.HttpListener
$listener.Prefixes.Add($url)
$listener.Start()

Write-Host "Server started! Opening browser..." -ForegroundColor Green
Start-Process $url

Write-Host "Server is running. Serving files from: $(Get-Location)" -ForegroundColor Cyan
Write-Host ""

# Main server loop
try {
    while ($listener.IsListening) {
        $context = $listener.GetContext()
        $request = $context.Request
        $response = $context.Response
        
        # Get requested file path
        $path = $request.Url.LocalPath
        if ($path -eq "/") { $path = "/index.html" }
        $filePath = Join-Path (Get-Location) $path.TrimStart('/')
        
        Write-Host "$(Get-Date -Format 'HH:mm:ss') - $($request.HttpMethod) $path" -ForegroundColor Gray
        
        if (Test-Path $filePath -PathType Leaf) {
            # Determine content type
            $contentType = switch ([System.IO.Path]::GetExtension($filePath)) {
                ".html" { "text/html" }
                ".css"  { "text/css" }
                ".js"   { "application/javascript" }
                ".json" { "application/json" }
                ".png"  { "image/png" }
                ".jpg"  { "image/jpeg" }
                ".gif"  { "image/gif" }
                ".svg"  { "image/svg+xml" }
                default { "application/octet-stream" }
            }
            
            # Read and send file
            $content = [System.IO.File]::ReadAllBytes($filePath)
            $response.ContentType = $contentType
            $response.ContentLength64 = $content.Length
            $response.OutputStream.Write($content, 0, $content.Length)
        }
        else {
            # 404 Not Found
            $response.StatusCode = 404
            $html = "<h1>404 - File Not Found</h1><p>$path</p>"
            $buffer = [System.Text.Encoding]::UTF8.GetBytes($html)
            $response.ContentLength64 = $buffer.Length
            $response.OutputStream.Write($buffer, 0, $buffer.Length)
        }
        
        $response.Close()
    }
}
finally {
    $listener.Stop()
    Write-Host "`nServer stopped." -ForegroundColor Yellow
}
