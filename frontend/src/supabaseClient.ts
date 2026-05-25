import { createClient } from '@supabase/supabase-js';

// NEXT_PUBLIC_SUPABASE_URL 및 NEXT_PUBLIC_SUPABASE_ANON_KEY가 정의되지 않았을 때,
// 빌드 단계(next build)에서 static page generation 에러가 나는 것을 방지하기 위해 플레이스홀더를 기본값으로 지정합니다.
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://your-project.supabase.co';
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJvbGUiOiJhbm9uIn0.placeholder';

if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY) {
  console.warn(
    '⚠️ Warning: NEXT_PUBLIC_SUPABASE_URL 또는 NEXT_PUBLIC_SUPABASE_ANON_KEY가 .env.local 파일에 정의되지 않았습니다. 플레이스홀더 주소로 초기화합니다.'
  );
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey);
