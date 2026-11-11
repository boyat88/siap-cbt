# Membuat shortcut "SIAP SMP" di Desktop dan Start Menu.
# Jalankan dari folder aplikasi mana pun:
#   powershell.exe -NoProfile -ExecutionPolicy Bypass -File scripts\create-shortcut.ps1

$ErrorActionPreference = 'Stop'

# Lokasi aplikasi mengikuti folder induk dari scripts\, bukan path tetap.
$AppDir = Split-Path -Parent $PSScriptRoot
$Launcher = Join-Path $AppDir 'scripts\open-app.ps1'
$IconPath = Join-Path $AppDir 'public\app-icon.ico'
if (-not (Test-Path $IconPath)) {
    $IconPath = Join-Path $AppDir 'public\siap.ico'
}
$PowerShellExe = 'C:\Windows\System32\WindowsPowerShell\v1.0\powershell.exe'

$Desktop = [Environment]::GetFolderPath('Desktop')
$StartMenu = Join-Path $env:APPDATA 'Microsoft\Windows\Start Menu\Programs'
$ShortcutName = 'SIAP SMP.lnk'

# ---------------------------------------------------------------- ikon
function New-SiapIcon {
    param([string]$Path)

    Add-Type -AssemblyName System.Drawing

    $size = 256
    $bitmap = New-Object System.Drawing.Bitmap($size, $size)
    $graphics = [System.Drawing.Graphics]::FromImage($bitmap)
    $graphics.SmoothingMode = [System.Drawing.Drawing2D.SmoothingMode]::AntiAlias
    $graphics.TextRenderingHint = [System.Drawing.Text.TextRenderingHint]::AntiAliasGridFit
    $graphics.Clear([System.Drawing.Color]::Transparent)

    $rect = New-Object System.Drawing.Rectangle(8, 8, 240, 240)
    $radius = 52
    $diameter = $radius * 2
    $shape = New-Object System.Drawing.Drawing2D.GraphicsPath
    $shape.AddArc($rect.X, $rect.Y, $diameter, $diameter, 180, 90)
    $shape.AddArc($rect.Right - $diameter, $rect.Y, $diameter, $diameter, 270, 90)
    $shape.AddArc($rect.Right - $diameter, $rect.Bottom - $diameter, $diameter, $diameter, 0, 90)
    $shape.AddArc($rect.X, $rect.Bottom - $diameter, $diameter, $diameter, 90, 90)
    $shape.CloseFigure()

    $brush = New-Object System.Drawing.Drawing2D.LinearGradientBrush(
        $rect,
        [System.Drawing.Color]::FromArgb(37, 99, 235),
        [System.Drawing.Color]::FromArgb(15, 23, 42),
        45
    )
    $graphics.FillPath($brush, $shape)

    $center = New-Object System.Drawing.StringFormat
    $center.Alignment = [System.Drawing.StringAlignment]::Center
    $center.LineAlignment = [System.Drawing.StringAlignment]::Center

    $fontMain = New-Object System.Drawing.Font('Segoe UI', 60, [System.Drawing.FontStyle]::Bold, [System.Drawing.GraphicsUnit]::Pixel)
    $graphics.DrawString('SIAP', $fontMain, [System.Drawing.Brushes]::White, (New-Object System.Drawing.RectangleF(0, 72, $size, 90)), $center)

    $fontSub = New-Object System.Drawing.Font('Segoe UI', 28, [System.Drawing.FontStyle]::Bold, [System.Drawing.GraphicsUnit]::Pixel)
    $subBrush = New-Object System.Drawing.SolidBrush([System.Drawing.Color]::FromArgb(147, 197, 253))
    $graphics.DrawString('SMP', $fontSub, $subBrush, (New-Object System.Drawing.RectangleF(0, 162, $size, 50)), $center)

    $stream = New-Object System.IO.MemoryStream
    $bitmap.Save($stream, [System.Drawing.Imaging.ImageFormat]::Png)
    $png = $stream.ToArray()

    $file = [System.IO.File]::Create($Path)
    $writer = New-Object System.IO.BinaryWriter($file)
    $writer.Write([UInt16]0)          # reserved
    $writer.Write([UInt16]1)          # type = icon
    $writer.Write([UInt16]1)          # jumlah gambar
    $writer.Write([Byte]0)            # lebar 256
    $writer.Write([Byte]0)            # tinggi 256
    $writer.Write([Byte]0)            # color count
    $writer.Write([Byte]0)            # reserved
    $writer.Write([UInt16]1)          # color planes
    $writer.Write([UInt16]32)         # bit per pixel
    $writer.Write([UInt32]$png.Length)
    $writer.Write([UInt32]22)         # offset data
    $writer.Write($png)
    $writer.Close()
    $file.Close()

    $graphics.Dispose()
    $bitmap.Dispose()
    $stream.Dispose()
}

try {
    if (-not (Test-Path $IconPath)) {
        New-SiapIcon -Path $IconPath
        Write-Host "Ikon dibuat: $IconPath"
    } else {
        Write-Host "Ikon dipakai: $IconPath"
    }
} catch {
    Write-Host ("Gagal menyiapkan ikon kustom: {0}" -f $_.Exception.Message)
    $IconPath = ''
}

# ---------------------------------------------------------------- shortcut
$shell = New-Object -ComObject WScript.Shell

function New-Shortcut {
    param([string]$Folder)

    if (-not (Test-Path $Folder)) { return }

    $shortcutPath = Join-Path $Folder $ShortcutName
    $shortcut = $shell.CreateShortcut($shortcutPath)
    $shortcut.TargetPath = $PowerShellExe
    $shortcut.Arguments = '-NoProfile -WindowStyle Hidden -ExecutionPolicy Bypass -File "{0}"' -f $Launcher
    $shortcut.WorkingDirectory = $AppDir
    $shortcut.Description = 'Buka aplikasi SIAP SMP - Sistem Informasi Absensi'
    if ($IconPath -and (Test-Path $IconPath)) {
        $shortcut.IconLocation = "$IconPath,0"
    }
    $shortcut.Save()
    Write-Host "Shortcut dibuat: $shortcutPath"
}

New-Shortcut -Folder $Desktop
New-Shortcut -Folder $StartMenu

# Hapus shortcut .url lama agar tidak dobel.
$oldUrl = Join-Path $Desktop 'SIAP SMP.url'
if (Test-Path $oldUrl) {
    Remove-Item $oldUrl -Force
    Write-Host 'Shortcut .url lama dihapus.'
}

Write-Host 'Selesai. Shortcut SIAP SMP siap digunakan.'
