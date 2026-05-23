-- ==========================================
-- 🌱 Du-Reserve 테스트 데이터 시드 (seed.sql)
-- 작성일자: 2026년 5월 22일 (23일 확장 갱신)
-- 백엔드 담당: 팀원 B
-- ==========================================

-- 1. 테스트용 열람실 좌석 생성 (다중 구역 확장 - 총 84석 배치)

-- 1.1. 제1열람실 좌석 생성 (총 24석)
INSERT INTO public.seats (seat_number, room_name, status)
SELECT g, '제1열람실', 'AVAILABLE'
FROM generate_series(1, 24) g
ON CONFLICT (seat_number, room_name) DO NOTHING;

-- 1.2. 창파도서관 2층 열람실 좌석 생성 (총 28석)
INSERT INTO public.seats (seat_number, room_name, status)
SELECT g, '2층 열람실', 'AVAILABLE'
FROM generate_series(1, 28) g
ON CONFLICT (seat_number, room_name) DO NOTHING;

-- 1.3. 창파도서관 5층 열람실 좌석 생성 (총 32석)
INSERT INTO public.seats (seat_number, room_name, status)
SELECT g, '5층 열람실', 'AVAILABLE'
FROM generate_series(1, 32) g
ON CONFLICT (seat_number, room_name) DO NOTHING;

-- 2. 테스트 관리자(ADMIN) 및 이용자(USER) 매핑 가이드 (주석 참고)
-- Supabase 대시보드 Auth에서 신규 회원 가입 후 해당 유저의 UID를 profiles 테이블에 입력해 아래 테스트 역할을 줄 수 있습니다.
-- 
-- [관리자(ADMIN) 강제 지정 SQL 예시]
-- UPDATE public.profiles SET role = 'ADMIN' WHERE university_id = '학번/교직원번호';

