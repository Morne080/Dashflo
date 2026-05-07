param(
    [string]$EnvPath = ".env",
    [string]$OutputPath = ""
)

$ErrorActionPreference = "Stop"

function Read-EnvValue {
    param(
        [string[]]$Lines,
        [string]$Key
    )

    $line = $Lines | Where-Object { $_ -match "^$Key=" } | Select-Object -First 1
    if (-not $line) { return "" }
    return $line.Substring($Key.Length + 1).Trim("'`"")
}

if (-not (Test-Path $EnvPath)) {
    throw "Could not find env file at '$EnvPath'."
}

$envLines = Get-Content $EnvPath
$dbHost = Read-EnvValue -Lines $envLines -Key "DB_HOST"
$dbPort = Read-EnvValue -Lines $envLines -Key "DB_PORT"
$dbName = Read-EnvValue -Lines $envLines -Key "DB_DATABASE"
$dbUser = Read-EnvValue -Lines $envLines -Key "DB_USERNAME"
$dbPass = Read-EnvValue -Lines $envLines -Key "DB_PASSWORD"

if ([string]::IsNullOrWhiteSpace($dbName) -or [string]::IsNullOrWhiteSpace($dbUser)) {
    throw "DB_DATABASE/DB_USERNAME missing in $EnvPath."
}

if ([string]::IsNullOrWhiteSpace($dbHost)) { $dbHost = "127.0.0.1" }
if ([string]::IsNullOrWhiteSpace($dbPort)) { $dbPort = "3306" }

if ([string]::IsNullOrWhiteSpace($OutputPath)) {
    $stamp = Get-Date -Format "yyyyMMdd-HHmmss"
    $OutputPath = "database/dumps/$dbName-$stamp.sql"
}

$outputDir = Split-Path -Parent $OutputPath
if (-not [string]::IsNullOrWhiteSpace($outputDir) -and -not (Test-Path $outputDir)) {
    New-Item -ItemType Directory -Path $outputDir | Out-Null
}

$args = @(
    "--host=$dbHost",
    "--port=$dbPort",
    "--user=$dbUser",
    "--default-character-set=utf8mb4",
    "--single-transaction",
    "--quick",
    "--routines",
    "--triggers",
    $dbName
)

if (-not [string]::IsNullOrWhiteSpace($dbPass)) {
    $args = @("--password=$dbPass") + $args
}

Write-Host "==> Exporting database '$dbName' to '$OutputPath'"

$process = Start-Process -FilePath "mysqldump" -ArgumentList $args -NoNewWindow -Wait -PassThru -RedirectStandardOutput $OutputPath
if ($process.ExitCode -ne 0) {
    throw "mysqldump failed with exit code $($process.ExitCode)."
}

Write-Host "Done. SQL dump created at $OutputPath"
