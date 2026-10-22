# ==============================================================================
# SCHOOL MANAGEMENT SYSTEM - DATABASE BACKUP SCRIPT (WINDOWS POWERSHELL)
# ==============================================================================
# Usage:
#   .\database\backup.ps1
#   .\database\backup.ps1 -DatabaseName "school_management" -OutputDir ".\database\backups"
# ==============================================================================

[CmdletBinding()]
param (
    [string]$DatabaseName = "school_management",
    [string]$HostName = "127.0.0.1",
    [int]$Port = 3306,
    [string]$User = "root",
    [string]$OutputDir = "$PSScriptRoot\backups"
)

$ErrorActionPreference = "Stop"

Write-Host "==========================================================" -ForegroundColor Cyan
Write-Host " 📦 SMS MySQL Database Backup Tool" -ForegroundColor Cyan
Write-Host "==========================================================" -ForegroundColor Cyan

# 1. Locate mysqldump.exe
$mysqldumpPath = ""
$commandCheck = Get-Command mysqldump -ErrorAction SilentlyContinue
if ($commandCheck) {
    $mysqldumpPath = $commandCheck.Source
} elseif (Test-Path "C:\Program Files\MySQL\MySQL Server 8.0\bin\mysqldump.exe") {
    $mysqldumpPath = "C:\Program Files\MySQL\MySQL Server 8.0\bin\mysqldump.exe"
} else {
    $search = Get-ChildItem -Path "C:\Program Files\MySQL" -Recurse -Filter "mysqldump.exe" -ErrorAction SilentlyContinue | Select-Object -First 1
    if ($search) {
        $mysqldumpPath = $search.FullName
    } else {
        Write-Error "Could not find mysqldump.exe. Please ensure MySQL Server 8.0 is installed or added to PATH."
        exit 1
    }
}

Write-Host "-> Using mysqldump binary at: $mysqldumpPath" -ForegroundColor Gray

# 2. Prepare output directory
if (-not (Test-Path $OutputDir)) {
    New-Item -ItemType Directory -Path $OutputDir -Force | Out-Null
}

$timestamp = Get-Date -Format "yyyyMMdd_HHmmss"
$backupFile = Join-Path $OutputDir "backup_${DatabaseName}_${timestamp}.sql"

# 3. Securely handle password (prompt without echoing, or reuse $env:MYSQL_PWD)
if (-not $env:MYSQL_PWD) {
    Write-Host "Enter MySQL password for user '$User' (input is masked):" -ForegroundColor Yellow
    $securePass = Read-Host -AsSecureString
    $bstr = [System.Runtime.InteropServices.Marshal]::SecureStringToBSTR($securePass)
    $env:MYSQL_PWD = [System.Runtime.InteropServices.Marshal]::PtrToStringAuto($bstr)
}

Write-Host "-> Starting backup for database '$DatabaseName'..." -ForegroundColor Green

# 4. Execute mysqldump with secure options
# Note: Using MYSQL_PWD environment variable ensures password is never exposed in command line process arguments
try {
    & $mysqldumpPath --host=$HostName --port=$Port --user=$User `
        --single-transaction --routines --triggers --events `
        --default-character-set=utf8mb4 `
        --result-file=$backupFile $DatabaseName

    if ($LASTEXITCODE -ne 0) {
        throw "mysqldump exited with error code $LASTEXITCODE"
    }

    if (Test-Path $backupFile) {
        $fileSize = (Get-Item $backupFile).Length
        Write-Host "==========================================================" -ForegroundColor Green
        Write-Host " ✅ Backup completed successfully!" -ForegroundColor Green
        Write-Host " Location: $backupFile" -ForegroundColor Green
        Write-Host " File Size: $([math]::Round($fileSize / 1KB, 2)) KB" -ForegroundColor Green
        Write-Host "==========================================================" -ForegroundColor Green
    } else {
        throw "Backup file was not created."
    }
} catch {
    Write-Error "Backup failed: $_"
    exit 1
} finally {
    # Clear password from environment
    $env:MYSQL_PWD = ""
}
