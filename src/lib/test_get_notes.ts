import { supabase } from './supabase';

async function test() {
  const { data, error } = await supabase.from('notes').select('*').limit(5);
  console.log(data, error);
}

test();
