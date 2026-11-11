# Membuka SIAP SMP di tab browser biasa (bukan jendela aplikasi terpisah).
#
# Versi cepat:
#  - Status server dicek lewat koneksi TCP langsung (beberapa milidetik),
#    bukan Get-NetTCPConnection yang bisa memakan 1-4 detik.
#  - Jika server mati, Node dijalankan tanpa jendela lalu ditunggu tiap 40 ms
#    (server biasanya siap < 0,5 detik), bukan menunggu 1 detik per percobaan.
#  - Tidak lagi mencoba Scheduled Task yang tidak terpasang (dulu memakan
#    waktu 2 detik lebih dan tetap gagal).

$ErrorActionPreference = 'SilentlyContinue'
$Port = 5173
$ProjectDir = Split-Path -Parent $PSScriptRoot
$Url = "http://localhost:$Port"

function Test-Server {
    $client = New-Object System.Net.Sockets.TcpClient
    try {
        $async = $client.BeginConnect('127.0.0.1', $Port, $null, $null)
        if (-not $async.AsyncWaitHandle.WaitOne(200)) { return $false }
        $client.EndConnect($async)
        return $true
    } catch {
        return $false
    } finally {
        $client.Close()
    }
}

function Start-Server {
    # Utamakan Node portabel di dalam folder aplikasi (hasil pemindahan laptop),
    # lalu Node yang terpasang di Windows.
    $nodeCandidates = @(
        (Join-Path $ProjectDir 'runtime\node.exe'),
        "$env:ProgramFiles\nodejs\node.exe",
        "${env:ProgramFiles(x86)}\nodejs\node.exe",
        "$env:LOCALAPPDATA\Programs\nodejs\node.exe"
    )
    $node = $nodeCandidates | Where-Object { Test-Path $_ } | Select-Object -First 1
    if (-not $node) {
        $node = (Get-Command node -ErrorAction SilentlyContinue).Source
    }
    if (-not $node) { return }

    # Dijalankan terpisah dari skrip ini dan tanpa jendela console.
    Start-Process -FilePath $node `
        -ArgumentList @('"{0}"' -f (Join-Path $ProjectDir 'server.cjs')) `
        -WorkingDirectory $ProjectDir `
        -WindowStyle Hidden
}

if (-not (Test-Server)) {
    Start-Server

    # Tunggu maksimal 5 detik; cek tiap 40 ms agar tidak ada jeda yang terasa.
    for ($i = 0; $i -lt 125; $i++) {
        Start-Sleep -Milliseconds 40
        if (Test-Server) { break }
    }
}

# Urutan prioritas browser: Microsoft Edge, lalu Chrome, lalu browser Chromium lain.
$browserCandidates = @(
    "${env:ProgramFiles(x86)}\Microsoft\Edge\Application\msedge.exe",
    "$env:ProgramFiles\Microsoft\Edge\Application\msedge.exe",
    "$env:ProgramFiles\Google\Chrome\Application\chrome.exe",
    "${env:ProgramFiles(x86)}\Google\Chrome\Application\chrome.exe",
    "$env:LOCALAPPDATA\Google\Chrome\Application\chrome.exe",
    "$env:ProgramFiles\BraveSoftware\Brave-Browser\Application\brave.exe",
    "${env:ProgramFiles(x86)}\BraveSoftware\Brave-Browser\Application\brave.exe",
    "$env:LOCALAPPDATA\BraveSoftware\Brave-Browser\Application\brave.exe",
    "$env:LOCALAPPDATA\Programs\Opera\launcher.exe",
    "$env:LOCALAPPDATA\Vivaldi\Application\vivaldi.exe"
)

$browser = $browserCandidates | Where-Object { Test-Path $_ } | Select-Object -First 1

if ($browser) {
    # Buka sebagai tab halaman web biasa, bukan jendela aplikasi (tanpa --app).
    Start-Process -FilePath $browser -ArgumentList @($Url)
} else {
    Start-Process $Url
}
