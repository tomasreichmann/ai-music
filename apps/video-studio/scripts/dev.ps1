param(
    [string]$BridgeHost = "127.0.0.1",
    [int]$BridgePort = 8765
)

$ErrorActionPreference = "Stop"

$appDir = (Resolve-Path (Join-Path $PSScriptRoot "..")).Path
$repoRoot = (Resolve-Path (Join-Path $PSScriptRoot "..\..\..")).Path
$bridgeUrl = "http://$BridgeHost`:$BridgePort"
$healthUrl = "$bridgeUrl/health"
$bridgeJob = $null
$startedBridge = $false

function Test-BridgeHealth {
    param([string]$Url)

    try {
        $response = Invoke-RestMethod -Uri $Url -TimeoutSec 2
        return $response.ok -eq $true
    }
    catch {
        return $false
    }
}

function Stop-ManagedBridge {
    param($Job)

    if ($null -eq $Job) {
        return
    }

    Stop-Job -Job $Job -ErrorAction SilentlyContinue
    Remove-Job -Job $Job -Force -ErrorAction SilentlyContinue
}

function Resolve-PyLauncher {
    $pyCommand = Get-Command py -ErrorAction SilentlyContinue
    if ($null -ne $pyCommand) {
        return $pyCommand.Source
    }

    $launcherPath = Join-Path $env:LocalAppData "Programs\Python\Launcher\py.exe"
    if (Test-Path $launcherPath) {
        return $launcherPath
    }

    return $null
}

if (Test-BridgeHealth -Url $healthUrl) {
    Write-Host "Using existing Python bridge at $bridgeUrl"
}
else {
    $pyPath = Resolve-PyLauncher
    if ($null -eq $pyPath) {
        throw "Could not find `py` on PATH. Reopen the terminal or run the bridge manually."
    }

    Write-Host "Starting Python bridge at $bridgeUrl"
    $bridgeJob = Start-Job -Name "ai-music-video-bridge" -ScriptBlock {
        param(
            [string]$RepoRoot,
            [string]$PyPath,
            [string]$HostName,
            [int]$PortNumber
        )

        Set-Location $RepoRoot
        & $PyPath -3.12 -m ai_music.cli video serve --host $HostName --port $PortNumber
    } -ArgumentList $repoRoot, $pyPath, $BridgeHost, $BridgePort
    $startedBridge = $true

    $deadline = (Get-Date).AddSeconds(15)
    while ((Get-Date) -lt $deadline) {
        Start-Sleep -Milliseconds 250

        if (Test-BridgeHealth -Url $healthUrl) {
            break
        }

        $jobState = (Get-Job -Id $bridgeJob.Id).State
        if ($jobState -in @("Completed", "Failed", "Stopped")) {
            break
        }
    }

    if (-not (Test-BridgeHealth -Url $healthUrl)) {
        $bridgeOutput = Receive-Job -Job $bridgeJob -Keep | Out-String
        Stop-ManagedBridge -Job $bridgeJob
        throw "Python bridge failed to start.`n$bridgeOutput"
    }
}

$pnpmCommand = Get-Command pnpm -ErrorAction SilentlyContinue
if ($null -eq $pnpmCommand) {
    Stop-ManagedBridge -Job $bridgeJob
    throw "Could not find `pnpm` on PATH. Install pnpm or run `pnpm run dev:studio` manually."
}

Write-Host "Starting video studio dev server from $appDir"
Push-Location $appDir
try {
    & $pnpmCommand.Source run dev:studio
}
finally {
    Pop-Location
    if ($startedBridge) {
        Write-Host "Stopping managed Python bridge"
    }
    Stop-ManagedBridge -Job $bridgeJob
}
