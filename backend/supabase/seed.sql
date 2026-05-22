-- ==========================================
-- 🌱 Du-Reserve 테스트 데이터 시드 (seed.sql)
-- 작성일자: 2026년 5월 22일
-- 백엔드 담당: 팀원 B
-- ==========================================

-- 1. 테스트용 열람실 좌석 생성 (총 24석 배치)
-- 제1열람실에 1번부터 24번까지의 좌석을 AVAILABLE(빈자리) 상태로 생성합니다.
INSERT INTO public.seats (seat_number, room_name, status)
VALUES
  (1, '제1열람실', 'AVAILABLE'),
  (2, '제1열람실', 'AVAILABLE'),
  (3, '제1열람실', 'AVAILABLE'),
  (4, '제1열람실', 'AVAILABLE'),
  (5, '제1열람실', 'AVAILABLE'),
  (6, '제1열람실', 'AVAILABLE'),
  (7, '제1열람실', 'AVAILABLE'),
  (8, '제1열람실', 'AVAILABLE'),
  (9, '제1열람실', 'AVAILABLE'),
  (10, '제1열람실', 'AVAILABLE'),
  (11, '제1열람실', 'AVAILABLE'),
  (12, '제1열람실', 'AVAILABLE'),
  (13, '제1열람실', 'AVAILABLE'),
  (14, '제1열람실', 'AVAILABLE'),
  (15, '제1열람실', 'AVAILABLE'),
  (16, '제1열람실', 'AVAILABLE'),
  (17, '제1열람실', 'AVAILABLE'),
  (18, '제1열람실', 'AVAILABLE'),
  (19, '제1열람실', 'AVAILABLE'),
  (20, '제1열람실', 'AVAILABLE'),
  (21, '제1열람실', 'AVAILABLE'),
  (22, '제1열람실', 'AVAILABLE'),
  (23, '제1열람실', 'AVAILABLE'),
  (24, '제1열람실', 'AVAILABLE')
ON CONFLICT (seat_number) DO NOTHING;

-- 2. 테스트 관리자(ADMIN) 및 이용자(USER) 매핑 가이드 (주석 참고)
-- Supabase 대시보드 Auth에서 신규 회원 가입 후 해당 유저의 UID를 profiles 테이블에 입력해 아래 테스트 역할을 줄 수 있습니다.
-- 
-- [관리자(ADMIN) 강제 지정 SQL 예시]
-- UPDATE public.profiles SET role = 'ADMIN' WHERE university_id = '학번/교직원번호';
