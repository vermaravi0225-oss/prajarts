Get-ChildItem -Path '.' -Filter 'admin-*.html' | ForEach-Object {
    $content = Get-Content $_.FullName -Raw
    $content = $content -replace '(?s)<a href=\"admin-reviews\.html\".*?</a>\s*', ''
    Set-Content -Path $_.FullName -Value $content
}
Write-Host "Done"
