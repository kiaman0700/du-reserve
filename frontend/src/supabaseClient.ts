import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';

if (!supabaseUrl || !supabaseAnonKey) {
  console.warn(
    '⚠️ Warning: NEXT_PUBLIC_SUPABASE_URL 또는 NEXT_PUBLIC_SUPABASE_ANON_KEY가 .env.local 파일에 정의되지 않았습니다.'
  );
}

// 브라우저 환경에서 동작하는 Supabase 클라이언트를 초기화합니다.
// 이 클라이언트는 RLS(Row Level Security) 규칙에 따라 안전하게 인가된 범위 내에서 조회/삽입/구독 등을 수행합니다.
export const supabase = createClient(supabaseUrl, supabaseAnonKey);
