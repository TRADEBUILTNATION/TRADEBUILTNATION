param(
  [string]$ModelsDir = (Join-Path $PSScriptRoot "..\assets\3D Models"),
  [string]$OutFile = (Join-Path $PSScriptRoot "..\assets\models.json")
)

$ErrorActionPreference = "Stop"

if (-not (Test-Path -LiteralPath $ModelsDir)) {
  throw "Models directory not found: $ModelsDir"
}

$files = Get-ChildItem -LiteralPath $ModelsDir -File |
  Where-Object { $_.Extension -in @(".glb", ".gltf") } |
  Sort-Object Name

$models = @()
foreach ($f in $files) {
  $name = [System.IO.Path]::GetFileNameWithoutExtension($f.Name)
  $name = ($name -replace '[_-]+', ' ').Trim()
  $models += @{
    file = $f.Name
    name = $name
  }
}

$payload = @{
  basePath = "assets/3D Models/"
  models = $models
}

$json = $payload | ConvertTo-Json -Depth 6
$json | Set-Content -LiteralPath $OutFile -Encoding UTF8

Write-Host "Wrote $($models.Count) model(s) to $OutFile"


