param(
    [string]$Remote = "origin",
    [string]$Branch = "",
    [string]$CommitMessage = "",
    [switch]$SkipCommit
)

$ErrorActionPreference = "Stop"

function Invoke-Step {
    param([string]$Message, [scriptblock]$Action)
    Write-Host "==> $Message"
    & $Action
}

Invoke-Step "Checking git repository" {
    git rev-parse --is-inside-work-tree | Out-Null
}

if ([string]::IsNullOrWhiteSpace($Branch)) {
    $Branch = (git branch --show-current).Trim()
}

if ([string]::IsNullOrWhiteSpace($Branch)) {
    throw "Unable to detect current branch."
}

Invoke-Step "Fetching remote info" {
    git remote get-url $Remote | Out-Null
}

if (-not $SkipCommit) {
    Invoke-Step "Staging changes" {
        git add -A
    }

    $pending = (git diff --cached --name-only)
    if ($pending) {
        if ([string]::IsNullOrWhiteSpace($CommitMessage)) {
            $timestamp = Get-Date -Format "yyyy-MM-dd HH:mm:ss"
            $CommitMessage = "chore: deploy sync $timestamp"
        }

        Invoke-Step "Creating commit" {
            git commit -m $CommitMessage
        }
    }
    else {
        Write-Host "==> No staged changes found, skipping commit."
    }
}
else {
    Write-Host "==> SkipCommit enabled, not creating a commit."
}

Invoke-Step "Pushing to $Remote/$Branch" {
    git push $Remote $Branch
}

Write-Host ""
Write-Host "Done. Local code is on GitHub ($Remote/$Branch)."
