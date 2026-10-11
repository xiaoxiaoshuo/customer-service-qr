#requires -Version 5.1
[CmdletBinding()]
param(
    [switch]$Apply,
    [string]$Profile
)

# Fixed existing production target. Never sync/delete the entire bucket.
$ErrorActionPreference = 'Stop'
$repo = Split-Path -Parent $PSScriptRoot
$bucket = 'oss://yunshufe/'
$region = 'cn-beijing'
$publicUrl = 'https://www.denuoxuankeji.com/'
$cacheControl = 'no-cache, max-age=0, must-revalidate'
$files = @(
    @{ Name = 'app.js'; ContentType = 'application/javascript; charset=utf-8' },
    @{ Name = 'styles.css'; ContentType = 'text/css; charset=utf-8' },
    @{ Name = 'customer-service-qr.jpg'; ContentType = 'image/jpeg' },
    @{ Name = 'index.html'; ContentType = 'text/html; charset=utf-8' }
)
$paths = @($files | ForEach-Object { 'docs/' + $_.Name })
$commonArgs = @('--region', $region)
if ($Profile) { $commonArgs += @('--profile', $Profile) }

function Invoke-Oss {
    param([string[]]$OssArgs)
    & ossutil @OssArgs @commonArgs
    if ($LASTEXITCODE -ne 0) {
        throw "ossutil failed ($LASTEXITCODE): $($OssArgs[0])"
    }
}

Get-Command git -ErrorAction Stop | Out-Null
Get-Command ossutil -ErrorAction Stop | Out-Null
$commit = git -C $repo rev-parse HEAD
if ($LASTEXITCODE -ne 0) { throw 'Cannot determine the Git release commit.' }
git -C $repo ls-files --error-unmatch -- @paths | Out-Null
if ($LASTEXITCODE -ne 0) { throw 'All four website files must be tracked by Git.' }
git -C $repo diff --quiet HEAD -- @paths
if ($LASTEXITCODE -ne 0) { throw 'Commit the website changes before deploying.' }

$runId = '{0}-{1}-{2}' -f (Get-Date -Format 'yyyyMMdd-HHmmss'), $commit.Substring(0, 7), ([guid]::NewGuid().ToString('N').Substring(0, 8))
$runDir = Join-Path (Join-Path $repo '.deploy-artifacts') $runId
$beforeDir = Join-Path $runDir 'before'
$releaseDir = Join-Path $runDir 'release'
$verifyDir = Join-Path $runDir 'verified'
foreach ($dir in @($beforeDir, $releaseDir, $verifyDir)) {
    New-Item -ItemType Directory -Path $dir -Force | Out-Null
}
$manifest = [ordered]@{
    status = 'Preparing'
    apply = [bool]$Apply
    commit = $commit
    bucket = $bucket
    region = $region
    publicUrl = $publicUrl
    startedAt = (Get-Date).ToString('o')
    finishedAt = $null
    files = @()
    error = $null
}
$manifestPath = Join-Path $runDir 'manifest.json'
function Save-Manifest {
    $manifest | ConvertTo-Json -Depth 6 | Set-Content -LiteralPath $manifestPath -Encoding UTF8
}

try {
    foreach ($file in $files) {
        $name = $file.Name
        $snapshot = Join-Path $releaseDir $name
        Copy-Item -LiteralPath (Join-Path $repo "docs/$name") -Destination $snapshot
        $manifest.files += [ordered]@{
            name = $name
            destination = "$bucket$name"
            contentType = $file.ContentType
            sha256 = (Get-FileHash -Algorithm SHA256 -LiteralPath $snapshot).Hash.ToLowerInvariant()
            backupSha256 = $null
            uploaded = $false
            verified = $false
        }
    }
    # Catch working-tree or HEAD changes while taking the release snapshot.
    git -C $repo diff --quiet HEAD -- @paths
    if ($LASTEXITCODE -ne 0) { throw 'Website changed while preparing the release.' }
    $currentCommit = git -C $repo rev-parse HEAD
    if ($LASTEXITCODE -ne 0 -or $currentCommit -ne $commit) { throw 'HEAD changed while preparing the release.' }
    Save-Manifest

    if ($Apply) {
        $manifest.status = 'BackingUp'
        Save-Manifest
        # Back up every object before the first upload; any failure aborts publication.
        foreach ($file in $manifest.files) {
            $backup = Join-Path $beforeDir $file.name
            Invoke-Oss -OssArgs @('cp', $file.destination, $backup, '--force')
            $metadata = @(Invoke-Oss -OssArgs @('stat', $file.destination))
            $metadata | Set-Content -LiteralPath (Join-Path $beforeDir ($file.name + '.metadata.txt')) -Encoding UTF8
            $file.backupSha256 = (Get-FileHash -Algorithm SHA256 -LiteralPath $backup).Hash.ToLowerInvariant()
            Save-Manifest
        }
    }

    $manifest.status = if ($Apply) { 'Uploading' } else { 'Previewing' }
    Save-Manifest
    # Assets first, index.html last. No ACL, CNAME or website-setting changes.
    foreach ($file in $manifest.files) {
        $uploadArgs = @(
            'cp', (Join-Path $releaseDir $file.name), $file.destination,
            '--content-type', $file.contentType,
            '--content-disposition', 'inline',
            '--cache-control', $cacheControl,
            '--metadata', "release-commit=$commit,source-sha256=$($file.sha256)",
            '--force'
        )
        if (!$Apply) { $uploadArgs += '--dry-run' }
        Invoke-Oss -OssArgs $uploadArgs
        if ($Apply) { $file.uploaded = $true }
        Save-Manifest
    }

    if ($Apply) {
        $manifest.status = 'Verifying'
        Save-Manifest
        foreach ($file in $manifest.files) {
            $download = Join-Path $verifyDir $file.name
            Invoke-Oss -OssArgs @('cp', $file.destination, $download, '--force')
            $actual = (Get-FileHash -Algorithm SHA256 -LiteralPath $download).Hash.ToLowerInvariant()
            if ($actual -ne $file.sha256) { throw "Uploaded content mismatch: $($file.name)" }
            $file.verified = $true
            Save-Manifest
        }
    }
    $manifest.status = if ($Apply) { 'Succeeded' } else { 'Previewed' }
} catch {
    $manifest.status = 'Failed'
    $manifest.error = $_.Exception.Message
    throw
} finally {
    $manifest.finishedAt = (Get-Date).ToString('o')
    Save-Manifest
    Write-Host "Release record: $manifestPath"
}

if ($Apply) {
    Write-Host "OSS content verified: $publicUrl (commit $commit)"
    Write-Host 'Next: verify the public domain, QR recognition and download on desktop/mobile.'
} else {
    Write-Host 'Preview only: no cloud objects were changed. Run with -Apply to publish.'
}
