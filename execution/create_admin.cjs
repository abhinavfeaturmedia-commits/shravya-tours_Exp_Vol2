
const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = 'https://icvzquomzersxefcswyf.supabase.co';
const supabaseKey = 'sb_publishable_m8AYMLfCND0ZCfHuNCDsBA_Uoky9b7D'; // Using the key from your env

const supabase = createClient(supabaseUrl, supabaseKey);

async function createAdmin() {
    console.log("Creating Super Admin user...");

    const email = 'toursshravya@gmail.com';
    const password = 'Shravya@2026';

    const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: {
            data: {
                name: 'Super Admin',
                role: 'Admin'
            }
        }
    });

    if (error) {
        console.error("Error creating user:", error.message);
    } else {
        console.log("User created successfully!");
        console.log("Email:", email);
        console.log("Password:", password);
        if (data.user && data.user.identities && data.user.identities.length === 0) {
            console.log("⚠️ User already exists. You can log in with the existing password.");
        } else if (data.session === null) {
            console.log("⚠️ Confirmation email sent. Please check the inbox (or disable email confirmation in Supabase dashboard) to log in.");
        } else {
            console.log("✅ User confirmed and logged in.");
        }
    }
}

createAdmin();
