# ==============================================================================
# SCHOOL MANAGEMENT SYSTEM - DATABASE RESTORATION SCRIPT (WINDOWS POWERSHELL)
# ==============================================================================
# Usage:
#   # Non-destructive test restoration to isolated test database:
#   .\database\restore.ps1 -BackupFilePath ".\database\backups\backup_xxx.sql" -TargetDatabase "school_management_test"
# ==============================================================================

[CmdletBinding()]
param (
    [Parameter(Mandatory=$true)]
    [string]$BackupFilePath,

    [string]$TargetDatabase = "school_management_test",
    [string]$HostName = "127.0.0.1",
    [int]$Port = 3306,
    [string]$User = "root"
)

$ErrorActionPreference = "Stop"

Write-Host "==========================================================" -ForegroundColor Cyan
Write-Host " 🔄 SMS MySQL Database Restoration Tool" -ForegroundColor Cyan
Write-Host "==========================================================" -ForegroundColor Cyan

# 1. Validate backup file existence
if (-not (Test-Path $BackupFilePath)) {
    Write-Error "Backup file does not exist at '$BackupFilePath'."
    exit 1
}

# Safety check: Protect production / main database from accidental restoration
if ($TargetDatabase -eq "school_management") {
    Write-Host "⚠️ WARNING: You have selected the main database ('school_management') as the restore target!" -ForegroundColor Red
    $confirmation = Read-Host "Type 'RESTORE' to proceed with overwriting the main database"
    if ($confirmation -ne "RESTORE") {
        Write-Host "Restoration cancelled by user." -ForegroundColor Yellow
        exit 0
    }
}

# 2. Locate mysql.exe
$mysqlPath = ""
$commandCheck = Get-Command mysql -ErrorAction SilentlyContinue
if ($commandCheck) {
    $mysqlPath = $commandCheck.Source
} elseif (Test-Path "C:\Program Files\MySQL\MySQL Server 8.0\bin\mysql.exe") {
    $mysqlPath = "C:\Program Files\MySQL\MySQL Server 8.0\bin\mysql.exe"
} else {
    $search = Get-ChildItem -Path "C:\Program Files\MySQL" -Recurse -Filter "mysql.exe" -ErrorAction SilentlyContinue | Select-Object -First 1
    if ($search) {
        $mysqlPath = $search.FullName
    } else {
        Write-Error "Could not find mysql.exe. Ensure MySQL Server 8.0 is installed."
        exit 1
    }
}

Write-Host "-> Target Database: $TargetDatabase" -ForegroundColor Yellow
Write-Host "-> Backup File:     $BackupFilePath" -ForegroundColor Gray

# 3. Securely handle password
if (-not $env:MYSQL_PWD) {
    Write-Host "Enter MySQL password for user '$User' (input is masked):" -ForegroundColor Yellow
    $securePass = Read-Host -AsSecureString
    $bstr = [System.Runtime.InteropServices.Marshal]::SecureStringToBSTR($securePass)
    $env:MYSQL_PWD = [System.Runtime.InteropServices.Marshal]::PtrToStringAuto($bstr)
}

try {
    # 4. Ensure target database exists before restoring
    Write-Host "-> Creating target database if it does not exist..." -ForegroundColor Gray
    & $mysqlPath --host=$HostName --port=$Port --user=$User -e "CREATE DATABASE IF NOT EXISTS \`$TargetDatabase\` CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;"

    # 5. Restore backup into target database
    Write-Host "-> Restoring schema and records into '$TargetDatabase'..." -ForegroundColor Green
    Get-Content -Path $BackupFilePath -Raw | & $mysqlPath --host=$HostName --port=$Port --user=$User $TargetDatabase

    if ($LASTEXITCODE -ne 0) {
        throw "MySQL restoration exited with error code $LASTEXITCODE"
    }

    # 6. Run verification checklist query
    Write-Host "-> Verifying restored tables and record counts..." -ForegroundColor Cyan
    $verifyQuery = "SELECT table_name, table_rows FROM information_schema.tables WHERE table_schema = '$TargetDatabase';"
    & $mysqlPath --host=$HostName --port=$Port --user=$User -e $verifyQuery

    Write-Host "==========================================================" -ForegroundColor Green
    Write-Host " ✅ Restoration and verification completed successfully!" -ForegroundColor Green
    Write-Host " Restored into: $TargetDatabase" -ForegroundColor Green
    Write-Host "==========================================================" -ForegroundColor Green
} catch {
    Write-Error "Restoration failed: $_"
    exit 1
} finally {
    $env:MYSQL_PWD = ""
}
