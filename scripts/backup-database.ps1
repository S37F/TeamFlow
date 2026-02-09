# TeamFlow Database Backup Script for PostgreSQL
# This script creates timestamped backups of the PostgreSQL database

param(
    [string]$BackupDir = ".\backups",
    [int]$RetentionDays = 7
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

# Create backup directory if it doesn't exist
if (-not (Test-Path $BackupDir)) {
    New-Item -ItemType Directory -Path $BackupDir | Out-Null
    Write-Host "✓ Created backup directory: $BackupDir" -ForegroundColor Green
}

# Generate timestamp for backup filename
$Timestamp = Get-Date -Format "yyyyMMdd_HHmmss"
$BackupFile = Join-Path $BackupDir "teamflow_backup_$Timestamp.sql"

Write-Host "Starting database backup..." -ForegroundColor Cyan
Write-Host "Database: $DbName" -ForegroundColor Gray
Write-Host "Host: $DbHost" -ForegroundColor Gray
Write-Host "Backup file: $BackupFile" -ForegroundColor Gray

# Set password environment variable for pg_dump
$env:PGPASSWORD = $DbPassword

try {
    # Execute pg_dump
    $pgDumpArgs = @(
        "-h", $DbHost,
        "-p", $DbPort,
        "-U", $DbUser,
        "-d", $DbName,
        "-F", "p",  # Plain text format
        "-f", $BackupFile,
        "--verbose"
    )

    # Check if pg_dump is available
    $pgDumpPath = Get-Command pg_dump -ErrorAction SilentlyContinue
    
    if (-not $pgDumpPath) {
        Write-Host "pg_dump not found in PATH. Attempting common installation paths..." -ForegroundColor Yellow
        
        # Common PostgreSQL installation paths
        $commonPaths = @(
            "C:\Program Files\PostgreSQL\*\bin",
            "C:\Program Files (x86)\PostgreSQL\*\bin"
        )
        
        foreach ($path in $commonPaths) {
            $pgDumpPath = Get-ChildItem -Path $path -Filter "pg_dump.exe" -Recurse -ErrorAction SilentlyContinue | Select-Object -First 1
            if ($pgDumpPath) {
                Write-Host "Found pg_dump at: $($pgDumpPath.FullName)" -ForegroundColor Green
                break
            }
        }
        
        if (-not $pgDumpPath) {
            Write-Error "pg_dump not found. Please install PostgreSQL client tools or add them to PATH."
            exit 1
        }
    }

    & pg_dump @pgDumpArgs

    if ($LASTEXITCODE -eq 0) {
        $FileSize = (Get-Item $BackupFile).Length / 1MB
        Write-Host "✓ Backup completed successfully!" -ForegroundColor Green
        Write-Host "  File: $BackupFile" -ForegroundColor Green
        Write-Host "  Size: $([math]::Round($FileSize, 2)) MB" -ForegroundColor Green

        # Compress backup
        $CompressedFile = "$BackupFile.gz"
        Write-Host "Compressing backup..." -ForegroundColor Cyan
        
        if (Get-Command gzip -ErrorAction SilentlyContinue) {
            gzip $BackupFile
            if (Test-Path $CompressedFile) {
                $CompressedSize = (Get-Item $CompressedFile).Length / 1MB
                Write-Host "✓ Compression completed!" -ForegroundColor Green
                Write-Host "  File: $CompressedFile" -ForegroundColor Green
                Write-Host "  Size: $([math]::Round($CompressedSize, 2)) MB" -ForegroundColor Green
            }
        } else {
            Write-Host "gzip not found. Backup saved uncompressed." -ForegroundColor Yellow
        }

        # Clean up old backups
        Write-Host "Cleaning up old backups (retention: $RetentionDays days)..." -ForegroundColor Cyan
        $CutoffDate = (Get-Date).AddDays(-$RetentionDays)
        $OldBackups = Get-ChildItem -Path $BackupDir -Filter "teamflow_backup_*.sql*" | Where-Object { $_.LastWriteTime -lt $CutoffDate }
        
        if ($OldBackups) {
            $OldBackups | ForEach-Object {
                Remove-Item $_.FullName -Force
                Write-Host "  Deleted: $($_.Name)" -ForegroundColor Gray
            }
            Write-Host "✓ Cleanup completed. Removed $($OldBackups.Count) old backup(s)." -ForegroundColor Green
        } else {
            Write-Host "  No old backups to remove." -ForegroundColor Gray
        }

    } else {
        Write-Error "Backup failed with exit code $LASTEXITCODE"
        exit 1
    }

} catch {
    Write-Error "Backup failed: $_"
    exit 1
} finally {
    # Clean up password environment variable
    Remove-Item Env:\PGPASSWORD -ErrorAction SilentlyContinue
}

Write-Host "`n✓ Backup process completed successfully!" -ForegroundColor Green
