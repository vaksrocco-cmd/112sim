# Local preview without Node: serves this folder on http://localhost:<Port>/.
# There is no /api here, so the app uses the scripted dispatcher.
param([int]$Port = 5173)

$root = $PSScriptRoot
$types = @{ '.html' = 'text/html; charset=utf-8'; '.css' = 'text/css'; '.js' = 'text/javascript'; '.json' = 'application/json'; '.mp4' = 'video/mp4'; '.svg' = 'image/svg+xml'; '.png' = 'image/png'; '.jpg' = 'image/jpeg' }

$listener = New-Object System.Net.HttpListener
$listener.Prefixes.Add("http://localhost:$Port/")
$listener.Start()
Write-Host "Serving $root on http://localhost:$Port/"

while ($listener.IsListening) {
  $ctx = $listener.GetContext()
  try {
    $rel = [Uri]::UnescapeDataString($ctx.Request.Url.AbsolutePath).TrimStart('/')
    if ($rel -eq '') { $rel = 'index.html' }
    $path = [IO.Path]::GetFullPath((Join-Path $root $rel))
    if ($ctx.Request.HttpMethod -eq 'GET' -and $path.StartsWith($root) -and (Test-Path $path -PathType Leaf)) {
      $bytes = [IO.File]::ReadAllBytes($path)
      $type = $types[[IO.Path]::GetExtension($path).ToLower()]
      if ($type) { $ctx.Response.ContentType = $type }
      $ctx.Response.Headers.Add('Cache-Control', 'no-store')
      $ctx.Response.OutputStream.Write($bytes, 0, $bytes.Length)
    } else {
      $ctx.Response.StatusCode = 404
    }
  } catch {
    $ctx.Response.StatusCode = 500
  } finally {
    $ctx.Response.Close()
  }
}
