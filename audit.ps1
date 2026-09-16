$files = Get-ChildItem -Path '.' -Filter 'admin-*.html'

foreach ($file in $files) {
    if ($file.Name -eq 'admin-login.html') { continue }
    
    Write-Host "=== $($file.Name) ==="
    $content = Get-Content $file.FullName -Raw
    
    # 1. Check Body
    if ($content -match '<body class="([^"]*)">') {
        Write-Host "Body: $($matches[1])"
    } else {
        Write-Host "Body: NOT FOUND or DIFFERENT FORMAT"
    }
    
    # 2. Check Sidebar
    if ($content -match '<aside class="([^"]*)">') {
        Write-Host "Sidebar: $($matches[1])"
    }
    
    # 3. Check Header
    if ($content -match '<header class="([^"]*)">') {
        Write-Host "Header: $($matches[1])"
    }
    
    # 4. Check Main Content Wrapper
    if ($content -match '<div class="(p-8 space-y-8[^"]*)">') {
        Write-Host "Main Wrap: $($matches[1])"
    } elseif ($content -match '<div class="([^"]*p-8[^"]*)">') {
        Write-Host "Main Wrap (other): $($matches[1])"
    }

    # 5. Check Glass Panels
    $glassPanels = [regex]::Matches($content, '<div class="(glass-panel[^"]*)">')
    if ($glassPanels.Count -gt 0) {
        Write-Host "Glass Panels: $($glassPanels[0].Groups[1].Value) ($($glassPanels.Count) found)"
    } else {
        Write-Host "Glass Panels: NONE"
    }
    
    # 6. Check Tables
    $tables = [regex]::Matches($content, '<table class="([^"]*)">')
    if ($tables.Count -gt 0) {
        Write-Host "Tables: $($tables[0].Groups[1].Value)"
    }
    
    Write-Host ""
}
