const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function check() {
  const { data, error } = await supabase.from('seats').select('*');
  if (error) {
    console.error("Error fetching seats:", error);
  } else {
    console.log("Total seats in database:", data.length);
    const rooms = {};
    data.forEach(s => {
      rooms[s.room_name] = (rooms[s.room_name] || 0) + 1;
    });
    console.log("Seats grouped by room_name:", rooms);
    if (data.length > 0) {
      console.log("Sample seat record:", data[0]);
    }
  }
}
check();
