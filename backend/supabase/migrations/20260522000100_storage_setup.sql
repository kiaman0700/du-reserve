-- ==========================================
-- 📸 Supabase Storage 버킷 및 권한(RLS) 설정
-- 작성일자: 2026년 5월 22일
-- 백엔드 담당: 팀원 B (Supabase Storage 기반)
-- ==========================================

-- 1. 'evidence-photos' 스토리지 버킷 생성
-- 현장 증거용 1차/2차 사진을 저장할 public 버킷을 생성합니다.
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'evidence-photos', 
  'evidence-photos', 
  true, -- 프론트엔드에서 간편하게 읽을 수 있도록 공개(public) 설정
  5242880, -- 파일 크기 제한: 5MB (5 * 1024 * 1024)
  ARRAY['image/jpeg', 'image/png', 'image/webp'] -- 이미지 포맷 제한 (실시간 촬영 파일 전용)
)
ON CONFLICT (id) DO NOTHING;

-- 2. 스토리지 객체에 대한 RLS 보안 설정 활성화 (Supabase 콘솔에선 기본 활성화되어 있어 에러 방지를 위해 주석 처리)
-- ALTER TABLE storage.objects ENABLE ROW LEVEL SECURITY;

-- 기존에 동일한 정책이 존재할 경우 삭제하여 충돌 방지
DROP POLICY IF EXISTS "누구나 증거 사진을 조회할 수 있습니다." ON storage.objects;
DROP POLICY IF EXISTS "인증된 사용자는 증거 사진을 업로드할 수 있습니다." ON storage.objects;
DROP POLICY IF EXISTS "관리자만 증거 사진을 삭제할 수 있습니다." ON storage.objects;

-- 2.1. 조회 권한 정책
CREATE POLICY "누구나 증거 사진을 조회할 수 있습니다."
ON storage.objects FOR SELECT
USING (bucket_id = 'evidence-photos');

-- 2.2. 업로드 권한 정책 (로그인된 유저만 업로드 가능)
CREATE POLICY "인증된 사용자는 증거 사진을 업로드할 수 있습니다."
ON storage.objects FOR INSERT
WITH CHECK (
  bucket_id = 'evidence-photos' 
  AND auth.role() = 'authenticated'
);

-- 2.3. 삭제 권한 정책 (오직 관리자만 수동 정리 및 보관 후 삭제 가능)
CREATE POLICY "관리자만 증거 사진을 삭제할 수 있습니다."
ON storage.objects FOR DELETE
USING (
  bucket_id = 'evidence-photos'
  AND EXISTS (
    SELECT 1 FROM public.profiles 
    WHERE id = auth.uid() AND role = 'ADMIN'
  )
);
