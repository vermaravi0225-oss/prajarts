$files = Get-ChildItem -Path '.' -Filter 'admin-*.html'

foreach ($file in $files) {
    if ($file.Name -eq 'admin-login.html') { continue }
    
    $content = Get-Content $file.FullName -Raw
    
    # Change p-4 to p-6 inside glass panels
    $content = $content -replace 'class="glass-panel rounded-2xl p-4', 'class="glass-panel rounded-2xl p-6'
    $content = $content -replace 'class="glass-panel p-6 rounded-2xl luxury-shadow', 'class="glass-panel rounded-2xl p-6'
    
    # Standardize primary buttons
    $content = $content -replace 'class="bg-primary text-background px-4 py-2 rounded font-bold text-xs hover:bg-primary-variant"', 'class="bg-primary hover:bg-primary-variant text-background px-4 py-2 rounded-lg font-bold transition-colors"'
    
    Set-Content -Path $file.FullName -Value $content
}
