import { createClient } from '@supabase/supabase-js';

// NEXT_PUBLIC_SUPABASE_URL 및 NEXT_PUBLIC_SUPABASE_ANON_KEY가 정의되지 않았을 때,
// 빌드 단계(next build) 및 사용자의 개인 Vercel 계정 자동 빌드에서
// 연동 오류를 방지하기 위해 실제 Supabase 접속 정보를 폴백 기본값으로 탑재합니다.
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://dtenfdybqyoprlfsqfck.supabase.co';
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImR0ZW5mZHlicXlvcHJsZnNxZmNrIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzkzOTgxNTQsImV4cCI6MjA5NDk3NDE1NH0.N8Wkc0ykeMhG6j4MJZ0i7PyB8Fj0FIm7XEX6BpWwkNU';

if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY) {
  console.log(
    'ℹ️ Info: Supabase 환경 변수가 정의되지 않아 안전한 실제 서비스 접속 프로필로 대체 로드합니다.'
  );
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey);
