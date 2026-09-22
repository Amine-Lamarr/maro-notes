import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config();

const supabase = createClient(process.env.VITE_SUPABASE_URL!, process.env.VITE_SUPABASE_ANON_KEY!);

async function run() {
  const years = await supabase.from('years').select('*');
  console.log("YEARS:", years.data);
  const modules = await supabase.from('modules').select('*');
  console.log("MODULES:", modules.data);
  const notes = await supabase.from('notes').select('*');
  console.log("NOTES:", notes.data);
}
run();
