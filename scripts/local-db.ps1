param([switch]$Stop)
$ErrorActionPreference = 'Stop'
$projectRoot = Split-Path $PSScriptRoot -Parent
$dataRoot = Join-Path $projectRoot '.local-data'
$clusterPath = Join-Path $dataRoot 'postgres'
$pgBin = Split-Path (Get-Command psql -ErrorAction Stop).Source
$pgCtl = Join-Path $pgBin 'pg_ctl.exe'
if ($Stop) {
  & $pgCtl -D $clusterPath stop -m fast
  exit $LASTEXITCODE
}
New-Item -ItemType Directory -Path $dataRoot -Force | Out-Null
$envPath = Join-Path $projectRoot '.env.local'
if (-not (Test-Path (Join-Path $clusterPath 'PG_VERSION'))) {
  if (Test-Path $envPath) { throw 'An .env.local already exists. Preserve it and configure PostgreSQL manually, or move it before using local setup.' }
  $adminSecret = [guid]::NewGuid().ToString('N') + [guid]::NewGuid().ToString('N')
  $appSecret = [guid]::NewGuid().ToString('N') + [guid]::NewGuid().ToString('N')
  $sessionSecret = [guid]::NewGuid().ToString('N') + [guid]::NewGuid().ToString('N')
  $pwFile = Join-Path $dataRoot 'init-password.tmp'
  [IO.File]::WriteAllText($pwFile, $adminSecret)
  try {
    & (Join-Path $pgBin 'initdb.exe') -D $clusterPath -U land_owner --auth=scram-sha-256 --encoding=UTF8 --locale=C --pwfile=$pwFile
    if ($LASTEXITCODE -ne 0) { throw 'Database initialization failed' }
  } finally { Remove-Item -LiteralPath $pwFile -Force }
  Add-Content -LiteralPath (Join-Path $clusterPath 'postgresql.conf') -Value "`nport = 55432`nlisten_addresses = '127.0.0.1'"
  $envLines = @('APP_ENV=development','APP_URL=http://127.0.0.1:3000',"SESSION_SECRET=$sessionSecret",'SESSION_HOURS=8',"DATABASE_URL=postgresql://land_app:$appSecret@127.0.0.1:55432/land_records", "MIGRATION_DATABASE_URL=postgresql://land_owner:$adminSecret@127.0.0.1:55432/land_records",'DATABASE_POOL_MAX=10','MODEL_PROVIDER=mock','INTEGRATION_MODE=mock','LOG_LEVEL=info')
  [IO.File]::WriteAllLines($envPath, $envLines)
  $initial = $true
}
& $pgCtl -D $clusterPath status *> $null
if ($LASTEXITCODE -ne 0) {
  & $pgCtl -D $clusterPath -l (Join-Path $dataRoot 'postgres.log') start -w
  if ($LASTEXITCODE -ne 0) { throw 'Database startup failed' }
}
$savedEnv = @{}
Get-Content -LiteralPath $envPath | ForEach-Object { if ($_ -match '^([^#=]+)=(.*)$') { $savedEnv[$matches[1]] = $matches[2] } }
$ownerUri = [uri]$savedEnv['MIGRATION_DATABASE_URL']
$runtimeUri = [uri]$savedEnv['DATABASE_URL']
if ($ownerUri.Host -ne '127.0.0.1' -or $ownerUri.Port -ne 55432) { throw 'Local setup only supports the isolated 55432 cluster.' }
$adminSecret = $ownerUri.UserInfo.Split(':')[1]
$appSecret = $runtimeUri.UserInfo.Split(':')[1]
if ($appSecret -notmatch '^[a-f0-9]{64}$') { throw 'Unexpected locally generated credential format.' }
  $env:PGPASSWORD = $adminSecret
  try {
    $roleExists = & (Join-Path $pgBin 'psql.exe') -h 127.0.0.1 -p 55432 -U land_owner -d postgres -Atc "SELECT 1 FROM pg_roles WHERE rolname='land_app'"
    if ($roleExists -ne '1') { "CREATE ROLE land_app LOGIN PASSWORD '$appSecret';" | & (Join-Path $pgBin 'psql.exe') -h 127.0.0.1 -p 55432 -U land_owner -d postgres -v ON_ERROR_STOP=1 }
    $dbExists = & (Join-Path $pgBin 'psql.exe') -h 127.0.0.1 -p 55432 -U land_owner -d postgres -Atc "SELECT 1 FROM pg_database WHERE datname='land_records'"
    if ($dbExists -ne '1') { 'CREATE DATABASE land_records OWNER land_owner;' | & (Join-Path $pgBin 'psql.exe') -h 127.0.0.1 -p 55432 -U land_owner -d postgres -v ON_ERROR_STOP=1 }
    if ($LASTEXITCODE -ne 0) { throw 'Database provisioning failed' }
  } finally { Remove-Item Env:PGPASSWORD -ErrorAction SilentlyContinue }
Write-Output 'Isolated PostgreSQL is available on 127.0.0.1:55432. Credentials are in ignored .env.local.'
