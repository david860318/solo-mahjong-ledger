import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || '';
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || '';

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    flowType: 'pkce',           // 使用 PKCE 驗證流程
    detectSessionInUrl: true,   // 自動處理回傳的授權碼
    persistSession: true,
    autoRefreshToken: true
  }
});