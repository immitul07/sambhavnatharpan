# ============================================================
# Sambhavnath-Dada-Bhetnu - Project Backup Script
# ============================================================
# Usage:  Right-click this file -> "Run with PowerShell"
#    OR:  Open PowerShell in this folder and run: .\backup.ps1
#
# This script creates a timestamped .zip backup of the project,
# excluding heavy/regenerable folders like node_modules & .expo.
# ============================================================

param(
    [string]$BackupDir = ""  # Optional: custom backup destination folder
)

# --- Configuration ---
$projectDir   = Split-Path -Parent $MyInvocation.MyCommand.Path
$projectName  = Split-Path -Leaf $projectDir
$timestamp    = Get-Date -Format "yyyy-MM-dd_HH-mm-ss"
$zipFileName  = "${projectName}_backup_${timestamp}.zip"

# Folders/files to EXCLUDE from backup (large or regenerable)
$excludeList  = @('node_modules', '.expo', 'backup-*.zip', '*_backup_*.zip')

# Determine backup destination
if ($BackupDir -eq "") {
    $backupPath = Join-Path $projectDir $zipFileName
} else {
    if (-not (Test-Path $BackupDir)) {
        New-Item -ItemType Directory -Path $BackupDir -Force | Out-Null
    }
    $backupPath = Join-Path $BackupDir $zipFileName
}

# --- Functions ---
function Write-Banner {
    param([string]$Message)
    Write-Host ""
    Write-Host "============================================================" -ForegroundColor Cyan
    Write-Host "  $Message" -ForegroundColor Cyan
    Write-Host "============================================================" -ForegroundColor Cyan
    Write-Host ""
}

function Format-FileSize {
    param([long]$Size)
    if ($Size -ge 1GB) { return "{0:N2} GB" -f ($Size / 1GB) }
    if ($Size -ge 1MB) { return "{0:N2} MB" -f ($Size / 1MB) }
    if ($Size -ge 1KB) { return "{0:N2} KB" -f ($Size / 1KB) }
    return "$Size bytes"
}

# --- Main ---
Write-Banner "Backing up: $projectName"
Write-Host "  Project:     $projectDir"
Write-Host "  Destination: $backupPath"
Write-Host "  Excluding:   $($excludeList -join ', ')"
Write-Host ""

# Step 1: Create temp staging directory
$tempDir = Join-Path $env:TEMP "backup_${projectName}_${timestamp}"
Write-Host "[1/3] Staging files..." -ForegroundColor Yellow

try {
    New-Item -ItemType Directory -Path $tempDir -Force | Out-Null

    # Copy everything except excluded items
    Get-ChildItem -Path $projectDir -Exclude $excludeList | ForEach-Object {
        Copy-Item -Path $_.FullName -Destination $tempDir -Recurse -Force
    }

    # Count files staged
    $fileCount = (Get-ChildItem -Path $tempDir -Recurse -File).Count
    Write-Host "      Staged $fileCount files." -ForegroundColor Green

    # Step 2: Compress to zip
    Write-Host "[2/3] Compressing to zip..." -ForegroundColor Yellow
    Compress-Archive -Path "$tempDir\*" -DestinationPath $backupPath -Force

    $zipSize = Format-FileSize (Get-Item $backupPath).Length
    Write-Host "      Archive size: $zipSize" -ForegroundColor Green

    # Step 3: Cleanup temp directory
    Write-Host "[3/3] Cleaning up temp files..." -ForegroundColor Yellow
    Remove-Item -Path $tempDir -Recurse -Force
    Write-Host "      Done!" -ForegroundColor Green

    Write-Banner "Backup Complete!"
    Write-Host "  Saved to: $backupPath" -ForegroundColor Green
    Write-Host "  Size:     $zipSize" -ForegroundColor Green
    Write-Host ""

} catch {
    Write-Host ""
    Write-Host "ERROR: Backup failed!" -ForegroundColor Red
    Write-Host "  $_" -ForegroundColor Red
    Write-Host ""

    # Cleanup on failure
    if (Test-Path $tempDir) {
        Remove-Item -Path $tempDir -Recurse -Force -ErrorAction SilentlyContinue
    }
    exit 1
}

# Keep window open if double-clicked
if ($Host.Name -eq "ConsoleHost") {
    Write-Host ""
    Write-Host "Press any key to close..." -ForegroundColor DarkGray
    $null = $Host.UI.RawUI.ReadKey("NoEcho,IncludeKeyDown")
}
