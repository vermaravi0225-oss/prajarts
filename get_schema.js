const { createClient } = require('@supabase/supabase-js');
const supabase = createClient('https://hmcmhjbsdctewltwzizw.supabase.co', process.env.SUPABASE_SERVICE_ROLE_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImhtY21oamJzZGN0ZXdsdHd6aXp3Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODIxMDI4MDYsImV4cCI6MjA5NzY3ODgwNn0.Bnphby9HfiZjqxpH5FH_LBq2MQZKqgBOMn4qIGny_Jc');

async function run() {
    // just fetch one order_item to see its keys
    const { data } = await supabase.from('order_items').select('*').limit(1);
    console.log(data);
}
run();
