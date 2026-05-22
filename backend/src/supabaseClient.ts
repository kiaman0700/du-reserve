import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

// .env 환경 변수 로드 (이미 index.ts에서 로드하지만 개별 모듈 테스트를 위해 한 번 더 검증)
dotenv.config();

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.warn(
    '⚠️ Warning: SUPABASE_URL 또는 SUPABASE_SERVICE_ROLE_KEY가 .env 파일에 정의되지 않았습니다.'
  );
}

// Service Role Key를 사용해 백엔드 관리자(Admin) 권한으로 Supabase에 접속합니다.
// 이를 통해 RLS(Row Level Security) 규칙에 구애받지 않고 모든 트랜잭션 및 저장 프로시저(RPC)를 안전하게 대리 처리할 수 있습니다.
export const supabase = createClient(supabaseUrl || '', supabaseServiceKey || '', {
  auth: {
    persistSession: false, // 백엔드 서버이므로 세션 로컬 스토리지 저장을 비활성화합니다.
    autoRefreshToken: false
  }
});

console.log('✅ Supabase Admin Client가 성공적으로 구성되었습니다.');
