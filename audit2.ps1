$files = Get-ChildItem -Path '.' -Filter 'admin-*.html'
foreach ($f in $files) {
    if ($f.Name -ne 'admin-login.html') {
        Write-Host "=== $($f.Name) ==="
        Select-String -Path $f.FullName -Pattern '<button[^>]*class="([^"]*)"' | ForEach-Object {
            if ($_.Matches.Groups.Count -gt 1) {
                $_.Matches.Groups[1].Value
            }
        } | Select-Object -Unique
        Write-Host ""
    }
}
