// Global configuration and utilities
// Utility to generate consistent fake stats for products lacking real data
window.getConsistentProductStats = function(product, realReviews = []) {
    let hash = 0;
    const strId = product.id || '';
    for (let i = 0; i < strId.length; i++) {
        hash = strId.charCodeAt(i) + ((hash << 5) - hash);
    }
    hash = Math.abs(hash);
    
    const fakeRating = (4.5 + (hash % 5) * 0.1).toFixed(1);
    const fakeReviews = 15 + (hash % 85);
    const fakeSold = 50 + (hash % 450);

    let finalRating = fakeRating;
    let finalReviewsCount = fakeReviews;
    let finalSoldCount = fakeSold;

    if (realReviews && realReviews.length > 0) {
        const approved = realReviews.filter(r => r.status === 'Approved');
        if (approved.length > 0) {
            finalRating = (approved.reduce((sum, r) => sum + (r.rating || 0), 0) / approved.length).toFixed(1);
            finalReviewsCount = approved.length;
        }
    } else if (product.reviews && product.reviews.length > 0) {
        const approved = product.reviews.filter(r => r.status === 'Approved');
        if (approved.length > 0) {
            finalRating = (approved.reduce((sum, r) => sum + (r.rating || 0), 0) / approved.length).toFixed(1);
            finalReviewsCount = approved.length;
        }
    }

    if (product.description) {
        const metaMatch = product.description.match(/<div id="product-meta-data"[^>]*>(.*?)<\/div>/);
        if (metaMatch) {
            try {
                const meta = JSON.parse(metaMatch[1]);
                if (meta.manual_sold_count > 0) finalSoldCount = meta.manual_sold_count;
                if (meta.manual_rating > 0) finalRating = meta.manual_rating;
                if (meta.manual_reviews_count > 0) finalReviewsCount = meta.manual_reviews_count;
            } catch(e) {}
        }
    }
    
    if (product.sold_count > 0) finalSoldCount = product.sold_count;

    return { rating: finalRating, reviewsCount: finalReviewsCount, soldCount: finalSoldCount };
};

// Global Cart Management
let cart = [];
try {
    const saved = localStorage.getItem('prajcraft_cart');
    cart = saved ? JSON.parse(saved) : [];
    if (!Array.isArray(cart)) cart = [];
} catch(e) {
    cart = [];
}

function updateCartBadge() {
    try {
        const counts = document.querySelectorAll('.badge');
        const totalItems = cart.reduce((sum, item) => sum + (item.quantity || 1), 0);
        
        counts.forEach(c => {
            if (c.id === 'bottomNavCartBadge' || c.id === 'topNavCartBadge' || c.parentElement.classList.contains('cart-btn')) {
                c.textContent = totalItems;
                c.style.display = totalItems > 0 ? 'inline-block' : 'none';
            }
        });
    } catch(err) {
        console.error("Cart badge error:", err);
    }
}

window.addToCart = function(product) {
    const existing = cart.find(i => i.id === product.id);
    if (existing) {
        existing.quantity += 1;
    } else {
        cart.push({ ...product, quantity: 1 });
    }
    localStorage.setItem('prajcraft_cart', JSON.stringify(cart));
    updateCartBadge();
    
    // Simple visual feedback
    const btn = event.currentTarget;
    if (btn) {
        const originalHtml = btn.innerHTML;
        btn.innerHTML = '<i class="ph ph-check"></i>';
        btn.style.background = 'var(--primary-green)';
        btn.style.color = 'white';
        setTimeout(() => {
            btn.innerHTML = originalHtml;
            btn.style.background = '';
            btn.style.color = '';
        }, 1000);
    }
}

// Format Currency
window.formatPrice = function(amount) {
    return '₹' + parseFloat(amount).toLocaleString('en-IN');
}

document.addEventListener('DOMContentLoaded', () => {
    updateCartBadge();
    
    // Link header cart button
    const cartBtns = document.querySelectorAll('.cart-btn');
    cartBtns.forEach(btn => btn.addEventListener('click', () => window.location.href = 'cart.html'));
    
    // If on index.html
    if (document.getElementById('heroBannerContainer')) {
        loadHomeData();
    }
    
    // If on product.html
    if (document.getElementById('productTitle')) {
        loadProductData();
    }

    // If on category.html
    if (document.getElementById('categoryProductsGrid')) {
        loadCategoryData();
    }
    
    // If on cart.html
    if (document.getElementById('cartItemsContainer')) {
        loadCartData();
    }
});

let cachedHomeProducts = [];

async function loadHomeData() {
    try {
        console.log("[DEBUG] loadHomeData started");
        
        // Fetch all data in parallel
        const results = await Promise.all([
            window.supabase.from('banners').select('*').eq('is_active', true).eq('position', 'Hero').order('sort_order'),
            window.supabase.from('categories').select('*').order('name'),
            window.supabase.from('products').select('*, categories(name), reviews(rating, status)').eq('status', 'Active').eq('is_bestseller', true).limit(4),
            window.supabase.from('products').select('*, categories(name), reviews(rating, status)').eq('status', 'Active').order('created_at', { ascending: false })
        ]);
        
        const [bannersRes, categoriesRes, hotDealsRes, allProductsRes] = results;

        console.log("[DEBUG] loadHomeData - Banners Query:", bannersRes);
        console.log("[DEBUG] loadHomeData - Categories Query:", categoriesRes);
        console.log("[DEBUG] loadHomeData - Hot Deals Query:", hotDealsRes);
        console.log("[DEBUG] loadHomeData - All Products Query:", allProductsRes);

        const banners = bannersRes ? bannersRes.data : null;
        const categories = categoriesRes ? categoriesRes.data : null;
        const hotDeals = hotDealsRes ? hotDealsRes.data : null;
        const allProducts = allProductsRes ? allProductsRes.data : null;

        // Banner is now handled statically in index.html

        if (categories) {
            const filterGrid = document.getElementById('categoriesFilterGrid');
            const catHtml = categories.map(c => `
                <button onclick="filterHomeProducts('${c.id}')" id="cat-btn-${c.id}" class="cat-filter-btn flex-shrink-0 px-4 py-2 rounded-full border border-outline-variant bg-surface text-on-surface-variant font-label-md text-sm transition-colors hover:bg-surface-variant">
                    ${c.name}
                </button>
            `).join('');
            
            const allBtn = `<button onclick="filterHomeProducts('all')" id="cat-btn-all" class="cat-filter-btn active flex-shrink-0 px-5 py-2 rounded-full border border-primary bg-primary text-on-primary font-label-md text-sm transition-colors">All</button>`;
            filterGrid.innerHTML = allBtn + catHtml;
        }
            
        if (hotDeals) {
            const grid = document.getElementById('bestsellersGrid');
            grid.innerHTML = hotDeals.map(p => {
                let img = 'https://via.placeholder.com/300';
                if (p.images) {
                    if (Array.isArray(p.images) && p.images.length > 0) img = p.images[0];
                    else if (typeof p.images === 'string') {
                        try {
                            const parsed = JSON.parse(p.images);
                            if (Array.isArray(parsed) && parsed.length > 0) img = parsed[0];
                            else img = p.images;
                        } catch(e) { img = p.images; }
                    }
                }
                
                const pObj = JSON.stringify({id: p.id, name: p.name, price: p.discount_price || p.price, image: img}).replace(/"/g, '&quot;');
                const categoryName = p.categories ? p.categories.name : 'COLLECTIBLE';
                
                return `
                <div class="min-w-[160px] w-40 bg-white rounded-lg overflow-hidden border border-outline-variant shadow-sm flex flex-col relative" onclick="window.location.href='product.html?id=${p.id}'" style="cursor:pointer;">
                    <div class="h-44 w-full relative">
                        <div class="w-full h-full" style="background-image: url('${img}'); background-size: cover; background-position: center;"></div>
                        ${p.discount_price && p.discount_price < p.price ? `<div class="absolute top-2 left-2 bg-tertiary text-white text-[10px] px-1.5 py-0.5 rounded-sm font-bold">SALE</div>` : ''}
                        <button class="absolute bottom-2 right-2 w-8 h-8 rounded-full bg-white shadow flex items-center justify-center text-primary hover:scale-110 transition-transform z-10" onclick="event.stopPropagation(); addToCart(${pObj})">
                            <span class="material-symbols-outlined text-sm">shopping_cart</span>
                        </button>
                    </div>
                    <div class="p-3 space-y-1">
                        <p class="text-on-surface-variant text-[10px] font-semibold uppercase tracking-wider">${categoryName}</p>
                        <h4 class="text-on-surface text-sm font-bold line-clamp-1">${p.name}</h4>
                        <div class="flex items-baseline gap-2">
                            <span class="text-primary font-bold text-sm">${formatPrice(p.discount_price || p.price)}</span>
                            ${p.discount_price && p.discount_price < p.price ? `<span class="text-outline text-[10px] line-through">${formatPrice(p.price)}</span>` : ''}
                        </div>
                    </div>
                </div>
                `;
            }).join('');
        }

        // 4. Load All Products for the grid
        cachedHomeProducts = allProducts || [];
        renderHomeProductsGrid(cachedHomeProducts);

    } catch (err) {
        console.error("Error loading home data:", err);
    }
}

window.filterHomeProducts = function(categoryId) {
    // Update active class on buttons
    document.querySelectorAll('.cat-filter-btn').forEach(btn => {
        btn.classList.remove('active', 'bg-primary', 'text-on-primary', 'border-primary');
        btn.classList.add('bg-surface', 'text-on-surface-variant', 'border-outline-variant');
    });
    
    const activeBtn = document.getElementById(`cat-btn-${categoryId}`);
    if (activeBtn) {
        activeBtn.classList.remove('bg-surface', 'text-on-surface-variant', 'border-outline-variant');
        activeBtn.classList.add('active', 'bg-primary', 'text-on-primary', 'border-primary');
    }

    // Filter array
    if (categoryId === 'all') {
        renderHomeProductsGrid(cachedHomeProducts);
    } else {
        const filtered = cachedHomeProducts.filter(p => p.category_id === categoryId);
        renderHomeProductsGrid(filtered);
    }
}

function renderHomeProductsGrid(products) {
    const grid = document.getElementById('homeProductsGrid');
    if (!products || products.length === 0) {
        grid.innerHTML = '<div class="col-span-2 text-center py-8 text-sm text-outline-variant">No products found for this category.</div>';
        return;
    }
    
    grid.innerHTML = products.map(p => {
        let img = 'https://via.placeholder.com/300';
        if (p.images) {
            if (Array.isArray(p.images) && p.images.length > 0) img = p.images[0];
            else if (typeof p.images === 'string') {
                try {
                    const parsed = JSON.parse(p.images);
                    if (Array.isArray(parsed) && parsed.length > 0) img = parsed[0];
                    else img = p.images;
                } catch(e) { img = p.images; }
            }
        }
        
        const pObj = JSON.stringify({id: p.id, name: p.name, price: p.discount_price || p.price, image: img}).replace(/"/g, '&quot;');
        const categoryName = p.categories ? p.categories.name : 'COLLECTIBLE';
        
        const stats = window.getConsistentProductStats(p);
        
        const ratingHtml = `
        <div class="flex items-center gap-1 mt-0.5 text-[10px] text-on-surface-variant">
            <span class="material-symbols-outlined text-[#d4af37] text-[12px]" style="font-variation-settings: 'FILL' 1;">star</span>
            <span class="font-bold">${stats.rating}</span>
            <span>(${stats.reviewsCount})</span>
        </div>`;
        
        return `
        <div class="bg-white rounded-lg overflow-hidden border border-outline-variant shadow-sm flex flex-col relative" onclick="window.location.href='product.html?id=${p.id}'" style="cursor:pointer;">
            <div class="h-44 w-full relative">
                <img src="${img}" loading="lazy" alt="${p.name}" class="w-full h-full object-cover">
                ${p.discount_price && p.discount_price < p.price ? `<div class="absolute top-2 left-2 bg-tertiary text-white text-[10px] px-1.5 py-0.5 rounded-sm font-bold">SALE</div>` : ''}
                <button class="absolute bottom-2 right-2 w-8 h-8 rounded-full bg-white shadow flex items-center justify-center text-primary hover:scale-110 transition-transform z-10" onclick="event.stopPropagation(); addToCart(${pObj})">
                    <span class="material-symbols-outlined text-sm">shopping_cart</span>
                </button>
            </div>
            <div class="p-3 space-y-1">
                <p class="text-on-surface-variant text-[10px] font-semibold uppercase tracking-wider">${categoryName}</p>
                <h4 class="text-on-surface text-sm font-bold line-clamp-2 leading-tight">${p.name}</h4>
                ${ratingHtml}
                <div class="flex items-baseline gap-2 pt-1">
                    <span class="text-primary font-bold text-sm">${formatPrice(p.discount_price || p.price)}</span>
                    ${p.discount_price && p.discount_price < p.price ? `<span class="text-outline text-[10px] line-through">${formatPrice(p.price)}</span>` : ''}
                </div>
            </div>
        </div>
        `;
    }).join('');
}

async function loadCategoryData() {
    try {
        const urlParams = new URLSearchParams(window.location.search);
        const categoryId = urlParams.get('category');
        const searchQuery = urlParams.get('search');
        const grid = document.getElementById('categoryProductsGrid');
        const title = document.getElementById('catTitle');

        let query = window.supabase.from('products').select('*, categories(name), reviews(rating, status)').eq('status', 'Active');
        
        if (categoryId) {
            query = query.eq('category_id', categoryId);
            // Fetch category name for title
            const { data: catData } = await window.supabase.from('categories').select('name').eq('id', categoryId).single();
            if (catData) title.textContent = catData.name;
        } else if (searchQuery) {
            query = query.ilike('name', `%${searchQuery}%`);
            title.textContent = `Search Results for "${searchQuery}"`;
        } else {
            title.textContent = "All Products";
        }

        const { data: products } = await query;
        
        if (!products || products.length === 0) {
            grid.innerHTML = '<div style="text-align: center; padding: 40px; color: var(--text-muted); grid-column: 1 / -1;">No products found.</div>';
            return;
        }

        grid.innerHTML = products.map(p => {
            let img = 'https://via.placeholder.com/300';
            if (p.images) {
                if (Array.isArray(p.images) && p.images.length > 0) img = p.images[0];
                else if (typeof p.images === 'string') {
                    try {
                        const parsed = JSON.parse(p.images);
                        if (Array.isArray(parsed) && parsed.length > 0) img = parsed[0];
                        else img = p.images;
                    } catch(e) { img = p.images; }
                }
            }

            const pObj = JSON.stringify({id: p.id, name: p.name, price: p.discount_price || p.price, image: img}).replace(/"/g, '&quot;');
            
            const stats = window.getConsistentProductStats(p);
            
            return `
            <div class="bg-white rounded-[24px] overflow-hidden shadow-[0_8px_30px_rgba(255,46,147,0.08)] group cursor-pointer" onclick="window.location.href='product.html?id=${p.id}'">
                <div class="relative aspect-square">
                    <img class="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110" alt="${p.name}" src="${img}"/>
                    <button class="absolute top-3 right-3 w-8 h-8 rounded-full bg-white/80 backdrop-blur shadow-sm flex items-center justify-center text-primary active:scale-90 transition-all z-10" onclick="event.stopPropagation(); addToCart(${pObj})">
                        <span class="material-symbols-outlined text-lg">shopping_cart</span>
                    </button>
                    ${p.discount_price && p.discount_price < p.price ? `<div class="absolute bottom-2 left-2"><span class="bg-primary text-white text-[10px] font-bold px-2 py-0.5 rounded-full uppercase">Sale</span></div>` : ''}
                </div>
                <div class="p-4">
                    <h3 class="font-label-md text-label-md text-on-surface-variant truncate mb-1">${p.name}</h3>
                    <div class="flex items-center justify-between">
                        <span class="font-title-md text-title-md text-primary">${formatPrice(p.discount_price || p.price)}</span>
                        <div class="flex items-center text-tertiary">
                            <span class="material-symbols-outlined text-sm" style="font-variation-settings: 'FILL' 1;">star</span>
                            <span class="text-[11px] font-bold ml-0.5">${stats.rating}</span>
                            <span class="text-[9px] text-outline ml-1">(${stats.reviewsCount})</span>
                        </div>
                    </div>
                </div>
            </div>
            `;
        }).join('');

    } catch (err) {
        console.error("Error loading category data:", err);
    }
}

async function loadProductData() {
    try {
        console.log("[DEBUG] loadProductData started");
        const urlParams = new URLSearchParams(window.location.search);
        const productId = urlParams.get('id');
        if (!productId) {
            console.log("[DEBUG] No product ID in URL");
            return;
        }

        console.log("[DEBUG] Fetching product with ID:", productId);
        const productRes = await window.supabase
            .from('products')
            .select('*')
            .eq('id', productId)
            .single();

        console.log("[DEBUG] loadProductData - Product Query:", productRes);
        
        const p = productRes ? productRes.data : null;
        const pErr = productRes ? productRes.error : null;

        if (pErr) console.error("Product fetch error:", pErr);
        
        if (!p) {
            document.getElementById('productTitle').textContent = "Product Not Found";
            document.getElementById('productDescription').innerHTML = "This product may have been removed or is currently unavailable.";
            document.getElementById('productPrice').innerHTML = "";
            document.getElementById('productCategory').textContent = "Unavailable";
            const btn = document.getElementById('buyNowBtn');
            if (btn) btn.style.display = 'none';
            const cartBtn = document.getElementById('addToCartBtn');
            if (cartBtn) cartBtn.style.display = 'none';
            return;
        }

        let reviews = [];
        try {
            const { data: rData, error: rErr } = await window.supabase
                .from('reviews')
                .select('*, users(full_name)')
                .eq('product_id', productId)
                .eq('status', 'Approved')
                .order('created_at', { ascending: false });
                
            if (rErr) console.error("Reviews fetch error:", rErr);
            if (rData) reviews = rData;
        } catch(e) {
            console.error("Reviews exception:", e);
        }

        document.getElementById('productTitle').textContent = p.name;
        document.title = p.name + ' - PRAJCRAFT';
        document.getElementById('productCategory').textContent = 'Product SKU: ' + (p.sku || 'N/A');
        
        const priceHtml = p.discount_price 
            ? `<span class="text-3xl font-extrabold text-primary">${formatPrice(p.discount_price)}</span> <span class="text-on-surface-variant line-through text-body-md" style="margin-left: 12px;">${formatPrice(p.price)}</span> <span class="bg-tertiary-container text-on-tertiary-container text-label-md px-2 py-1 rounded-full font-bold" style="margin-left: 12px;">SALE</span>`
            : `<span class="font-extrabold text-title-md text-primary">${formatPrice(p.price)}</span>`;
        document.getElementById('productPrice').innerHTML = priceHtml;

        let descriptionHTML = p.description || 'No description available.';
        let variants = null;
        
        // Extract variants JSON if exists
        const variantsMatch = descriptionHTML.match(/<div id="product-variants-data"[^>]*>(.*?)<\/div>/);
        if (variantsMatch) {
            try {
                variants = JSON.parse(variantsMatch[1]);
                descriptionHTML = descriptionHTML.replace(variantsMatch[0], '');
            } catch(e) { console.error("Error parsing variants", e); }
        }

        let highlightsHTML = '<li>Premium craftsmanship.</li>';
        const highlightsMatch = descriptionHTML.match(/<div id="product-highlights-data"[^>]*>(.*?)<\/div>/);
        if (highlightsMatch) {
            try {
                const highlightsData = JSON.parse(highlightsMatch[1]);
                if (highlightsData && highlightsData.length > 0) {
                    highlightsHTML = highlightsData.map(h => `<li>${h}</li>`).join('');
                }
                descriptionHTML = descriptionHTML.replace(highlightsMatch[0], '');
            } catch (e) { console.error("Error parsing highlights", e); }
        }
        const hlEl = document.getElementById('productHighlights');
        if (hlEl) hlEl.innerHTML = highlightsHTML;

        let returnPolicyHTML = '';
        const returnsMatch = descriptionHTML.match(/<div id="product-returns-data"[^>]*>(.*?)<\/div>/);
        if (returnsMatch) {
            try {
                const returnsData = JSON.parse(returnsMatch[1]);
                if (returnsData && returnsData.policy) {
                    if (returnsData.policy === 'Non-Returnable') {
                        returnPolicyHTML = 'Non-Returnable';
                    } else {
                        returnPolicyHTML = `${returnsData.days} Days ${returnsData.policy}`;
                    }
                }
                descriptionHTML = descriptionHTML.replace(returnsMatch[0], '');
            } catch (e) { console.error("Error parsing returns", e); }
        }
        
        const returnsSection = document.getElementById('returnsSection');
        const returnsPolicyEl = document.getElementById('productReturnPolicy');
        if (returnsSection && returnsPolicyEl && returnPolicyHTML) {
            returnsSection.style.display = 'flex';
            returnsPolicyEl.textContent = returnPolicyHTML;
        } else if (returnsSection) {
            returnsSection.style.display = 'none';
        }

        document.getElementById('productDescription').innerHTML = descriptionHTML;
        
        let mainImg = 'https://via.placeholder.com/600';
        let imagesArr = [];
        if (p.images) {
            if (Array.isArray(p.images)) imagesArr = p.images;
            else if (typeof p.images === 'string') {
                try {
                    const parsed = JSON.parse(p.images);
                    if (Array.isArray(parsed)) imagesArr = parsed;
                    else imagesArr = [p.images];
                } catch(e) { imagesArr = [p.images]; }
            }
        }
        
        if (imagesArr.length > 0) {
            mainImg = imagesArr[0];
            document.getElementById('productMainImage').src = mainImg;
            
            const gallery = document.getElementById('productGallery');
            if (gallery && imagesArr.length > 1) {
                gallery.innerHTML = imagesArr.map((imgUrl, i) => `
                    <div class="shrink-0 w-20 h-20 ${i===0 ? 'gold-border-gradient rounded-lg border-2 border-primary opacity-100' : 'rounded-lg opacity-60 hover:opacity-100 transition-opacity'} overflow-hidden cursor-pointer" onclick="document.getElementById('productMainImage').src='${imgUrl}'; Array.from(this.parentElement.children).forEach(b=>{b.className='shrink-0 w-20 h-20 rounded-lg overflow-hidden cursor-pointer opacity-60 hover:opacity-100 transition-opacity';}); this.className='shrink-0 w-20 h-20 gold-border-gradient rounded-lg border-2 border-primary opacity-100 overflow-hidden cursor-pointer';">
                        <img class="w-full h-full object-cover" src="${imgUrl}">
                    </div>
                `).join('');
            }
        }

        let currentPrice = p.discount_price || p.price;
        let currentMrp = p.price;
        let currentVariant = '';
        
        const updateCartButtons = () => {
            const item = {
                id: currentVariant ? `${p.id}-${currentVariant}` : p.id,
                name: currentVariant ? `${p.name} (${currentVariant})` : p.name,
                price: currentPrice,
                image: mainImg
            };
            
            const btnCart = document.getElementById('addToCartBtn');
            const btnBuy = document.getElementById('buyNowBtn');
            if (btnCart) {
                btnCart.onclick = (e) => {
                    e.preventDefault();
                    addToCart(item);
                };
            }
            if (btnBuy) {
                btnBuy.onclick = (e) => {
                    e.preventDefault();
                    addToCart(item);
                    window.location.href = 'cart.html';
                };
            }
        };

        const sizeSection = document.querySelector('.size-section');
        if (variants && variants.length > 0) {
            if (sizeSection) sizeSection.style.display = 'block';
            const sizeOptionsContainer = document.querySelector('.size-options');
            if (sizeOptionsContainer) {
                const activeClasses = "px-4 py-2 border-2 border-primary text-primary font-bold text-sm bg-primary-fixed cursor-pointer";
                const inactiveClasses = "px-4 py-2 border border-outline-variant text-on-surface-variant text-sm cursor-pointer hover:border-primary";
                
                sizeOptionsContainer.innerHTML = variants.map((v, idx) => 
                    `<button class="size-btn ${idx === 0 ? activeClasses : inactiveClasses}" data-size="${v.size}" data-price="${v.price}" data-mrp="${v.mrp || v.price}">${v.size}</button>`
                ).join('');
                
                // Initialize first variant
                currentPrice = variants[0].price;
                currentMrp = variants[0].mrp || variants[0].price;
                if (currentMrp < currentPrice) currentMrp = currentPrice;
                currentVariant = variants[0].size;

                const renderPrice = (sell, mrp) => {
                    if (sell < mrp) {
                        const pct = Math.round(((mrp - sell) / mrp) * 100);
                        return `<span class="text-3xl font-bold text-on-surface">${formatPrice(sell)}</span>
                                <span class="text-outline-variant line-through text-sm">${formatPrice(mrp)}</span>
                                <span class="text-tertiary font-bold text-sm">${pct}% off</span>`;
                    }
                    return `<span class="text-3xl font-bold text-on-surface">${formatPrice(sell)}</span>`;
                };

                document.getElementById('productPrice').innerHTML = renderPrice(currentPrice, currentMrp);
                
                // Attach click listeners
                sizeOptionsContainer.querySelectorAll('.size-btn').forEach(btn => {
                    btn.addEventListener('click', (e) => {
                        sizeOptionsContainer.querySelectorAll('.size-btn').forEach(b => {
                            b.className = `size-btn ${inactiveClasses}`;
                        });
                        e.target.className = `size-btn ${activeClasses}`;
                        currentVariant = e.target.dataset.size;
                        currentPrice = parseFloat(e.target.dataset.price);
                        currentMrp = parseFloat(e.target.dataset.mrp) || currentPrice;
                        if (currentMrp < currentPrice) currentMrp = currentPrice;
                        
                        document.getElementById('productPrice').innerHTML = renderPrice(currentPrice, currentMrp);
                        updateCartButtons();
                    });
                });
            }
        } else {
            if (sizeSection) sizeSection.style.display = 'none';
            // standard render
            if (p.discount_price && p.discount_price < p.price) {
                const pct = Math.round(((p.price - p.discount_price) / p.price) * 100);
                document.getElementById('productPrice').innerHTML = `<span class="text-3xl font-bold text-on-surface">${formatPrice(p.discount_price)}</span>
                        <span class="text-outline-variant line-through text-sm">${formatPrice(p.price)}</span>
                        <span class="text-tertiary font-bold text-sm">${pct}% off</span>`;
            } else {
                document.getElementById('productPrice').innerHTML = `<span class="text-3xl font-bold text-on-surface">${formatPrice(p.price)}</span>`;
            }
        }

        updateCartButtons();

        // Setup Recommendations Engine Context
        window.currentProduct = p;
        if (typeof window.trackRecentlyViewed === 'function') {
            window.trackRecentlyViewed(p);
        }
        
        document.querySelectorAll('[data-rec-type]').forEach(section => {
            section.setAttribute('data-rec-context-id', p.id);
            if (p.category_id) section.setAttribute('data-rec-context-cat', p.category_id);
            section.setAttribute('data-rec-context-price', p.discount_price || p.price);
        });

        if (typeof window.initRecommendations === 'function') {
            window.initRecommendations();
        }

        // Reviews already loaded via Promise.all
        
        const revContainer = document.getElementById('reviewsContainer');
        
        const stats = window.getConsistentProductStats(p, reviews);
        
        const rcb = document.getElementById('reviewCountBadge');
        if (rcb) rcb.textContent = `(${stats.reviewsCount} Reviews)`;
        
        const rcbt = document.getElementById('reviewCountBadgeTop');
        if (rcbt) rcbt.textContent = `(${stats.reviewsCount} Reviews)`;
        
        const topRatingBadge = document.getElementById('topRatingBadge');
        if (topRatingBadge) {
            topRatingBadge.innerHTML = `${stats.rating} <span class="material-symbols-outlined text-[12px]" style="font-variation-settings: 'FILL' 1;">star</span>`;
        }
        
        const soldCountBadge = document.getElementById('soldCountBadge');
        if (soldCountBadge && stats.soldCount > 0) {
            document.getElementById('soldCountText').textContent = `${stats.soldCount.toLocaleString()}+ Sold`;
            soldCountBadge.classList.remove('hidden');
        }

        if (reviews && reviews.length > 0) {
            revContainer.innerHTML = reviews.map(r => {
                const author = r.author_name || r.users?.full_name || 'Guest';
                const initial = author.charAt(0).toUpperCase();
                const date = new Date(r.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
                
                let imageHtml = '';
                if (r.images && r.images.length > 0) {
                    imageHtml = `<div style="margin-top: 12px; margin-bottom: 8px;"><img src="${r.images[0]}" alt="Customer Image" style="max-width: 120px; height: auto; border-radius: 8px; border: 1px solid var(--outline-variant); object-fit: cover;"></div>`;
                }

                return `
                <div class="review-item">
                    <div class="reviewer-info" style="display: flex; align-items: center; gap: 12px; margin-bottom: 8px;">
                        <div class="avatar" style="background-color: var(--primary); color: var(--background); display: flex; align-items: center; justify-content: center; width: 32px; height: 32px; border-radius: 50%; font-weight: 700; font-size: 14px;">${initial}</div>
                        <span style="font-weight: 600; font-size: 14px;">${author}</span>
                        ${r.verified_purchase ? '<span class="text-success text-[10px] uppercase tracking-wider font-bold ml-2 bg-success/10 px-1.5 py-0.5 rounded">Verified</span>' : ''}
                        <span style="color: var(--text-light); font-size: 12px; margin-left: auto;">${date}</span>
                    </div>
                    <div class="stars small" style="margin: 8px 0; display: flex; gap: 2px;">
                        ${Array(5).fill(0).map((_, i) => `<span class="material-symbols-outlined" style="font-variation-settings: 'FILL' ${i < r.rating ? 1 : 0}; color: #d4af37; font-size: 18px;">star</span>`).join('')}
                    </div>
                    <p style="font-size: 13px; color: var(--text-muted); line-height: 1.5; margin-bottom: 4px;">${r.review_text}</p>
                    ${imageHtml}
                </div>
                <hr class="divider thin">
                `;
            }).join('');
        } else {
            revContainer.innerHTML = '<p style="color: var(--text-muted); font-size: 14px;">No reviews yet. Be the first to review!</p>';
        }

    } catch (err) {
        console.error("Error loading product:", err);
    }
}

// Cart Page Functions
window.loadCartData = function() {
    const container = document.getElementById('cartItemsContainer');
    const title = document.getElementById('cartTitle');
    const summarySection = document.getElementById('orderSummarySection');
    
    if (!container) return;

    if (cart.length === 0) {
        if (title) title.textContent = 'Shopping Bag (0 Items)';
        container.innerHTML = '<p style="text-align:center; padding:24px; color:var(--text-muted);">Your cart is empty.</p>';
        if (summarySection) summarySection.style.display = 'none';
        return;
    }
    
    if (summarySection) summarySection.style.display = 'block';
    
    const totalItems = cart.reduce((sum, item) => sum + item.quantity, 0);
    if (title) title.textContent = `Shopping Bag (${totalItems} Items)`;

    container.innerHTML = cart.map((item, index) => `
        <div class="artifact-card flex items-center gap-4 bg-surface-container-low p-3 rounded-xl luxury-shadow border border-transparent transition-colors hover:border-primary">
            <div class="bg-center bg-no-repeat aspect-square bg-cover rounded-lg size-24 shrink-0 overflow-hidden cursor-pointer" style="background-image: url('${item.image}')" onclick="window.location.href='product.html?id=${String(item.id).substring(0, 36)}'">
            </div>
            <div class="flex flex-col flex-1 gap-1">
                <p class="text-on-surface font-headline-md text-base leading-tight cursor-pointer" onclick="window.location.href='product.html?id=${String(item.id).substring(0, 36)}'">${item.name}</p>
                <p class="text-outline font-label-md text-xs uppercase tracking-wider">SKU / ID: ${String(item.id).substring(0, 8)}</p>
                <p class="text-primary font-headline-md text-base mt-1">${formatPrice(item.price * item.quantity)}</p>
                <div class="flex items-center gap-3 mt-2">
                    <div class="flex items-center gap-3 bg-surface-container-highest px-3 py-1 rounded-full">
                        <button class="text-on-surface-variant font-bold text-lg" onclick="updateQuantity('${item.id}', -1)">-</button>
                        <span class="text-on-surface font-medium w-4 text-center">${item.quantity}</span>
                        <button class="text-on-surface-variant font-bold text-lg" onclick="updateQuantity('${item.id}', 1)">+</button>
                    </div>
                    <button class="ml-auto text-on-surface-variant/60 hover:text-error transition-colors" onclick="removeFromCart('${item.id}')">
                        <span class="material-symbols-outlined text-[20px]">delete</span>
                    </button>
                </div>
            </div>
        </div>
    `).join('');

    updateCartSummary();
}

window.updateQuantity = function(id, change) {
    const item = cart.find(i => i.id === id);
    if (item) {
        item.quantity += change;
        if (item.quantity <= 0) {
            cart = cart.filter(i => i.id !== id);
        }
        localStorage.setItem('prajcraft_cart', JSON.stringify(cart));
        updateCartBadge();
        loadCartData();
    }
}

window.removeFromCart = function(id) {
    cart = cart.filter(i => i.id !== id);
    localStorage.setItem('prajcraft_cart', JSON.stringify(cart));
    updateCartBadge();
    loadCartData();
}

window.clearCart = function(event) {
    if(event) event.preventDefault();
    if(confirm('Are you sure you want to clear your cart?')) {
        cart = [];
        localStorage.setItem('prajcraft_cart', JSON.stringify(cart));
        updateCartBadge();
        loadCartData();
    }
}

function updateCartSummary() {
    const totalItems = cart.reduce((sum, item) => sum + item.quantity, 0);
    const subtotal = cart.reduce((sum, item) => sum + (item.price * item.quantity), 0);
    // Removed tax logic to simplify for new UI, or can add back if needed.
    const total = subtotal;

    const cartHeaderCount = document.getElementById('cartHeaderCount');
    if(cartHeaderCount) cartHeaderCount.textContent = `(${totalItems} Items)`;
    
    const elSubtotal = document.getElementById('summarySubtotal');
    if(elSubtotal) elSubtotal.textContent = formatPrice(subtotal);
    
    const elTotal = document.getElementById('summaryTotal');
    if(elTotal) elTotal.textContent = formatPrice(total);
}

window.toggleAddressForm = function() {
    document.getElementById('savedAddressContainer').classList.add('hidden');
    document.getElementById('addressFormContainer').classList.remove('hidden');
    document.getElementById('editAddressBtn').classList.add('hidden');
};

window.loadSavedAddressOnCheckout = async function() {
    const { data: { session } } = await window.supabase.auth.getSession();
    if (!session) return;
    
    try {
        const { data: address } = await window.supabase
            .from('addresses')
            .select('*')
            .eq('user_id', session.user.id)
            .order('created_at', { ascending: false })
            .limit(1)
            .single();
            
        if (address) {
            document.getElementById('savedAddressId').value = address.id;
            
            // Also fetch user name and phone if missing
            const { data: user } = await window.supabase.from('users').select('full_name, phone').eq('id', session.user.id).single();
            const name = user?.full_name || session.user.email;
            const phone = user?.phone || 'Not Provided';

            document.getElementById('savedName').textContent = name;
            document.getElementById('savedPhone').textContent = `Phone: ${phone}`;
            document.getElementById('savedAddressText').textContent = `${address.full_address}, ${address.city}, ${address.state} - ${address.pincode}`;
            
            document.getElementById('savedAddressContainer').classList.remove('hidden');
            document.getElementById('addressFormContainer').classList.add('hidden');
            document.getElementById('editAddressBtn').classList.remove('hidden');
        }
    } catch(err) {
        console.error("Error fetching saved address:", err);
    }
}

document.addEventListener('DOMContentLoaded', () => {
    if (window.location.pathname.includes('checkout.html')) {
        loadSavedAddressOnCheckout();
    }
});

window.proceedToCheckout = async function() {
    const { data: { session } } = await window.supabase.auth.getSession();
    if (!session) {
        window.location.href = 'profile.html';
    } else {
        window.location.href = 'checkout.html';
    }
}

window.prepareOrderPayload = async function() {
    const { data: { session } } = await window.supabase.auth.getSession();
    if (!session) {
        window.showToast ? window.showToast("Please login to place an order.", 'error') : alert("Please login to place an order.");
        window.location.href = 'profile.html';
        return null;
    }

    let { data: user } = await window.supabase.from('users').select('*').eq('id', session.user.id).maybeSingle();
    
    if (!user) {
        window.showToast ? window.showToast("Critical Error: Your user profile is missing. Please log out and log in again.", 'error') : alert("Critical Error: User profile missing.");
        return null;
    }

    const savedAddressId = document.getElementById('savedAddressId')?.value;
    const addressFormContainer = document.getElementById('addressFormContainer');
    const isFormHidden = addressFormContainer && addressFormContainer.classList.contains('hidden');

    let shipName, shipPhone, shipAddress, shipCity, shipZip, address_id = null;

    if (savedAddressId && isFormHidden) {
        address_id = savedAddressId;
        shipName = document.getElementById('savedName').textContent;
        shipPhone = document.getElementById('savedPhone').textContent;
        shipAddress = document.getElementById('savedAddressText').textContent;
    } else {
        shipName = document.getElementById('shipName')?.value || user?.full_name || session.user.email;
        shipPhone = document.getElementById('shipPhone')?.value || user?.phone || '9999999999';
        shipAddress = document.getElementById('shipAddress')?.value || 'Not Provided';
        const countryVal = document.getElementById('shipCountry')?.value || 'India';
        if (countryVal !== 'India') {
            shipAddress = shipAddress + ', ' + countryVal;
        }
        shipCity = document.getElementById('shipCity')?.value || 'City';
        shipZip = document.getElementById('shipZip')?.value || '000000';
        
        if (!shipName || !shipPhone || shipAddress === 'Not Provided') {
            window.showToast ? window.showToast("Please fill in all shipping address fields.", 'error') : alert("Please fill in all shipping address fields.");
            return null;
        }
    }

    return {
        cart: cart,
        user_id: session.user.id,
        payment_method: window.selectedPaymentMethod || 'upi',
        shipping: {
            name: shipName,
            phone: shipPhone,
            address: shipAddress,
            city: shipCity || 'City',
            zip: shipZip || '000000',
            address_id: address_id
        }
    };
};

async function placeOrder() {
    const btn = document.getElementById('checkoutBtn');
    if(btn) {
        btn.innerHTML = '<span class="material-symbols-outlined animate-spin align-middle mr-2">autorenew</span> PROCESSING...';
        btn.disabled = true;
    }

    try {
        const payload = await window.prepareOrderPayload();
        if (!payload) {
            if(btn) {
                btn.innerHTML = 'Place Order';
                btn.disabled = false;
            }
            return;
        }

        if (window.selectedPaymentMethod === 'upi') {
            // Setup UPI Overlay
            window.pendingOrderPayload = payload;
            
            // Calculate total again or get from DOM
            const totalText = document.getElementById('summaryTotal').textContent.replace(/[^\d.]/g, '');
            const totalAmount = parseFloat(totalText);
            
            document.getElementById('qrAmountDisplay').textContent = '₹' + totalAmount;
            
            // Generate Order ID (temp)
            const orderNum = 'PRJ-' + Math.floor(100000 + Math.random() * 900000);
            window.pendingOrderPayload.order_number = orderNum;
            window.pendingOrderPayload.total_amount = totalAmount;
            
            const upiUri = `upi://pay?pa=98964845@jio&pn=PrajCraft&am=${totalAmount}&cu=INR&tn=${orderNum}`;
            window.currentUpiUri = upiUri;
            
            const qrContainer = document.getElementById('qrcode');
            qrContainer.innerHTML = ''; // clear previous
            new QRCode(qrContainer, {
                text: upiUri,
                width: 200,
                height: 200,
                colorDark : "#000000",
                colorLight : "#ffffff",
                correctLevel : QRCode.CorrectLevel.H
            });
            
            document.getElementById('upiPaymentOverlay').classList.remove('hidden');
            document.getElementById('upiPaymentOverlay').classList.add('flex');
            
            btn.innerHTML = 'Place Order';
            btn.disabled = false;
        } else {
            // COD
            await createSupabaseOrder(payload, 'Pending', 'Pending', null, null);
        }
    } catch (err) {
        alert("Checkout failed: " + err.message);
        const btn = document.getElementById('checkoutBtn');
        if (btn) {
            btn.innerHTML = 'Place Order';
            btn.disabled = false;
        }
    }
}

function closeUpiOverlay() {
    document.getElementById('upiPaymentOverlay').classList.add('hidden');
    document.getElementById('upiPaymentOverlay').classList.remove('flex');
}

window.payWithUpiApps = function() {
    const btn = document.getElementById('payWithUpiAppsBtn');
    const msg = document.getElementById('upiAppFallbackMsg');
    
    if (!window.currentUpiUri || btn.disabled) return;
    
    // Disable button to prevent duplicate taps
    btn.disabled = true;
    const originalContent = btn.innerHTML;
    btn.innerHTML = '<span class="text-lg animate-pulse">Opening UPI App...</span>';
    
    const ua = navigator.userAgent || navigator.vendor || window.opera;
    const isSocialApp = (ua.indexOf("Instagram") > -1) || (ua.indexOf("FBAN") > -1) || (ua.indexOf("FBAV") > -1);
    
    if (isSocialApp) {
        msg.classList.remove('hidden');
    }
    
    // Attempt deep link
    window.location.href = window.currentUpiUri;
    
    // Fallback: Re-enable after timeout and show message
    const fallbackTimeout = setTimeout(() => {
        btn.innerHTML = originalContent;
        btn.disabled = false;
        msg.classList.remove('hidden');
    }, 2000);
    
    // Clear timeout and reset if user successfully switched apps and comes back
    const handleVisibilityChange = () => {
        if (document.visibilityState === 'hidden') {
            clearTimeout(fallbackTimeout);
        } else if (document.visibilityState === 'visible') {
            btn.innerHTML = originalContent;
            btn.disabled = false;
            document.removeEventListener('visibilitychange', handleVisibilityChange);
        }
    };
    
    document.addEventListener('visibilitychange', handleVisibilityChange);
};

window.showToast = function(message, type = 'error') {
    let container = document.getElementById('toast-container');
    if (!container) {
        container = document.createElement('div');
        container.id = 'toast-container';
        container.className = 'fixed bottom-4 left-1/2 -translate-x-1/2 z-[9999] flex flex-col gap-2 pointer-events-none';
        document.body.appendChild(container);
    }
    
    const toast = document.createElement('div');
    const bgColor = type === 'error' ? 'bg-error text-on-error' : 'bg-primary text-on-primary';
    toast.className = `${bgColor} px-4 py-2 rounded shadow-lg font-bold text-sm transform transition-all translate-y-full opacity-0`;
    toast.textContent = message;
    
    container.appendChild(toast);
    
    // Animate in
    requestAnimationFrame(() => {
        toast.classList.remove('translate-y-full', 'opacity-0');
    });
    
    // Animate out
    setTimeout(() => {
        toast.classList.add('translate-y-full', 'opacity-0');
        setTimeout(() => toast.remove(), 300);
    }, 3000);
};

async function submitUpiPayment() {
    const utr = document.getElementById('utrInput').value.trim();
    if (!utr || utr.length < 12 || utr.length > 22) {
        window.showToast("Please enter a valid Transaction ID (UTR) between 12 and 22 characters.", 'error');
        return;
    }
    
    const btn = document.getElementById('submitUpiBtn');
    btn.innerHTML = '<span class="material-symbols-outlined animate-spin align-middle mr-2">autorenew</span> Processing...';
    btn.disabled = true;
    
    try {
        // Client-side duplicate UTR check removed. We let the order generate directly.
        let screenshotUrl = null;
        const fileInput = document.getElementById('screenshotInput');
        if (fileInput.files.length > 0) {
            const file = fileInput.files[0];
            const fileExt = file.name.split('.').pop();
            const fileName = `upi_${Date.now()}_${Math.random().toString(36).substring(7)}.${fileExt}`;
            
            const { data: uploadData, error: uploadError } = await window.supabase.storage
                .from('payment_screenshots')
                .upload(fileName, file);
                
            if (uploadError) {
                console.error("Screenshot upload failed", uploadError);
                // Non-blocking error, we can still proceed
            } else {
                const { data: publicUrlData } = window.supabase.storage
                    .from('payment_screenshots')
                    .getPublicUrl(fileName);
                screenshotUrl = publicUrlData.publicUrl;
            }
        }
        
        await createSupabaseOrder(window.pendingOrderPayload, 'Verification Pending', 'Verification Pending', utr, screenshotUrl);
        closeUpiOverlay();
    } catch(err) {
        if (err.message === "UNIQUE_UTR") {
            window.showToast("This transaction ID has already been submitted.", 'error');
        } else {
            window.showToast("Payment submission failed: " + err.message, 'error');
        }
        btn.innerHTML = 'Confirm Payment';
        btn.disabled = false;
    }
}

async function createSupabaseOrder(payload, orderStatus, paymentStatus, utr, screenshotUrl) {
    const orderNum = payload.order_number || 'PRJ-' + Math.floor(100000 + Math.random() * 900000);
    
    // Calculate accurate prices
    const productIds = payload.cart.map(item => String(item.id).substring(0, 36));
    const { data: realProducts, error: prodErr } = await window.supabase
        .from('products')
        .select('id, price, discount_price, description')
        .in('id', productIds);
        
    if (prodErr) throw new Error("Failed to fetch product details.");
    
    let subtotal = 0;
    let totalQuantity = 0;
    let itemsToInsert = [];
    
    for (const item of payload.cart) {
        const baseId = String(item.id).substring(0, 36);
        const realProduct = realProducts?.find(p => p.id === baseId);
        if (!realProduct) continue;
        
        let priceToCharge = realProduct.discount_price || realProduct.price;
        let variant_id = null;
        
        // Handle variant
        const variantName = String(item.id).length > 36 ? String(item.id).substring(37) : null;
        if (variantName && realProduct.description) {
            const variantsMatch = realProduct.description.match(/<div id="product-variants-data"[^>]*>(.*?)<\/div>/);
            if (variantsMatch) {
                try {
                    const variants = JSON.parse(variantsMatch[1]);
                    const v = variants.find(x => x.size === variantName);
                    if (v) {
                        priceToCharge = v.price;
                        variant_id = v.id; // if we had actual uuid variants, but this is a string mostly.
                        // We will ignore variant_id insertion if it fails
                    }
                } catch(e) {}
            }
        }
        
        subtotal += priceToCharge * item.quantity;
        totalQuantity += parseInt(item.quantity) || 1;
        
        itemsToInsert.push({
            product_id: baseId,
            quantity: parseInt(item.quantity) || 1,
            price_at_time: priceToCharge
        });
    }
    
    let discountAmount = 0;
    if (totalQuantity > 1) discountAmount = 1000;
    
    let finalTotal = subtotal - discountAmount;
    if (finalTotal < 0) finalTotal = 0;
    
    // Save address if it's new
    let addressId = payload.shipping.address_id;
    if (!addressId) {
        const { data: newAddr, error: addrErr } = await window.supabase
            .from('addresses')
            .insert([{
                user_id: payload.user_id,
                title: 'Home',
                full_address: payload.shipping.address,
                city: payload.shipping.city,
                pincode: payload.shipping.zip
            }]).select().single();
            
        if (!addrErr && newAddr) addressId = newAddr.id;
    }
     // Create order
    const { data: order, error: orderErr } = await window.supabase
        .from('orders')
        .insert([{
            user_id: payload.user_id,
            order_number: orderNum,
            subtotal: subtotal,
            discount_amount: discountAmount,
            tax_amount: 0,
            shipping_amount: 0,
            final_total: finalTotal,
            shipping_address_id: addressId,
            status: orderStatus,
            payment_status: paymentStatus,
            payment_method: payload.payment_method === 'upi' ? 'Manual UPI' : 'COD',
            utr: utr,
            screenshot_url: screenshotUrl
        }]).select().single();
        
    if (orderErr) {
        if (orderErr.code === '23505' && orderErr.message.includes('utr')) {
            throw new Error("UNIQUE_UTR");
        }
        throw new Error("Order creation failed: " + orderErr.message);
    }
    
    // Attach order_id to items
    const finalItems = itemsToInsert.map(i => ({...i, order_id: order.id}));
    
    const { error: itemsErr } = await window.supabase
        .from('order_items')
        .insert(finalItems);
        
    if (itemsErr) throw new Error("Failed to add items to order.");
    
    // Notify admin & user
    await window.supabase.from('notifications').insert([
        {
            user_id: payload.user_id,
            title: 'Order Received',
            message: `Your order ${orderNum} has been received. ${payload.payment_method === 'upi' ? 'Payment is under verification.' : 'You chose Cash on Delivery.'}`,
            type: 'Order'
        }
    ]);
    
    // Success! Clear cart
    cart = [];
    localStorage.setItem('prajcraft_cart', JSON.stringify(cart));
    window.location.href = 'ordertrack.html?order_id=' + order.id;
}

async function loadSimilarProducts(categoryId, currentProductId) {
    try {
        const { data: products } = await window.supabase
            .from('products')
            .select('*, categories(name), reviews(rating, status)')
            .eq('category_id', categoryId)
            .eq('status', 'Active')
            .neq('id', currentProductId)
            .limit(6);

        const section = document.getElementById('similarProductsSection');
        const grid = document.getElementById('similarProductsGrid');
        
        if (!section || !grid) return;

        if (!products || products.length === 0) {
            section.style.display = 'none';
            return;
        }

        section.style.display = 'block';
        grid.innerHTML = products.map(p => {
            let img = 'https://via.placeholder.com/300';
            if (p.images) {
                if (Array.isArray(p.images) && p.images.length > 0) img = p.images[0];
                else if (typeof p.images === 'string') {
                    try {
                        const parsed = JSON.parse(p.images);
                        if (Array.isArray(parsed) && parsed.length > 0) img = parsed[0];
                        else img = p.images;
                    } catch(e) { img = p.images; }
                }
            }
            
            const pObj = JSON.stringify({id: p.id, name: p.name, price: p.discount_price || p.price, image: img}).replace(/"/g, '&quot;');
            const categoryName = p.categories ? p.categories.name : 'COLLECTIBLE';
            const price = p.discount_price || p.price;
            
            let mrpLine = '';
            if (p.discount_price && p.discount_price < p.price) {
                mrpLine = `<span class="text-xs text-on-surface-variant line-through">${formatPrice(p.price)}</span>`;
            }

            return `
            <div class="flex-shrink-0 w-40 md:w-48 bg-white border border-outline-variant rounded shadow-sm hover:shadow-md transition-shadow cursor-pointer relative group flex flex-col justify-between" onclick="window.location.href='product.html?id=${p.id}'">
                <div class="aspect-square bg-surface-container rounded-t overflow-hidden relative">
                    <img src="${img}" alt="${p.name}" class="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300">
                    <button class="cart-btn absolute bottom-2 right-2 bg-white rounded-full p-2 shadow hover:bg-primary hover:text-white transition-colors" onclick="event.stopPropagation(); addToCart(${pObj})">
                        <span class="material-symbols-outlined text-[18px]">shopping_cart</span>
                    </button>
                </div>
                <div class="p-3">
                    <span class="text-[10px] font-bold text-outline-variant uppercase tracking-wider">${categoryName}</span>
                    <h4 class="text-sm font-bold text-on-surface truncate mt-1">${p.name}</h4>
                    <div class="mt-2 flex items-center gap-2">
                        <span class="text-sm font-bold text-primary">${formatPrice(price)}</span>
                        ${mrpLine}
                    </div>
                </div>
            </div>
            `;
        }).join('');
    } catch(err) {
        console.error("Error loading similar products:", err);
    }
}

// --- International Payment (PayPal) Logic ---
window.handleCountryChange = function() {
    const countryEl = document.getElementById('shipCountry');
    if (!countryEl) return;
    const country = countryEl.value;
    
    const upiWrapper = document.getElementById('upiOptionWrapper');
    const codWrapper = document.getElementById('codOptionWrapper');
    const shippingLabel = document.getElementById('shippingLabel');
    const summaryShipping = document.getElementById('summaryShipping');
    
    let isInternational = country !== 'India';
    
    if (isInternational) {
        if(upiWrapper) upiWrapper.classList.add('hidden');
        if(codWrapper) codWrapper.classList.add('hidden');
        
        if (shippingLabel) shippingLabel.textContent = 'International Shipping';
        if (summaryShipping) summaryShipping.textContent = '₹1,499';
        
        // Update total
        let finalTotal = (window.baseFinalTotal || 0) + 1499;
        document.getElementById('summaryTotal').textContent = window.formatPrice ? window.formatPrice(finalTotal) : '₹' + finalTotal;
        document.getElementById('bottomTotal').textContent = window.formatPrice ? window.formatPrice(finalTotal) : '₹' + finalTotal;
    } else {
        if(upiWrapper) upiWrapper.classList.remove('hidden');
        if(codWrapper) codWrapper.classList.remove('hidden');
        
        if (shippingLabel) shippingLabel.textContent = 'Domestic Shipping';
        if (summaryShipping) summaryShipping.textContent = 'FREE';
        
        // Ensure UPI or COD is selected
        if (typeof selectPayment === 'function') selectPayment('upi');
        
        // Update total
        let finalTotal = (window.baseFinalTotal || 0);
        document.getElementById('summaryTotal').textContent = window.formatPrice ? window.formatPrice(finalTotal) : '₹' + finalTotal;
        document.getElementById('bottomTotal').textContent = window.formatPrice ? window.formatPrice(finalTotal) : '₹' + finalTotal;
    }
};


