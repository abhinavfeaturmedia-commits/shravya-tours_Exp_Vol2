import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
    process.env.VITE_SUPABASE_URL,
    process.env.VITE_SUPABASE_ANON_KEY
);

async function testFetchWithAuth() {
    console.log('Signing in...');
    // using the admin email we configured in create-user earlier
    const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
        email: 'shrawello@gmail.com',
        password: 'password' // or whatever password it is, let me try if I can just use a dummy or if I need the service role key to bypass and check policies
    });

    // Actually, I can just use the service role key to check if data is there
    const adminSupabase = createClient(
        process.env.VITE_SUPABASE_URL,
        process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_ANON_KEY // fallback
    );

    console.log('\n--- Fetching with Admin Client (Bypasses RLS) ---');
    const { data: adminData } = await adminSupabase.from('audit_logs').select('*').limit(5);
    console.log('Admin Data Count:', adminData?.length);
    console.log('Admin Data:', adminData);

}

testFetchWithAuth();
