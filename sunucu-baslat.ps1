# Backend'i ve Cloudflare tunelini gizli pencerede baslatir, kapanirlarsa
# yeniden acar. Windows oturumu acilinca Zamanlanmis Gorev tarafindan calistirilir
# ("Turan Tarim Sunucu"). Kayitlar loglar/ klasorune yazilir.

$proje = $PSScriptRoot
$loglar = Join-Path $proje 'loglar'
New-Item -ItemType Directory -Force $loglar | Out-Null

$node = 'C:\Program Files\nodejs\node.exe'
$cloudflared = 'C:\Program Files (x86)\cloudflared\cloudflared.exe'
# cnrsystem.tr "yapim asamasinda" sayfasi (C++), tunelde 8080'e yonlenir
$cnrsite = 'C:\Users\kadir\Desktop\cnrsystem-site\cnrsite.exe'

function PortAcikMi($port) {
  $istemci = New-Object Net.Sockets.TcpClient
  try { $istemci.Connect('127.0.0.1', $port); return $true } catch { return $false } finally { $istemci.Close() }
}

function Kaydet($mesaj) {
  Add-Content -Path (Join-Path $loglar 'baslatici.log') -Value "$(Get-Date -Format 'yyyy-MM-dd HH:mm:ss') $mesaj"
}

# PostgreSQL servisi acilista biraz gec hazir olabilir
for ($i = 0; $i -lt 60 -and -not (PortAcikMi 5432); $i++) { Start-Sleep 2 }

$backend = $null
while ($true) {
  if (-not (PortAcikMi 4000) -and ($null -eq $backend -or $backend.HasExited)) {
    Kaydet 'Backend baslatiliyor'
    $backend = Start-Process $node -ArgumentList 'src/index.js' -WorkingDirectory (Join-Path $proje 'backend') `
      -WindowStyle Hidden -PassThru `
      -RedirectStandardOutput (Join-Path $loglar 'backend.log') -RedirectStandardError (Join-Path $loglar 'backend-hata.log')
  }
  if ((Test-Path $cnrsite) -and -not (PortAcikMi 8080)) {
    Kaydet 'cnrsystem.tr sitesi baslatiliyor'
    Start-Process $cnrsite -ArgumentList '8080' -WindowStyle Hidden `
      -RedirectStandardOutput (Join-Path $loglar 'cnrsite.log') -RedirectStandardError (Join-Path $loglar 'cnrsite-hata.log')
  }
  if (-not (Get-Process cloudflared -ErrorAction SilentlyContinue)) {
    Kaydet 'Tunel baslatiliyor'
    Start-Process $cloudflared -ArgumentList 'tunnel', 'run', 'turan-tarim' -WindowStyle Hidden `
      -RedirectStandardOutput (Join-Path $loglar 'tunel.log') -RedirectStandardError (Join-Path $loglar 'tunel-hata.log')
  }
  Start-Sleep 30
}
