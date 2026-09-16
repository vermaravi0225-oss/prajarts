const { createClient } = require('@supabase/supabase-js');
const SUPABASE_URL = 'https://kvsmpslrzrghvzpcxxmj.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imt2c21wc2xyenJnaHZ6cGN4eG1qIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODU3MTY4NzUsImV4cCI6MjEwMTI5Mjg3NX0.VFDaph1LCceAWCwDnI2NMdbxF5REx5ufOXJiELMtBSM';

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

async function check() {
    const { data, error } = await supabase.from('products').select('*').limit(1);
    if (error) console.error(error);
    else if (data && data.length > 0) {
        console.log(Object.keys(data[0]));
    } else {
        console.log("No data found, can't infer schema.");
    }
}
check();
