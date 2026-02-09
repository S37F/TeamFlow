# TeamFlow Database Restore Script for PostgreSQL
# This script restores a PostgreSQL database from a backup file

param(
    [Parameter(Mandatory=$true)]
    [string]$BackupFile,
    [switch]$Force
)

# Load environment variables from .env file
if (Test-Path ".env") {
    Get-Content ".env" | ForEach-Object {
        if ($_ -match '^([^=]+)=(.*)$') {
            [Environment]::SetEnvironmentVariable($matches[1], $matches[2], "Process")
        }
    }
}

$DatabaseUrl = $env:DATABASE_URL

if (-not $DatabaseUrl) {
    Write-Error "DATABASE_URL not found in environment variables"
    exit 1
}

# Parse PostgreSQL connection string
if ($DatabaseUrl -match 'postgresql://([^:]+):([^@]+)@([^:]+):(\d+)/(.+)') {
    $DbUser = $matches[1]
    $DbPassword = $matches[2]
    $DbHost = $matches[3]
    $DbPort = $matches[4]
    $DbName = $matches[5]
} else {
    Write-Error "Invalid DATABASE_URL format"
    exit 1
}

# Check if backup file exists
if (-not (Test-Path $BackupFile)) {
    Write-Error "Backup file not found: $BackupFile"
    exit 1
}

# Decompress if needed
$WorkingFile = $BackupFile
if ($BackupFile -match '\.gz$') {
    Write-Host "Decompressing backup file..." -ForegroundColor Cyan
    $DecompressedFile = $BackupFile -replace '\.gz$', ''
    
    if (Get-Command gunzip -ErrorAction SilentlyContinue) {
        gunzip -c $BackupFile > $DecompressedFile
        $WorkingFile = $DecompressedFile
        Write-Host "✓ Decompression completed" -ForegroundColor Green
    } else {
        Write-Error "gunzip not found. Cannot decompress backup file."
        exit 1
    }
}

Write-Host "`n⚠️  WARNING: This will replace all data in the database!" -ForegroundColor Yellow
Write-Host "Database: $DbName" -ForegroundColor Yellow
Write-Host "Host: $DbHost" -ForegroundColor Yellow
Write-Host "Backup file: $WorkingFile" -ForegroundColor Yellow

if (-not $Force) {
    $Confirmation = Read-Host "`nType 'YES' to confirm restoration"
    if ($Confirmation -ne "YES") {
        Write-Host "Restoration cancelled." -ForegroundColor Gray
        exit 0
    }
}

Write-Host "`nStarting database restoration..." -ForegroundColor Cyan

# Set password environment variable
$env:PGPASSWORD = $DbPassword

try {
    # Drop existing connections (optional, be careful in production)
    Write-Host "Terminating existing connections..." -ForegroundColor Cyan
    
    # Restore database
    $psqlArgs = @(
        "-h", $DbHost,
        "-p", $DbPort,
        "-U", $DbUser,
        "-d", $DbName,
        "-f", $WorkingFile,
        "--quiet"
    )

    & psql @psqlArgs

    if ($LASTEXITCODE -eq 0) {
        Write-Host "✓ Database restoration completed successfully!" -ForegroundColor Green
    } else {
        Write-Error "Restoration failed with exit code $LASTEXITCODE"
        exit 1
    }

} catch {
    Write-Error "Restoration failed: $_"
    exit 1
} finally {
    # Clean up password environment variable
    Remove-Item Env:\PGPASSWORD -ErrorAction SilentlyContinue
    
    # Clean up decompressed file if it was created
    if ($WorkingFile -ne $BackupFile -and (Test-Path $WorkingFile)) {
        Remove-Item $WorkingFile -Force
    }
}

Write-Host "`n✓ Restoration process completed successfully!" -ForegroundColor Green
