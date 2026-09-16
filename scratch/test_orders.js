const { createClient } = require('@supabase/supabase-js');
const supabase = createClient(
  'https://hmcmhjbsdctewltwzizw.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImhtY21oamJzZGN0ZXdsdHd6aXp3Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODIxMDI4MDYsImV4cCI6MjA5NzY3ODgwNn0.Bnphby9HfiZjqxpH5FH_LBq2MQZKqgBOMn4qIGny_Jc'
);

async function test() {
    const { data, error } = await supabase
        .from('orders')
        .select('*, order_items(*, products(*))')
        .eq('id', 'a80d94ec-77ea-4a69-84b0-fb2180b12bf5');
    console.log(JSON.stringify(data, null, 2));
    if (error) console.error(error);
}
test();
