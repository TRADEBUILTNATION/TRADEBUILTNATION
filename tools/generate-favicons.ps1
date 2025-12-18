param(
  [string]$Source = (Join-Path $PSScriptRoot "..\assets\TB ICON.png"),
  [string]$OutDir = (Join-Path $PSScriptRoot "..\assets"),
  [string]$Suffix = "v2"
)

Set-StrictMode -Version Latest
$ErrorActionPreference = "Stop"

Add-Type -AssemblyName PresentationCore
Add-Type -AssemblyName WindowsBase

function Get-Bgra32BitmapSource([string]$Path) {
  $resolved = (Resolve-Path -LiteralPath $Path).Path
  $uri = [System.Uri]::new($resolved)

  $img = [System.Windows.Media.Imaging.BitmapImage]::new()
  $img.BeginInit()
  $img.CacheOption = [System.Windows.Media.Imaging.BitmapCacheOption]::OnLoad
  $img.UriSource = $uri
  $img.EndInit()
  $img.Freeze()

  $converted = [System.Windows.Media.Imaging.FormatConvertedBitmap]::new(
    $img,
    [System.Windows.Media.PixelFormats]::Bgra32,
    $null,
    0
  )
  $converted.Freeze()
  return $converted
}

function Get-ContentBounds(
  [System.Windows.Media.Imaging.BitmapSource]$Bmp,
  [int]$Threshold = 50,
  [int]$AlphaThreshold = 10
) {
  $width = $Bmp.PixelWidth
  $height = $Bmp.PixelHeight
  $stride = $width * 4
  $pixels = [byte[]]::new($stride * $height)
  $Bmp.CopyPixels($pixels, $stride, 0)

  $minX = $width
  $minY = $height
  $maxX = -1
  $maxY = -1

  for ($y = 0; $y -lt $height; $y++) {
    $row = $y * $stride
    for ($x = 0; $x -lt $width; $x++) {
      $i = $row + ($x * 4)
      $b = $pixels[$i]
      $g = $pixels[$i + 1]
      $r = $pixels[$i + 2]
      $a = $pixels[$i + 3]

      if ($a -le $AlphaThreshold) { continue }

      $brightness = [int](($r + $g + $b) / 3)
      if ($brightness -le $Threshold) { continue }

      if ($x -lt $minX) { $minX = $x }
      if ($y -lt $minY) { $minY = $y }
      if ($x -gt $maxX) { $maxX = $x }
      if ($y -gt $maxY) { $maxY = $y }
    }
  }

  if ($maxX -lt 0) {
    return @{ Left = 0; Top = 0; Right = $width; Bottom = $height }
  }

  return @{ Left = $minX; Top = $minY; Right = ($maxX + 1); Bottom = ($maxY + 1) }
}

function Expand-ToSquareRect(
  [hashtable]$Bounds,
  [int]$ImgW,
  [int]$ImgH,
  [int]$PaddingPx
) {
  $left = [Math]::Max(0, $Bounds.Left - $PaddingPx)
  $top = [Math]::Max(0, $Bounds.Top - $PaddingPx)
  $right = [Math]::Min($ImgW, $Bounds.Right + $PaddingPx)
  $bottom = [Math]::Min($ImgH, $Bounds.Bottom + $PaddingPx)

  $w = $right - $left
  $h = $bottom - $top

  $size = [Math]::Max($w, $h)
  $cx = $left + [int]($w / 2)
  $cy = $top + [int]($h / 2)

  $newLeft = $cx - [int]($size / 2)
  $newTop = $cy - [int]($size / 2)
  $newRight = $newLeft + $size
  $newBottom = $newTop + $size

  if ($newLeft -lt 0) { $newRight -= $newLeft; $newLeft = 0 }
  if ($newTop -lt 0) { $newBottom -= $newTop; $newTop = 0 }

  if ($newRight -gt $ImgW) {
    $diff = $newRight - $ImgW
    $newLeft = [Math]::Max(0, $newLeft - $diff)
    $newRight = $ImgW
  }

  if ($newBottom -gt $ImgH) {
    $diff = $newBottom - $ImgH
    $newTop = [Math]::Max(0, $newTop - $diff)
    $newBottom = $ImgH
  }

  return [System.Windows.Int32Rect]::new(
    $newLeft,
    $newTop,
    ($newRight - $newLeft),
    ($newBottom - $newTop)
  )
}

function Save-Png(
  [System.Windows.Media.Imaging.BitmapSource]$Source,
  [System.Windows.Int32Rect]$CropRect,
  [int]$Size,
  [string]$OutPath
) {
  $cropped = [System.Windows.Media.Imaging.CroppedBitmap]::new($Source, $CropRect)
  $cropped.Freeze()

  $scale = [double]$Size / [double]$CropRect.Width
  $transform = [System.Windows.Media.ScaleTransform]::new($scale, $scale)
  $transform.Freeze()

  $resized = [System.Windows.Media.Imaging.TransformedBitmap]::new($cropped, $transform)
  $resized.Freeze()

  [System.IO.Directory]::CreateDirectory((Split-Path -Parent $OutPath)) | Out-Null

  $encoder = [System.Windows.Media.Imaging.PngBitmapEncoder]::new()
  $encoder.Frames.Add([System.Windows.Media.Imaging.BitmapFrame]::Create($resized))

  $fs = [System.IO.File]::Open($OutPath, [System.IO.FileMode]::Create, [System.IO.FileAccess]::Write)
  try {
    $encoder.Save($fs)
  }
  finally {
    $fs.Dispose()
  }
}

$bmp = Get-Bgra32BitmapSource -Path $Source

$bounds = Get-ContentBounds -Bmp $bmp -Threshold 50 -AlphaThreshold 10
$boundsW = $bounds.Right - $bounds.Left
$boundsH = $bounds.Bottom - $bounds.Top
$pad = [Math]::Max(4, [int]([Math]::Round([Math]::Max($boundsW, $boundsH) * 0.06)))
$cropRect = Expand-ToSquareRect -Bounds $bounds -ImgW $bmp.PixelWidth -ImgH $bmp.PixelHeight -PaddingPx $pad

$outputs = @(
  @{ Name = ("favicon-16x16-$Suffix.png"); Size = 16 },
  @{ Name = ("favicon-32x32-$Suffix.png"); Size = 32 },
  @{ Name = ("apple-touch-icon-$Suffix.png"); Size = 180 },
  @{ Name = ("android-chrome-192x192-$Suffix.png"); Size = 192 },
  @{ Name = ("android-chrome-512x512-$Suffix.png"); Size = 512 }
)

foreach ($o in $outputs) {
  $outPath = Join-Path $OutDir $o.Name
  Save-Png -Source $bmp -CropRect $cropRect -Size ([int]$o.Size) -OutPath $outPath
  Write-Host "Wrote $outPath"
}
