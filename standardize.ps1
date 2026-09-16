$files = Get-ChildItem -Path '.' -Filter 'admin-*.html'

$sidebarHTML = @"
<aside class="w-64 glass-panel border-r border-outline-variant fixed h-full z-40 hidden md:flex flex-col">
    <div class="h-20 flex items-center px-6 border-b border-outline-variant">
        <h2 class="font-headline text-2xl font-extrabold tracking-widest gold-text-gradient">PRAJCRAFT</h2>
    </div>
    <nav class="flex-1 overflow-y-auto py-6 px-4 space-y-2">
        <a href="admin-dashboard.html" class="flex items-center gap-3 px-4 py-3 text-on-surface-variant hover:text-primary hover:bg-surface-variant rounded-xl font-medium transition-colors" id="nav-dashboard">
            <span class="material-symbols-outlined">dashboard</span>
            Dashboard
        </a>
        <a href="admin-orders.html" class="flex items-center gap-3 px-4 py-3 text-on-surface-variant hover:text-primary hover:bg-surface-variant rounded-xl font-medium transition-colors" id="nav-orders">
            <span class="material-symbols-outlined">local_shipping</span>
            Orders
        </a>
        <a href="admin-products.html" class="flex items-center gap-3 px-4 py-3 text-on-surface-variant hover:text-primary hover:bg-surface-variant rounded-xl font-medium transition-colors" id="nav-products">
            <span class="material-symbols-outlined">inventory_2</span>
            Products
        </a>
        <a href="admin-categories.html" class="flex items-center gap-3 px-4 py-3 text-on-surface-variant hover:text-primary hover:bg-surface-variant rounded-xl font-medium transition-colors" id="nav-categories">
            <span class="material-symbols-outlined">category</span>
            Categories
        </a>
        <a href="admin-customers.html" class="flex items-center gap-3 px-4 py-3 text-on-surface-variant hover:text-primary hover:bg-surface-variant rounded-xl font-medium transition-colors" id="nav-customers">
            <span class="material-symbols-outlined">group</span>
            Customers
        </a>
        <a href="admin-marketing.html" class="flex items-center gap-3 px-4 py-3 text-on-surface-variant hover:text-primary hover:bg-surface-variant rounded-xl font-medium transition-colors" id="nav-marketing">
            <span class="material-symbols-outlined">campaign</span>
            Marketing
        </a>
        <a href="admin-settings.html" class="flex items-center gap-3 px-4 py-3 text-on-surface-variant hover:text-primary hover:bg-surface-variant rounded-xl font-medium transition-colors" id="nav-settings">
            <span class="material-symbols-outlined">settings</span>
            Settings
        </a>
    </nav>
    <div class="p-4 border-t border-outline-variant">
        <button onclick="adminLogout()" class="flex items-center gap-3 px-4 py-3 w-full text-error hover:bg-error/10 rounded-xl font-medium transition-colors">
            <span class="material-symbols-outlined">logout</span>
            Logout
        </button>
    </div>
</aside>
"@

$headerTemplate = @"
    <!-- Header -->
    <header class="h-20 glass-panel border-b border-outline-variant flex items-center justify-between px-8 sticky top-0 z-30">
        <div class="flex items-center gap-4">
            <button class="md:hidden text-primary" onclick="document.querySelector('aside').classList.toggle('hidden')">
                <span class="material-symbols-outlined">menu</span>
            </button>
            <h1 class="font-headline text-xl font-semibold text-on-background">@@TITLE@@</h1>
        </div>
        <div class="flex items-center gap-4">
            @@EXTRA_BUTTONS@@
            <button class="bg-surface-variant p-2 rounded-full border border-outline-variant text-primary hover:bg-primary/10 transition-colors">
                <span class="material-symbols-outlined">notifications</span>
            </button>
            <div class="w-10 h-10 rounded-full bg-primary/20 border border-primary flex items-center justify-center text-primary font-headline font-bold">
                A
            </div>
        </div>
    </header>
"@

foreach ($file in $files) {
    if ($file.Name -eq 'admin-login.html') { continue }
    
    $content = Get-Content $file.FullName -Raw
    
    # Standardize Sidebar
    $content = $content -replace '(?s)<aside.*?</aside>', $sidebarHTML
    
    # Fix Active State in Sidebar based on file name
    $idMatch = "nav-" + $file.Name.Replace("admin-", "").Replace(".html", "").Replace("-edit", "s")
    if ($idMatch -eq "nav-products") {
        # Both admin-products and admin-product-edit should highlight Products tab
    }
    
    $activeClass = 'bg-primary/10 text-primary rounded-xl font-medium transition-colors'
    $inactiveClass = 'text-on-surface-variant hover:text-primary hover:bg-surface-variant rounded-xl font-medium transition-colors'
    
    $content = $content -replace "id=`"$idMatch`"", "class=`"flex items-center gap-3 px-4 py-3 $activeClass`""
    $content = $content -replace "id=`"nav-[a-z]+`"", "class=`"flex items-center gap-3 px-4 py-3 $inactiveClass`""

    # Standardize Main Wrapper
    $content = $content -replace '<div class="p-8 space-y-6">', '<div class="p-8 space-y-8">'
    $content = $content -replace '<div class="p-8">', '<div class="p-8 space-y-8">'
    $content = $content -replace '<div class="flex-1 p-8">', '<div class="p-8 space-y-8">'

    Set-Content -Path $file.FullName -Value $content
}
