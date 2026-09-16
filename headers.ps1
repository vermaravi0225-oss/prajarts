$files = Get-ChildItem -Path '.' -Filter 'admin-*.html'

foreach ($file in $files) {
    if ($file.Name -eq 'admin-login.html') { continue }
    
    $content = Get-Content $file.FullName -Raw
    
    $title = ""
    switch ($file.Name) {
        "admin-categories.html" { $title = "Categories"; $extra = "" }
        "admin-customers.html" { $title = "Customers"; $extra = "" }
        "admin-dashboard.html" { $title = "Overview"; $extra = "" }
        "admin-marketing.html" { $title = "Marketing"; $extra = "" }
        "admin-orders.html" { $title = "Orders"; $extra = "" }
        "admin-product-edit.html" { $title = "Edit Product"; $extra = "<button class=`"bg-primary hover:bg-primary-variant text-background px-6 py-2 rounded-lg font-bold transition-colors flex items-center gap-2 shadow-lg shadow-primary/20`" onclick=`"saveProduct()`" id=`"saveBtn`"><span class=`"material-symbols-outlined`">save</span> Save Product</button>" }
        "admin-products.html" { $title = "Products"; $extra = "<a href=`"admin-product-edit.html`" class=`"bg-primary hover:bg-primary-variant text-background px-4 py-2 rounded-lg font-bold transition-colors flex items-center gap-2`"><span class=`"material-symbols-outlined`">add</span> Add Product</a>" }
        "admin-reviews.html" { $title = "Reviews"; $extra = "" }
        "admin-settings.html" { $title = "Global Settings"; $extra = "<button class=`"bg-primary hover:bg-primary-variant text-background px-6 py-2 rounded-lg font-bold transition-colors flex items-center gap-2 shadow-lg shadow-primary/20`" onclick=`"saveSettings()`" id=`"saveBtn`">Save Settings</button>" }
    }
    
    $headerHTML = @"
    <!-- Header -->
    <header class="bg-surface/80 backdrop-blur-md border-b border-outline-variant py-4 px-8 flex justify-between items-center sticky top-0 z-40">
        <div class="flex items-center gap-4">
            <button class="md:hidden text-primary" onclick="document.querySelector('aside').classList.toggle('hidden')">
                <span class="material-symbols-outlined">menu</span>
            </button>
            <h1 class="font-headline text-xl font-semibold text-on-background">$title</h1>
        </div>
        <div class="flex items-center gap-4">
            $extra
            <button class="bg-surface-variant p-2 rounded-full border border-outline-variant text-primary hover:bg-primary/10 transition-colors">
                <span class="material-symbols-outlined">notifications</span>
            </button>
            <div class="w-10 h-10 rounded-full bg-primary/20 border border-primary flex items-center justify-center text-primary font-headline font-bold">
                A
            </div>
        </div>
    </header>
"@
    
    $content = $content -replace '(?s)<!-- Header -->.*?</header>', $headerHTML
    # Also catch cases without <!-- Header --> comment
    if ($content -notmatch '(?s)<!-- Header -->.*?</header>') {
        $content = $content -replace '(?s)<header.*?</header>', $headerHTML
    }

    Set-Content -Path $file.FullName -Value $content
}
