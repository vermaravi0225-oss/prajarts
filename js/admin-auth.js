// Admin Authentication Logic

// Check if admin is logged in (for protected pages)
async function requireAdminAuth() {
    const { data: { session }, error } = await window.supabase.auth.getSession();
    if (!session) {
        window.location.href = 'admin-login.html';
        return null;
    }

    // Verify role is admin
    const { data: userRecord, error: userError } = await supabase
        .from('users')
        .select('role')
        .eq('id', session.user.id)
        .single();

    if (userError || !userRecord || userRecord.role !== 'admin') {
        alert("Unauthorized. Admin access required.");
        await window.supabase.auth.signOut();
        window.location.href = 'admin-login.html';
        return null;
    }

    // Secure UI Rendering: Unhide the body now that auth is verified
    document.body.style.display = '';

    return session.user;
}

// Login functionality for admin-login.html
async function adminLogin(email, password) {
    const { data, error } = await window.supabase.auth.signInWithPassword({
        email: email,
        password: password
    });

    if (error) {
        throw error;
    }

    // Check if the user is an admin
    const { data: userRecord, error: userError } = await supabase
        .from('users')
        .select('role')
        .eq('id', data.user.id)
        .maybeSingle();

    if (userError) {
        await window.supabase.auth.signOut();
        throw new Error("Database error: " + userError.message + ". Did you run schema.sql in this NEW project?");
    }

    if (!userRecord) {
        await window.supabase.auth.signOut();
        throw new Error("Missing from public.users table. Your exact Login UID is:\n" + data.user.id + "\n\nPlease copy this ID and put it into the users table.");
    }

    if (userRecord.role !== 'admin') {
        await window.supabase.auth.signOut();
        throw new Error("Unauthorized. Your role is '" + userRecord.role + "', but 'admin' is required.");
    }

    return data;
}

// Logout functionality
async function adminLogout() {
    const { error } = await window.supabase.auth.signOut();
    if (error) console.error("Error logging out:", error);
    window.location.href = 'admin-login.html';
}
