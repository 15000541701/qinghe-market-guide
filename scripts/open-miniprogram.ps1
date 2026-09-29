$ErrorActionPreference = 'Stop'
$projectRoot = Split-Path -Parent $PSScriptRoot
$cliCandidates = @($env:WECHAT_DEVTOOLS_CLI, 'C:\Program Files (x86)\Tencent\微信web开发者工具\cli.bat', 'C:\Program Files\Tencent\微信web开发者工具\cli.bat')
$wechatCli = $cliCandidates | Where-Object { $_ -and (Test-Path -LiteralPath $_) } | Select-Object -First 1
if (-not $wechatCli) { throw '未找到微信开发者工具。可以设置 WECHAT_DEVTOOLS_CLI，或手动导入项目根目录。' }
$serverPort = 3001
$envFile = Join-Path $projectRoot '.env'
if (Test-Path -LiteralPath $envFile) {
    $portLine = Get-Content -LiteralPath $envFile -Encoding UTF8 | Where-Object { $_ -match '^\s*PORT\s*=\s*(\d+)\s*$' } | Select-Object -First 1
    if ($portLine -and $portLine -match '=\s*(\d+)') { $serverPort = [int]$Matches[1] }
}
function Test-QingheServer {
    try { $response = Invoke-RestMethod -Uri ('http://127.0.0.1:' + $serverPort + '/api/status') -TimeoutSec 2; return ($response.demo -eq $true) } catch { return $false }
}
if (-not (Test-QingheServer)) {
    $occupied = Get-NetTCPConnection -LocalPort $serverPort -State Listen -ErrorAction SilentlyContinue
    if ($occupied) { throw ('端口 ' + $serverPort + ' 已被其他服务占用，请先检查。') }
    $dataPath = Join-Path $projectRoot 'data'
    New-Item -ItemType Directory -Path $dataPath -Force | Out-Null
    $nodePath = (Get-Command node -ErrorAction Stop).Source
    Start-Process -FilePath $nodePath -ArgumentList @('--import','tsx','server/index.ts') -WorkingDirectory $projectRoot -WindowStyle Hidden -RedirectStandardOutput (Join-Path $dataPath 'server.log') -RedirectStandardError (Join-Path $dataPath 'server-error.log') | Out-Null
    for ($attempt = 0; $attempt -lt 15; $attempt++) { if (Test-QingheServer) { break }; Start-Sleep -Milliseconds 300 }
    if (-not (Test-QingheServer)) { throw '后端未能启动，请查看 data/server-error.log。' }
}
Write-Output ('后端已启动：http://127.0.0.1:' + $serverPort)
$phoneAddresses = @(Get-NetIPConfiguration | Where-Object { $_.IPv4DefaultGateway -and $_.NetAdapter.Status -eq 'Up' } | ForEach-Object { 'http://' + $_.IPv4Address.IPAddress + ':' + $serverPort })
$phoneAddresses | ForEach-Object { Write-Output ('同网段手机连接地址：' + $_) }
& node (Join-Path $projectRoot 'scripts\show-connect-qr.mjs') @phoneAddresses
& $wechatCli open --project $projectRoot --lang zh
