// Customer Authentication Logic
document.addEventListener('DOMContentLoaded', async () => {
    // Check if already logged in
    const { data: { session } } = await window.supabase.auth.getSession();
    
    // Listen for auth state changes (like Password Recovery)
    window.supabase.auth.onAuthStateChange((event, session) => {
        if (event === 'PASSWORD_RECOVERY') {
            window.isPasswordRecovery = true;
            // Ensure they are on profile page to change password
            if (!window.location.pathname.endsWith('profile.html')) {
                window.location.href = 'profile.html';
                return;
            }
            // Show password form and hide 'Current Password' requirement
            alert("Please enter your new password.");
            setTimeout(() => {
                const formContainer = document.getElementById('passwordFormContainer');
                if (formContainer) {
                    formContainer.classList.remove('hidden');
                    document.getElementById('showPasswordBtn').classList.add('hidden');
                    // Hide the current password field container
                    const currentPwdInput = document.getElementById('currentPassword');
                    if (currentPwdInput) {
                        currentPwdInput.parentElement.classList.add('hidden');
                        currentPwdInput.required = false;
                    }
                }
            }, 500);
        }
    });

    if (session) {
        // Google OAuth Redirect Handling & Strict DB Injection
        if (window.location.pathname.endsWith('login.html') || window.location.hash.includes('access_token')) {
            console.log("=== BEGIN OAUTH PROVISIONING ===");
            console.log("Auth User ID:", session.user.id);
            
            const fullName = session.user.user_metadata?.full_name || session.user.email.split('@')[0];
            const avatar = session.user.user_metadata?.avatar_url || null;
            
            // 1. Perform UPSERT
            const { data: upsertData, error: upsertErr } = await window.supabase.from('users').upsert({
                id: session.user.id,
                full_name: fullName,
                avatar_url: avatar
            }, { onConflict: 'id' }).select();
            
            console.log("UPSERT Result Data:", upsertData);
            if (upsertErr) {
                console.error("UPSERT Error:", upsertErr);
                alert("Critical Provisioning Error: UPSERT failed.\n" + JSON.stringify(upsertErr));
                return; // Block checkout/redirect
            }
            
            // 2. Verify row exists
            const { data: verifyData, error: verifyErr } = await window.supabase
                .from('users')
                .select('id')
                .eq('id', session.user.id)
                .maybeSingle();
                
            if (verifyErr || !verifyData) {
                console.error("Verification SELECT Error:", verifyErr || "Row not found after UPSERT.");
                alert("Critical Provisioning Error: Verification failed.\nQuery: SELECT id FROM public.users WHERE id = '" + session.user.id + "'\nError: " + JSON.stringify(verifyErr));
                return; // Block checkout/redirect
            }
            
            console.log("Verified public.users ID:", verifyData.id);
            console.log("=== OAUTH PROVISIONING SUCCESS ===");
            
            // Intelligently redirect to previous page or profile, cleaning up the URL hash
            const returnUrl = sessionStorage.getItem('returnUrl') || 'profile.html';
            sessionStorage.removeItem('returnUrl');
            window.location.href = returnUrl;
            return;
        }
        
        // If on profile, load data
        if (document.getElementById('profileHeader')) {
            loadProfileData(session.user);
            const urlParams = new URLSearchParams(window.location.search);
            const tabParam = urlParams.get('tab');
            if (tabParam) {
                setTimeout(() => window.switchProfileTab(tabParam), 100);
            }
        }
        
        // If on ordertrack, load track data
        if (document.getElementById('trackContainer')) {
            loadOrderTrackData(session.user);
        }
    } else {
        // Redirect to login if on profile or ordertrack
        if (window.location.pathname.endsWith('profile.html') || window.location.pathname.endsWith('ordertrack.html')) {
            window.location.href = 'login.html';
        }
    }
});

window.handleGoogleLogin = async function() {
    const btn = document.getElementById('googleLoginBtn');
    if(btn) btn.disabled = true;
    
    try {
        const { error } = await window.supabase.auth.signInWithOAuth({
            provider: 'google',
            options: {
                redirectTo: window.location.origin + '/login.html'
            }
        });
        
        if (error) throw error;
    } catch (err) {
        console.error("Google login error:", err);
        const errDiv = document.getElementById('loginError');
        if (errDiv) {
            errDiv.textContent = err.message;
            errDiv.style.display = 'block';
            errDiv.classList.remove('hidden');
        }
        if(btn) btn.disabled = false;
    }
}

window.handleCustomerLogout = async function(event) {
    if(event) event.preventDefault();
    await window.supabase.auth.signOut();
    window.location.href = 'index.html';
}

window.forgotPassword = async function() {
    const emailInput = document.getElementById('emailInput');
    if (!emailInput || !emailInput.value) {
        alert('Please enter your email address first, then click Forgot Password.');
        return;
    }
    const { error } = await window.supabase.auth.resetPasswordForEmail(emailInput.value, {
        redirectTo: window.location.origin + '/profile.html'
    });
    if (error) {
        alert('Error: ' + error.message);
    } else {
        alert('If this email is registered, a password reset link has been sent to it.');
    }
}

async function loadProfileData(user) {
    try {
        // Get user profile data
        const { data: profile } = await window.supabase.from('users').select('*').eq('id', user.id).maybeSingle();
        
        let fullName = user.email.split('@')[0];
        let phoneStr = '';
        if (profile) {
            if (profile.full_name) fullName = profile.full_name;
            if (profile.phone) phoneStr = profile.phone;
        }

        const nameParts = fullName.split(' ');
        const firstN = nameParts[0];
        const lastN = nameParts.slice(1).join(' ');

        const nameEl = document.getElementById('sidebarProfileName');
        if (nameEl) nameEl.textContent = fullName;
        
        const headerName = document.getElementById('profileName');
        if (headerName) headerName.textContent = fullName;
        
        const headerEmail = document.getElementById('profileEmail');
        if (headerEmail) headerEmail.textContent = user.email;
        
        const fnEl = document.getElementById('firstName');
        if (fnEl) fnEl.value = firstN;
        const lnEl = document.getElementById('lastName');
        if (lnEl) lnEl.value = lastN;
        const emEl = document.getElementById('emailAddr');
        if (emEl) emEl.value = user.email;
        const mobEl = document.getElementById('mobileNumber');
        if (mobEl) mobEl.value = phoneStr;

        const dobEl = document.getElementById('dob');
        if (dobEl && profile?.dob) dobEl.value = profile.dob;
        
        const genderEl = document.getElementById('gender');
        if (genderEl && profile?.gender) genderEl.value = profile.gender;
        
        const avatarEl = document.getElementById('profileAvatar');
        if (avatarEl && profile?.avatar_url) avatarEl.src = profile.avatar_url;

        // Stats
        const statMember = document.getElementById('statMemberSince');
        if (statMember) {
            statMember.textContent = new Date(user.created_at).toLocaleDateString('en-US', { month: 'short', year: 'numeric' });
        }

        const { count } = await window.supabase.from('orders').select('*', { count: 'exact', head: true }).eq('user_id', user.id);
        const statOrders = document.getElementById('statOrders');
        if (statOrders) statOrders.textContent = count || 0;

        loadAddresses(user.id);
        loadOrderHistory(user.id);
        if (typeof loadNotifications === 'function') loadNotifications(user.id);

    } catch (err) {
        console.error("Error loading profile:", err);
    }
}

async function loadOrderHistory(userId) {
    try {
        const { data: orders, error } = await window.supabase
            .from('orders')
            .select('*, order_items(*, products(*)), addresses(*)')
            .eq('user_id', userId)
            .order('created_at', { ascending: false });

        const container = document.getElementById('orderHistoryList');
        if (!container) return;

        if (error || !orders || orders.length === 0) {
            container.innerHTML = '<p class="text-sm text-outline p-4 border border-outline-variant rounded bg-surface-container-low text-center">No orders found.</p>';
            return;
        }

        container.innerHTML = orders.map(o => {
            const date = new Date(o.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
            let itemsHtml = o.order_items.map(i => {
                const pName = i.products ? (Array.isArray(i.products) ? i.products[0]?.name : i.products.name) : 'Product';
                return `<p class="text-sm text-on-surface">• ${pName} (x${i.quantity})</p>`;
            }).join('');
            
            let statusClass = 'bg-surface-container text-on-surface-variant';
            if (o.status === 'Cancelled') statusClass = 'bg-red-100 text-red-700';
            else if (o.status === 'Confirmed') statusClass = 'bg-blue-100 text-blue-700';
            else if (o.status === 'Pending') statusClass = 'bg-yellow-100 text-yellow-700';
            else if (o.status === 'Processing') statusClass = 'bg-purple-100 text-purple-700';
            else if (o.status === 'Shipped') statusClass = 'bg-orange-100 text-orange-700';
            else if (o.status === 'Delivered') statusClass = 'bg-green-100 text-green-700';
            else if (o.status === 'Refunded') statusClass = 'bg-gray-200 text-gray-800';

            return `
            <div class="border border-outline-variant rounded p-4 bg-white relative hover:border-[#2874f0] transition-colors cursor-pointer" onclick="window.location.href='ordertrack.html?order_id=${o.id}'">
                <div class="flex justify-between items-start mb-2">
                    <div>
                        <p class="text-xs text-outline font-bold">INV: ${o.order_number || o.id.substring(0,8).toUpperCase()}</p>
                        <p class="text-xs text-outline-variant">${date}</p>
                    </div>
                    <div class="flex flex-col items-end gap-1">
                        <span class="${statusClass} px-2 py-1 text-xs rounded font-bold">${o.status}</span>
                        <span class="text-[10px] text-outline font-bold border border-outline px-1 rounded">${o.payment_status || 'Pending'}</span>
                    </div>
                </div>
                <div class="mb-3">
                    ${itemsHtml}
                </div>
                <p class="text-sm text-primary font-bold">Total: ₹${(o.final_total || 0).toLocaleString('en-IN')}</p>
            </div>
            `;
        }).join('');
    } catch(err) {
        console.error(err);
    }
}

// Notifications Logic
async function loadNotifications(userId) {
    try {
        const { data: notifications, error } = await window.supabase
            .from('notifications')
            .select('*')
            .eq('user_id', userId)
            .order('created_at', { ascending: false });
            
        const container = document.getElementById('notificationsList');
        if (!container) return;

        if (error || !notifications || notifications.length === 0) {
            container.innerHTML = `
            <div class="p-6 border border-outline-variant rounded bg-surface-container-low text-center flex flex-col items-center justify-center">
                <span class="material-symbols-outlined text-4xl text-outline mb-2">notifications_off</span>
                <p class="text-sm text-on-surface font-bold">No notifications yet.</p>
                <p class="text-xs text-outline mt-1">We will notify you when something important happens.</p>
            </div>
            `;
            return;
        }

        container.innerHTML = notifications.map(n => {
            const date = new Date(n.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric', hour: '2-digit', minute: '2-digit' });
            let icon = 'notifications';
            if (n.type === 'Order') icon = 'local_shipping';
            if (n.type === 'Promo') icon = 'loyalty';
            
            return `
            <div class="p-4 border border-outline-variant rounded bg-white relative flex gap-4 ${n.is_read ? 'opacity-80' : 'border-[#2874f0] shadow-sm'}">
                <div class="w-10 h-10 rounded-full bg-surface-container-low flex items-center justify-center text-primary-fixed-dim">
                    <span class="material-symbols-outlined">${icon}</span>
                </div>
                <div class="flex-1">
                    <div class="flex justify-between items-start mb-1">
                        <h4 class="font-bold text-sm text-on-surface">${n.title}</h4>
                        <span class="text-[10px] text-outline">${date}</span>
                    </div>
                    <p class="text-sm text-on-surface-variant">${n.message}</p>
                </div>
                ${!n.is_read ? `<div class="w-2 h-2 rounded-full bg-[#2874f0] absolute top-4 right-4"></div>` : ''}
            </div>
            `;
        }).join('');

        // Mark as read when they load the tab (simplification)
        const unreadIds = notifications.filter(n => !n.is_read).map(n => n.id);
        if (unreadIds.length > 0) {
            await window.supabase.from('notifications').update({ is_read: true }).in('id', unreadIds);
        }

    } catch (err) {
        console.error(err);
    }
}

// Profile Tab Logic
window.switchProfileTab = function(tabName) {
    document.querySelectorAll('.profile-tab').forEach(el => el.classList.add('hidden'));
    document.getElementById('tab-' + tabName).classList.remove('hidden');
}

window.enableProfileEdit = function() {
    ['firstName', 'lastName', 'mobileNumber', 'dob', 'gender'].forEach(id => {
        const el = document.getElementById(id);
        if (el) {
            el.disabled = false;
            el.classList.remove('bg-surface-container-low');
            el.classList.add('bg-white');
        }
    });
    document.getElementById('profileSaveActions').classList.remove('hidden');
}

window.cancelProfileEdit = function() {
    ['firstName', 'lastName', 'mobileNumber', 'dob', 'gender'].forEach(id => {
        const el = document.getElementById(id);
        if (el) {
            el.disabled = true;
            el.classList.add('bg-surface-container-low');
            el.classList.remove('bg-white');
        }
    });
    document.getElementById('profileSaveActions').classList.add('hidden');
}

window.saveProfileInfo = async function(event) {
    event.preventDefault();
    const btn = event.target.querySelector('button[type="submit"]');
    btn.innerHTML = 'SAVING...';
    btn.disabled = true;

    try {
        const { data: { session } } = await window.supabase.auth.getSession();
        if (!session) return;
        const fullName = (document.getElementById('firstName').value + ' ' + document.getElementById('lastName').value).trim();
        const phone = document.getElementById('mobileNumber').value;
        const dob = document.getElementById('dob')?.value || null;
        const gender = document.getElementById('gender')?.value || null;

        const { error } = await window.supabase.from('users').upsert({
            id: session.user.id,
            full_name: fullName,
            phone: phone,
            dob: dob,
            gender: gender
        });
        
        if (error) throw error;
        
        document.getElementById('sidebarProfileName').textContent = fullName;
        const headerName = document.getElementById('profileName');
        if (headerName) headerName.textContent = fullName;

        alert('Profile saved successfully!');
        cancelProfileEdit();
    } catch(err) {
        alert('Database Error: ' + err.message + '\n\nIf you see a security/policy error, you need to disable Row Level Security (RLS) on the users and addresses tables in your Supabase dashboard.');
    } finally {
        btn.innerHTML = 'SAVE';
        btn.disabled = false;
    }
}

window.uploadAvatar = async function(event) {
    const file = event.target.files[0];
    if (!file) return;

    try {
        const { data: { session } } = await window.supabase.auth.getSession();
        if (!session) return;

        const fileExt = file.name.split('.').pop();
        const fileName = `${session.user.id}-${Math.random()}.${fileExt}`;
        const filePath = `avatars/${fileName}`;

        // Ensure "media" bucket exists and is public in Supabase Storage
        const { error: uploadError } = await window.supabase.storage
            .from('media')
            .upload(filePath, file);

        if (uploadError) throw uploadError;

        const { data: { publicUrl } } = window.supabase.storage
            .from('media')
            .getPublicUrl(filePath);

        // Update user table
        const { error: updateError } = await window.supabase.from('users').upsert({
            id: session.user.id,
            avatar_url: publicUrl
        });

        if (updateError) throw updateError;

        document.getElementById('profileAvatar').src = publicUrl;
        alert("Profile photo updated successfully!");
    } catch(err) {
        console.error(err);
        alert('Upload Error: ' + err.message + '\n\nPlease ensure a storage bucket named "media" exists and is public.');
    }
}

// Addresses Logic
window.openAddressForm = function() {
    document.getElementById('addressFormContainer').classList.remove('hidden');
    document.getElementById('addressForm').reset();
    document.getElementById('addressId').value = '';
}

window.closeAddressForm = function() {
    document.getElementById('addressFormContainer').classList.add('hidden');
}

window.saveAddress = async function(event) {
    event.preventDefault();
    try {
        const { data: { session } } = await window.supabase.auth.getSession();
        if (!session) return;

        const payload = {
            user_id: session.user.id,
            title: document.querySelector('input[name="addrTitle"]:checked').value,
            full_address: document.getElementById('addrFull').value + ', ' + document.getElementById('addrLocality').value + ' (Name: ' + document.getElementById('addrName').value + ', Phone: ' + document.getElementById('addrPhone').value + ')',
            city: document.getElementById('addrCity').value,
            state: document.getElementById('addrState').value,
            pincode: document.getElementById('addrPincode').value
        };

        const id = document.getElementById('addressId').value;
        let dbError;
        if (id) {
            const { error } = await window.supabase.from('addresses').update(payload).eq('id', id);
            dbError = error;
        } else {
            const { error } = await window.supabase.from('addresses').insert([payload]);
            dbError = error;
        }
        
        if (dbError) throw dbError;

        closeAddressForm();
        loadAddresses(session.user.id);
    } catch(e) {
        alert('Database Error: ' + e.message + '\n\nIf you see a security/policy error, you need to disable Row Level Security (RLS) on the users and addresses tables in your Supabase dashboard.');
    }
}

async function loadAddresses(userId) {
    try {
        const { data: addresses } = await window.supabase.from('addresses').select('*').eq('user_id', userId);
        const container = document.getElementById('addressesList');
        if (!addresses || addresses.length === 0) {
            container.innerHTML = '<p class="text-sm text-outline p-4 border border-outline-variant rounded bg-surface-container-low text-center">No addresses found.</p>';
            return;
        }

        container.innerHTML = addresses.map(a => `
            <div class="border border-outline-variant rounded p-4 bg-white relative hover:border-[#2874f0] transition-colors">
                <div class="flex items-center gap-4 mb-2">
                    <span class="bg-surface-container px-2 py-1 text-xs text-on-surface-variant rounded font-bold">${a.title}</span>
                </div>
                <p class="text-sm text-on-surface leading-relaxed mb-2">${a.full_address}</p>
                <p class="text-sm text-on-surface font-bold">${a.city}, ${a.state} - ${a.pincode}</p>
                
                <div class="absolute top-4 right-4 flex gap-4">
                    <button class="text-error font-bold text-sm" onclick="deleteAddress('${a.id}', '${userId}')">DELETE</button>
                </div>
            </div>
        `).join('');
    } catch(e) {
        console.error(e);
    }
}

window.deleteAddress = async function(id, userId) {
    if(confirm('Are you sure you want to delete this address?')) {
        await window.supabase.from('addresses').delete().eq('id', id);
        loadAddresses(userId);
    }
}

async function loadOrderTrackData(user) {
    try {
        const container = document.getElementById('trackContainer');
        
        // Check for order_id in URL
        const urlParams = new URLSearchParams(window.location.search);
        const orderIdParam = urlParams.get('order_id');

        let query = window.supabase
            .from('orders')
            .select('*, order_items(*, products(*)), addresses(*)')
            .eq('user_id', user.id);
            
        if (orderIdParam) {
            query = query.eq('id', orderIdParam).maybeSingle();
        } else {
            query = query.order('created_at', { ascending: false }).limit(1).maybeSingle();
        }

        const { data: order, error } = await query;

        if (error) throw error;

        if (!order) {
            container.innerHTML = '<p style="text-align:center; padding:20px; font-weight:600;">No orders found to track.</p>';
            return;
        }

        const date = new Date(order.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
        
        // Render timeline based on status
        const statuses = ['Pending', 'Verification Pending', 'Confirmed', 'Processing', 'Packed', 'Shipped', 'Out For Delivery', 'Delivered'];
        let currentIndex = statuses.indexOf(order.status);
        if (currentIndex === -1) {
            if (order.status === 'Payment Failed') currentIndex = 0; // Show failed at step 1
            else currentIndex = 0;
        }

        const createdDate = new Date(order.created_at);
        const expectedDate = new Date(createdDate.getTime() + (14 * 24 * 60 * 60 * 1000));
        const expectedDateStr = expectedDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });

        const deliveryAddress = order.addresses || null;
        let addressHtml = '';
        if (deliveryAddress) {
            let pMethod = order.payment_method || (order.razorpay_payment_id ? 'Razorpay' : 'COD');
            addressHtml = `
            <div class="bg-white p-6 border border-outline-variant rounded-sm mb-4 shadow-sm">
                <h3 class="font-bold text-on-surface mb-2">Order Info</h3>
                <p class="text-sm text-on-surface-variant"><strong class="text-on-surface">Invoice Number:</strong> ${order.order_number || order.id.substring(0,8).toUpperCase()}</p>
                <p class="text-sm text-on-surface-variant mt-1"><strong class="text-on-surface">Payment Status:</strong> ${order.payment_status || 'Pending'} (${pMethod})</p>
                
                <h3 class="font-bold text-on-surface mt-4 mb-2">Delivery Address</h3>
                <p class="text-sm text-on-surface-variant mt-1">${deliveryAddress.full_address || ''}</p>
                <p class="text-sm text-on-surface-variant">${deliveryAddress.city || ''}, ${deliveryAddress.state || ''} - <span class="font-bold">${deliveryAddress.pincode || ''}</span></p>
            </div>
            `;
        }

        let itemSummaryHtml = '';
        if (order.order_items && order.order_items.length > 0) {
            itemSummaryHtml = order.order_items.map(item => {
                const product = Array.isArray(item.products) ? item.products[0] : item.products;
                if (!product) return '';
                const imageUrl = (product.images && product.images.length > 0) ? product.images[0] : (product.image_url || 'assets/images/placeholder.jpg');
                return `
                <div class="flex gap-4 p-6 bg-white border border-outline-variant rounded-sm mb-4 shadow-sm cursor-pointer hover:shadow-md transition-shadow" onclick="window.location.href='product.html?id=${product.id}'">
                    <div class="w-24 h-24 flex-shrink-0">
                        <img src="${imageUrl}" class="w-full h-full object-contain" alt="Product Image">
                    </div>
                    <div class="flex-1">
                        <h4 class="font-bold text-sm text-on-surface line-clamp-2">${product.name}</h4>
                        <p class="text-sm text-outline mt-1">Quantity: ${item.quantity}</p>
                        <p class="font-bold text-lg text-on-surface mt-2">${window.formatPrice(item.price)}</p>
                    </div>
                </div>`;
            }).join('');
        }

        let timelineHtml = `
        <div class="bg-white p-6 border border-outline-variant rounded-sm shadow-sm relative h-full">
            <h3 class="font-bold text-on-surface mb-6">Order Tracking</h3>
            <div class="relative pl-4 space-y-8">`;
            
        let timelineEvents = [];
        try {
            if(typeof order.timeline === 'string') timelineEvents = JSON.parse(order.timeline);
            else if (Array.isArray(order.timeline)) timelineEvents = order.timeline;
        } catch(e){}
        
            
        statuses.forEach((status, idx) => {
            const isCompleted = idx <= currentIndex;
            const isLast = idx === statuses.length - 1;
            const isCancelled = order.status === 'Cancelled' || order.cancellation_status === 'Approved';
            
            // If order is cancelled, we should show it differently
            if (isCancelled && idx > 0) return; // Only show Ordered if cancelled, then Cancelled node

            let colorClass = isCompleted ? 'bg-[#26a541]' : 'bg-outline-variant';
            let textColorClass = isCompleted ? 'text-on-surface font-bold' : 'text-outline font-medium';
            
            if (isCancelled) {
                colorClass = 'bg-[#ff6161]';
                textColorClass = 'text-[#ff6161] font-bold';
            }
            
            let statusDesc = '';
            let dateStr = isCompleted ? date : '';
            if (status === 'Pending') { statusDesc = 'Your order has been placed.'; dateStr = date; }
            if (status === 'Verification Pending') { statusDesc = 'Your payment is being verified by our team.'; }
            if (status === 'Confirmed') statusDesc = 'Seller has processed your order.';
            if (status === 'Processing') statusDesc = 'Your order is currently processing.';
            if (status === 'Packed') statusDesc = 'Your item is being packaged and prepared.';
            if (status === 'Shipped') statusDesc = 'Your item has been picked up by courier partner.';
            if (status === 'Out For Delivery') statusDesc = 'Your item is out for delivery today.';
            if (status === 'Delivered') {
                statusDesc = 'Your item has been delivered';
                dateStr = 'Expected by ' + expectedDateStr;
                if (isCompleted) dateStr = new Date(order.updated_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
            }

            // Override with actual timeline data if available
            const tEvent = timelineEvents.reverse().find(t => t.status === status);
            timelineEvents.reverse(); // restore order
            
            if (tEvent) {
                dateStr = new Date(tEvent.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric', hour: '2-digit', minute:'2-digit' });
                if (tEvent.note) {
                    statusDesc = tEvent.note;
                }
            }

            timelineHtml += `
                <div class="flex gap-6 relative">
                    ${!isLast && !isCancelled ? `<div class="absolute left-[7px] top-4 w-0.5 h-[calc(100%+16px)] ${idx < currentIndex ? 'bg-[#26a541]' : 'bg-outline-variant'}"></div>` : ''}
                    <div class="relative z-10 w-4 h-4 rounded-full border-2 border-white shadow-sm ${colorClass} mt-1"></div>
                    <div class="flex-1 -mt-1">
                        <p class="text-sm ${textColorClass}">${isCancelled ? 'Cancelled' : status}</p>
                        <p class="text-xs text-on-surface-variant mt-1">${statusDesc}</p>
                    </div>
                    <div class="text-xs text-on-surface-variant text-right w-24">
                        ${dateStr}
                    </div>
                </div>
            `;
            
            if (isCancelled && idx === 0) {
                const cancelEvent = timelineEvents.reverse().find(t => t.status === 'Cancelled');
                timelineEvents.reverse();
                
                let cancelDateStr = new Date(order.updated_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
                let cancelDesc = order.cancellation_reason ? 'Reason: ' + order.cancellation_reason : 'Order was cancelled.';
                
                if (cancelEvent) {
                    cancelDateStr = new Date(cancelEvent.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric', hour: '2-digit', minute:'2-digit' });
                    if (cancelEvent.note) cancelDesc = cancelEvent.note;
                }
                
                timelineHtml += `
                <div class="flex gap-6 relative mt-8">
                    <div class="relative z-10 w-4 h-4 rounded-full border-2 border-white shadow-sm bg-[#ff6161] mt-1"></div>
                    <div class="flex-1 -mt-1">
                        <p class="text-sm text-[#ff6161] font-bold">Cancelled</p>
                        <p class="text-xs text-on-surface-variant mt-1">${cancelDesc}</p>
                    </div>
                    <div class="text-xs text-on-surface-variant text-right w-24">
                        ${cancelDateStr}
                    </div>
                </div>
                `;
            }
        });
        
        let cancelBtnHtml = '';
        if (order.status === 'Pending' && !order.cancellation_status) {
            cancelBtnHtml = `
            <div class="mt-8 pt-4 border-t border-outline-variant">
                <button onclick="requestOrderCancellation('${order.id}')" class="text-sm font-bold text-[#2874f0] hover:underline flex items-center gap-1">
                    <span class="material-symbols-outlined text-[18px]">cancel</span>
                    Cancel Order
                </button>
            </div>
            `;
        } else if (order.cancellation_status === 'Pending') {
            cancelBtnHtml = `
            <div class="mt-8 pt-4 border-t border-outline-variant">
                <p class="text-sm font-bold text-[#ff6161]">Cancellation Requested. Awaiting approval.</p>
            </div>
            `;
        } else if (order.status === 'Cancelled' || order.cancellation_status === 'Approved') {
            cancelBtnHtml = `
            <div class="mt-8 pt-4 border-t border-outline-variant">
                <p class="text-sm font-bold text-error">This order has been cancelled.</p>
            </div>
            `;
        }

        timelineHtml += `${cancelBtnHtml}</div></div>`;

        container.innerHTML = `
        <div class="bg-surface-container-low min-h-screen p-4 md:p-8 -mx-4 md:mx-0">
            <div class="max-w-5xl mx-auto grid grid-cols-1 md:grid-cols-12 gap-4">
                <div class="md:col-span-8 flex flex-col gap-4">
                    ${addressHtml}
                    ${itemSummaryHtml}
                </div>
                <div class="md:col-span-4">
                    ${timelineHtml}
                </div>
            </div>
        </div>
        `;

    } catch (err) {
        console.error("Error loading tracking data:", err);
        document.getElementById('trackContainer').innerHTML = '<p style="color:red;">Error loading tracking data.</p>';
    }
}

window.requestOrderCancellation = async function(orderId) {
    const reason = prompt("Please provide a reason for cancellation:");
    if (reason === null) return; // User cancelled the prompt
    
    if (reason.trim() === '') {
        alert("A cancellation reason is required.");
        return;
    }

    try {
        const { error } = await window.supabase
            .from('orders')
            .update({ 
                cancellation_status: 'Pending',
                cancellation_reason: reason
            })
            .eq('id', orderId);

        if (error) throw error;
        
        alert("Cancellation request submitted successfully.");
        // Reload the page to show updated status
        window.location.reload();
    } catch (err) {
        console.error("Error submitting cancellation:", err);
        alert("Failed to submit cancellation. Please try again later.");
    }
}

window.togglePasswordForm = function() {
    const formContainer = document.getElementById('passwordFormContainer');
    const btn = document.getElementById('showPasswordBtn');
    if (formContainer.classList.contains('hidden')) {
        formContainer.classList.remove('hidden');
        btn.classList.add('hidden');
    } else {
        formContainer.classList.add('hidden');
        btn.classList.remove('hidden');
        document.getElementById('passwordForm').reset();
        document.getElementById('passwordError').classList.add('hidden');
        document.getElementById('passwordSuccess').classList.add('hidden');
        
        // Reset recovery state
        window.isPasswordRecovery = false;
        const currentPwdInput = document.getElementById('currentPassword');
        if (currentPwdInput) {
            currentPwdInput.parentElement.classList.remove('hidden');
            currentPwdInput.required = true;
        }
    }
}

window.changePassword = async function(e) {
    e.preventDefault();
    const currentPassword = document.getElementById('currentPassword').value;
    const newPassword = document.getElementById('newPassword').value;
    const confirmPassword = document.getElementById('confirmPassword').value;
    const errorDiv = document.getElementById('passwordError');
    const successDiv = document.getElementById('passwordSuccess');
    const btn = document.getElementById('savePasswordBtn');

    errorDiv.classList.add('hidden');
    successDiv.classList.add('hidden');

    if (newPassword !== confirmPassword) {
        errorDiv.textContent = 'New password and confirm password do not match.';
        errorDiv.classList.remove('hidden');
        return;
    }
    if (newPassword.length < 6) {
        errorDiv.textContent = 'New password must be at least 6 characters.';
        errorDiv.classList.remove('hidden');
        return;
    }

    btn.innerHTML = 'UPDATING...';
    btn.disabled = true;

    try {
        const { data: sessionData, error: sessionError } = await window.supabase.auth.getSession();
        if (sessionError || !sessionData.session) {
            throw new Error('Session expired. Please log in again.');
        }
        const userEmail = sessionData.session.user.email;

        // Verify current password by trying to re-authenticate (Skip if password recovery)
        if (!window.isPasswordRecovery) {
            const { error: signInError } = await window.supabase.auth.signInWithPassword({
                email: userEmail,
                password: currentPassword
            });

            if (signInError) {
                throw new Error('Incorrect current password.');
            }
        }

        // Update to new password
        const { error: updateError } = await window.supabase.auth.updateUser({
            password: newPassword
        });

        if (updateError) {
            throw updateError;
        }

        successDiv.textContent = 'Password updated successfully!';
        successDiv.classList.remove('hidden');
        document.getElementById('passwordForm').reset();
        window.isPasswordRecovery = false;

        // Re-authenticate with new password to keep session active seamlessly
        await window.supabase.auth.signInWithPassword({
            email: userEmail,
            password: newPassword
        });
        
        setTimeout(() => togglePasswordForm(), 2000);

    } catch (err) {
        console.error('Password change error:', err);
        errorDiv.textContent = err.message || 'An error occurred while updating the password.';
        errorDiv.classList.remove('hidden');
    } finally {
        btn.innerHTML = 'UPDATE PASSWORD';
        btn.disabled = false;
    }
}

