// Recommendation Engine for PrajCraft

const RECENTLY_VIEWED_KEY = 'prajcraft_recently_viewed';
const MAX_RECENT_VIEWS = 10;
const REC_CACHE = {}; // Simple in-memory cache

// -------------------------------------------------------------
// Core Utility: Render Cards
// -------------------------------------------------------------
function renderRecommendationCards(products, containerId) {
    const container = document.getElementById(containerId);
    if (!container) return;
    
    if (!products || products.length === 0) {
        container.innerHTML = '<p class="text-sm text-outline px-4">No recommendations available at this time.</p>';
        return;
    }

    container.innerHTML = products.map(p => {
        let priceHtml = `<span class="font-label-md font-bold text-on-surface">₹${p.price.toLocaleString('en-IN')}</span>`;
        if (p.discount_price && p.discount_price < p.price) {
            const discountPercent = Math.round(((p.price - p.discount_price) / p.price) * 100);
            priceHtml = `
                <div class="flex items-center gap-2">
                    <span class="font-label-md font-bold text-primary-container">₹${p.discount_price.toLocaleString('en-IN')}</span>
                    <span class="text-xs text-outline line-through">₹${p.price.toLocaleString('en-IN')}</span>
                    <span class="text-[10px] bg-tertiary/10 text-tertiary px-1 py-0.5 rounded font-bold">${discountPercent}% OFF</span>
                </div>
            `;
        }
        
        const mainImage = (p.images && p.images.length > 0) ? p.images[0] : 'https://placehold.co/400x400/1c1b1b/d4af37?text=No+Image';

        return `
        <div class="flex-shrink-0 w-[160px] md:w-[220px] bg-surface rounded-xl overflow-hidden border border-outline-variant shadow-sm hover:shadow-md transition-shadow group relative cursor-pointer flex flex-col" onclick="window.location.href='product.html?id=${p.id}'">
            <div class="relative w-full aspect-[4/5] bg-surface-container-low overflow-hidden">
                <img src="${mainImage}" alt="${p.name}" class="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105" loading="lazy">
                <button onclick="event.stopPropagation(); window.toggleWishlist('${p.id}')" class="absolute top-2 right-2 size-8 rounded-full bg-white/80 backdrop-blur flex items-center justify-center text-outline hover:text-tertiary transition-colors z-10 shadow-sm">
                    <span class="material-symbols-outlined text-[18px]">favorite</span>
                </button>
            </div>
            <div class="p-3 flex flex-col flex-grow justify-between">
                <div>
                    <h4 class="font-label-md font-medium text-sm text-on-surface line-clamp-2 leading-snug mb-1">${p.name}</h4>
                    ${(() => {
                        let avgRating = p.rating || '0.0';
                        let count = p.reviews_count || 0;
                        if (p.reviews && Array.isArray(p.reviews)) {
                            const approved = p.reviews.filter(r => r.status === 'Approved');
                            if (approved.length > 0) {
                                avgRating = (approved.reduce((s, r) => s + (r.rating || 0), 0) / approved.length).toFixed(1);
                                count = approved.length;
                            }
                        }
                        return `
                        <div class="flex items-center gap-1 mb-2">
                            <span class="material-symbols-outlined text-[#d4af37]" style="font-variation-settings: 'FILL' 1; font-size: 14px;">star</span>
                            <span class="text-xs font-bold text-on-surface">${avgRating}</span>
                            <span class="text-xs text-outline">(${count})</span>
                        </div>`;
                    })()}
                </div>
                <div>
                    ${priceHtml}
                </div>
            </div>
        </div>
        `;
    }).join('');
}

// -------------------------------------------------------------
// 1. Recently Viewed Logic
// -------------------------------------------------------------
window.trackRecentlyViewed = function(product) {
    if (!product || !product.id) return;
    try {
        let viewed = JSON.parse(localStorage.getItem(RECENTLY_VIEWED_KEY) || '[]');
        // Remove if exists to push to front
        viewed = viewed.filter(id => id !== product.id);
        viewed.unshift(product.id);
        if (viewed.length > MAX_RECENT_VIEWS) {
            viewed = viewed.slice(0, MAX_RECENT_VIEWS);
        }
        localStorage.setItem(RECENTLY_VIEWED_KEY, JSON.stringify(viewed));
    } catch(e) {
        console.error('Error tracking recently viewed', e);
    }
}

async function fetchRecentlyViewed() {
    try {
        const viewedIds = JSON.parse(localStorage.getItem(RECENTLY_VIEWED_KEY) || '[]');
        if (viewedIds.length === 0) return [];
        
        const { data } = await window.supabase
            .from('products')
            .select('*, reviews(rating, status)')
            .in('id', viewedIds)
            .eq('status', 'Active');
            
        if (!data) return [];
        
        // Preserve order from local storage
        return viewedIds.map(id => data.find(p => p.id === id)).filter(Boolean);
    } catch(e) {
        return [];
    }
}

// -------------------------------------------------------------
// 2. New Arrivals
// -------------------------------------------------------------
function fetchNewArrivals() {
    if (REC_CACHE['newArrivals']) return REC_CACHE['newArrivals'];
    REC_CACHE['newArrivals'] = window.supabase
        .from('products')
        .select('*, reviews(rating, status)')
        .eq('status', 'Active')
        .order('created_at', { ascending: false })
        .limit(8)
        .then(({ data }) => data || []);
    return REC_CACHE['newArrivals'];
}

// -------------------------------------------------------------
// 3. Trending Products
// -------------------------------------------------------------
function fetchTrending() {
    if (REC_CACHE['trending']) return REC_CACHE['trending'];
    // In absence of views/order aggregation RPC, we proxy Trending via reviews_count and is_bestseller
    REC_CACHE['trending'] = window.supabase
        .from('products')
        .select('*, reviews(rating, status)')
        .eq('status', 'Active')
        .order('reviews_count', { ascending: false })
        .order('rating', { ascending: false })
        .limit(8)
        .then(({ data }) => data || []);
    return REC_CACHE['trending'];
}

// -------------------------------------------------------------
// 4. Similar Products
// -------------------------------------------------------------
async function fetchSimilarProducts(productId, categoryId, price) {
    const minPrice = price * 0.8;
    const maxPrice = price * 1.2;
    
    const { data } = await window.supabase
        .from('products')
        .select('*, reviews(rating, status)')
        .eq('category_id', categoryId)
        .eq('status', 'Active')
        .neq('id', productId)
        .gte('price', minPrice)
        .lte('price', maxPrice)
        .limit(8);
        
    return data || [];
}

// -------------------------------------------------------------
// 5. Customers Also Bought & FBT
// -------------------------------------------------------------
async function getCoPurchasedProducts(productId, limit = 8) {
    if (!REC_CACHE[`co_${productId}`]) {
        REC_CACHE[`co_${productId}`] = (async () => {
            try {
                const { data: relatedItems } = await window.supabase
                    .from('order_items')
                    .select('order_id')
                    .eq('product_id', productId)
                    .limit(100);

                if (!relatedItems || relatedItems.length === 0) return [];
                
                const orderIds = relatedItems.map(i => i.order_id);
                
                const { data: coPurchased } = await window.supabase
                    .from('order_items')
                    .select('product_id, products(*)')
                    .in('order_id', orderIds)
                    .neq('product_id', productId);
                    
                if (!coPurchased) return [];
                
                const frequencyMap = {};
                const productMap = {};
                
                coPurchased.forEach(item => {
                    if (item.products && item.products.status === 'Active') {
                        frequencyMap[item.product_id] = (frequencyMap[item.product_id] || 0) + item.quantity;
                        productMap[item.product_id] = item.products;
                    }
                });
                
                const sortedIds = Object.keys(frequencyMap).sort((a, b) => frequencyMap[b] - frequencyMap[a]);
                return sortedIds.map(id => productMap[id]);
                
            } catch(e) {
                console.error('Error fetching co-purchased', e);
                return [];
            }
        })();
    }
    
    const products = await REC_CACHE[`co_${productId}`];
    return products.slice(0, limit);
}

// -------------------------------------------------------------
// 6. You May Also Like
// -------------------------------------------------------------
async function fetchYouMayAlsoLike() {
    try {
        // Build context from recently viewed
        const viewedIds = JSON.parse(localStorage.getItem(RECENTLY_VIEWED_KEY) || '[]');
        if (viewedIds.length > 0) {
            // Get categories of recently viewed
            const { data: viewedProds } = await window.supabase
                .from('products')
                .select('category_id')
                .in('id', viewedIds.slice(0, 3));
                
            if (viewedProds && viewedProds.length > 0) {
                const categoryId = viewedProds[0].category_id;
                const { data: ymal } = await window.supabase
                    .from('products')
                    .select('*, reviews(rating, status)')
                    .eq('category_id', categoryId)
                    .eq('status', 'Active')
                    .limit(8);
                
                // Shuffle or return directly
                if (ymal && ymal.length > 0) return ymal;
            }
        }
        
        // Fallback to Trending
        return await fetchTrending();
    } catch(e) {
        return await fetchTrending();
    }
}

// -------------------------------------------------------------
// Orchestration & Lazy Loading
// -------------------------------------------------------------
window.initRecommendations = function() {
    const observer = new IntersectionObserver((entries, obs) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                const section = entry.target;
                const recType = section.getAttribute('data-rec-type');
                const containerId = section.getAttribute('data-rec-container');
                const contextId = section.getAttribute('data-rec-context-id');
                const contextCat = section.getAttribute('data-rec-context-cat');
                const contextPrice = parseFloat(section.getAttribute('data-rec-context-price'));
                
                loadSection(recType, containerId, { id: contextId, categoryId: contextCat, price: contextPrice })
                    .then(() => obs.unobserve(section)); // Stop observing once loaded
            }
        });
    }, { rootMargin: "0px 0px 200px 0px" }); // Start loading 200px before scrolling into view

    document.querySelectorAll('[data-rec-type]').forEach(el => observer.observe(el));
};

async function loadSection(type, containerId, context) {
    let products = [];
    
    switch(type) {
        case 'recently-viewed':
            products = await fetchRecentlyViewed();
            if (context && context.id) {
                products = products.filter(p => p.id !== context.id);
            }
            if (products.length === 0) {
                // Fallback to Trending if Recently Viewed is empty
                products = await fetchTrending();
                if (context && context.id) {
                    products = products.filter(p => p.id !== context.id);
                }
                const section = document.getElementById(containerId).closest('section');
                const titleEl = section.querySelector('h3');
                if (titleEl) titleEl.textContent = 'Trending Products';
                const iconEl = section.querySelector('.material-symbols-outlined');
                if (iconEl) iconEl.textContent = 'trending_up';
            }
            break;
        case 'new-arrivals':
            products = await fetchNewArrivals();
            if (context && context.id) products = products.filter(p => p.id !== context.id);
            break;
        case 'trending':
            products = await fetchTrending();
            if (context && context.id) products = products.filter(p => p.id !== context.id);
            break;
        case 'ymal':
            products = await fetchYouMayAlsoLike();
            if (context && context.id) products = products.filter(p => p.id !== context.id);
            break;
        case 'similar':
            if (context.id && context.categoryId) {
                products = await fetchSimilarProducts(context.id, context.categoryId, context.price);
                // Fallback if price restricted query yields empty
                if (products.length === 0) {
                    const { data } = await window.supabase
                        .from('products')
                        .select('*, reviews(rating, status)')
                        .eq('category_id', context.categoryId)
                        .eq('status', 'Active')
                        .neq('id', context.id)
                        .limit(8);
                    products = data || [];
                }
            }
            if (products.length === 0) {
                products = await fetchTrending();
                if (context && context.id) products = products.filter(p => p.id !== context.id);
            }
            break;
        case 'also-bought':
            if (context.id) {
                products = await getCoPurchasedProducts(context.id, 8);
            }
            if (products.length === 0) {
                products = await fetchTrending();
                if (context && context.id) products = products.filter(p => p.id !== context.id);
                // Randomize slightly so it doesn't look exactly like trending
                products = products.sort(() => 0.5 - Math.random());
            }
            break;
        case 'fbt':
            if (context.id) {
                products = await getCoPurchasedProducts(context.id, 2);
                if (products.length === 0 && context.categoryId) {
                    const { data } = await window.supabase
                        .from('products')
                        .select('*, reviews(rating, status)')
                        .eq('category_id', context.categoryId)
                        .eq('status', 'Active')
                        .neq('id', context.id)
                        .limit(2);
                    products = data || [];
                }
                if (products.length === 0) {
                    products = await fetchTrending();
                    products = products.filter(p => p.id !== context.id).slice(0, 2);
                }
                renderFrequentlyBoughtTogether(context.id, products, containerId);
                return; // FBT has custom UI
            }
            break;
    }
    
    if (type !== 'fbt') {
        renderRecommendationCards(products, containerId);
    }
}

// -------------------------------------------------------------
// Frequently Bought Together Custom UI
// -------------------------------------------------------------
window.fbtState = []; // Holds items to be added

function renderFrequentlyBoughtTogether(mainProductId, fbtProducts, containerId) {
    const container = document.getElementById(containerId);
    const section = container.closest('section');
    
    if (!fbtProducts || fbtProducts.length === 0) {
        section.style.display = 'none';
        return;
    }

    // We assume window.currentProduct is accessible globally on product.html
    const mainProduct = window.currentProduct;
    if (!mainProduct) return;

    const allItems = [mainProduct, ...fbtProducts];
    
    let html = `
        <div class="flex flex-col md:flex-row gap-8 items-center bg-surface-container-low p-6 rounded-2xl border border-outline-variant">
            <!-- Visual Group -->
            <div class="flex-1 flex items-center gap-4 flex-wrap justify-center md:justify-start">
                ${allItems.map((p, idx) => `
                    <div class="relative w-24 h-24 bg-white rounded border border-outline-variant overflow-hidden shadow-sm flex-shrink-0 cursor-pointer" onclick="window.location.href='product.html?id=${p.id}'">
                        <img src="${(p.images && p.images.length > 0) ? p.images[0] : 'https://placehold.co/100'}" class="w-full h-full object-cover">
                    </div>
                    ${idx < allItems.length - 1 ? `<span class="material-symbols-outlined text-outline">add</span>` : ''}
                `).join('')}
            </div>
            
            <!-- Checkboxes & Action -->
            <div class="w-full md:w-auto bg-white p-4 rounded-xl border border-outline-variant shadow-sm flex flex-col gap-3 min-w-[280px]">
                <div class="space-y-2" id="fbtCheckboxes">
                    ${allItems.map((p, idx) => `
                        <label class="flex items-start gap-2 cursor-pointer text-sm">
                            <input type="checkbox" class="mt-1 rounded text-primary focus:ring-primary bg-surface-variant border-outline-variant fbt-checkbox" data-idx="${idx}" checked onchange="updateFBTTotals()">
                            <span class="flex-1 text-on-surface line-clamp-1">${idx===0 ? '<strong>This Item:</strong> ' : ''}${p.name}</span>
                            <span class="font-bold whitespace-nowrap">₹${(p.discount_price || p.price).toLocaleString('en-IN')}</span>
                        </label>
                    `).join('')}
                </div>
                <div class="border-t border-outline-variant pt-3 mt-1 flex justify-between items-center">
                    <span class="text-sm font-bold text-outline">Total Price:</span>
                    <span class="text-lg font-bold text-primary-container" id="fbtTotalPrice">₹0</span>
                </div>
                <button onclick="addFBTToCart()" class="w-full bg-primary-container hover:brightness-105 text-on-background py-2 rounded font-bold text-sm shadow-sm transition-all flex items-center justify-center gap-2">
                    <span class="material-symbols-outlined text-[18px]">shopping_cart_checkout</span> Add Selected to Cart
                </button>
            </div>
        </div>
    `;
    
    container.innerHTML = html;
    
    // Setup state
    window.fbtState = allItems;
    updateFBTTotals();
}

window.updateFBTTotals = function() {
    const checkboxes = document.querySelectorAll('.fbt-checkbox');
    let total = 0;
    checkboxes.forEach(cb => {
        if (cb.checked) {
            const idx = cb.getAttribute('data-idx');
            const p = window.fbtState[idx];
            total += (p.discount_price || p.price);
        }
    });
    const priceEl = document.getElementById('fbtTotalPrice');
    if (priceEl) priceEl.textContent = `₹${total.toLocaleString('en-IN')}`;
}

window.addFBTToCart = async function() {
    const checkboxes = document.querySelectorAll('.fbt-checkbox');
    let addedCount = 0;
    
    for (let cb of checkboxes) {
        if (cb.checked) {
            const idx = cb.getAttribute('data-idx');
            const p = window.fbtState[idx];
            const item = {
                id: p.id,
                name: p.name,
                price: p.discount_price || p.price,
                image: (p.images && p.images.length > 0) ? p.images[0] : 'https://via.placeholder.com/400'
            };
            if (typeof window.addToCart === 'function') {
                window.addToCart(item);
                addedCount++;
            }
        }
    }
    
    if (addedCount > 0) {
        // window.addToCart already shows a toast, but we can show a generic alert if needed, or rely on the toast.
        if (typeof window.updateCartBadge === 'function') {
            window.updateCartBadge();
        }
    }
}
