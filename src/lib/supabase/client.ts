import { createClient, type SupabaseClient } from "@supabase/supabase-js";

const supabaseUrl = 'https://bejiwrlcolypgtmxqxva.supabase.co';
const supabaseKey = 'sb_publishable_s9TMJImQarhOUTic0CxBzw_gXoarYtl';

let client: SupabaseClient | undefined;

export function getSupabase(): SupabaseClient {
  if (!client) {
    client = createClient(
      supabaseUrl,
      supabaseKey,
      {
        auth: {
          persistSession: true,
          autoRefreshToken: true,
          detectSessionInUrl: false,
        },
      },
    );
  }
  return client;
}
