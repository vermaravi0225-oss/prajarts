$files = Get-ChildItem -Path '.' -Filter 'admin-*.html'
foreach ($f in $files) {
    $content = Get-Content $f.FullName -Raw
    if ($content -notmatch 'primary\"?:\s*\"#d4af37\"') {
        Write-Host $f.Name
    }
}
