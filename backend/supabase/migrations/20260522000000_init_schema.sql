-- ==========================================
-- 🗓️ Du-Reserve (스마트 열람실) 초기 스키마 마이그레이션
-- 작성일자: 2026년 5월 22일
-- 백엔드 담당: 팀원 B (Supabase PostgreSQL 기반)
-- ==========================================

-- 0. 확장 프로그램 활성화
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 1. 테이블 생성

-- 1.1. 대구대 구성원 프로필 테이블
CREATE TABLE public.profiles (
    id UUID REFERENCES auth.users ON DELETE CASCADE PRIMARY KEY,
    university_id TEXT UNIQUE NOT NULL, -- 학번 또는 교직원번호
    name TEXT NOT NULL,
    role TEXT DEFAULT 'USER' CHECK (role IN ('USER', 'ADMIN')),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
);

-- 1.2. 예약 내역 테이블
CREATE TABLE public.reservations (
    id SERIAL PRIMARY KEY,
    user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
    seat_id INT NOT NULL, -- 순환 참조로 인해 외래키는 하단에 별도 지정
    check_in_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,
    check_out_at TIMESTAMP WITH TIME ZONE,
    status TEXT DEFAULT 'ACTIVE' CHECK (status IN ('ACTIVE', 'COMPLETED', 'FORCED_RELEASED')),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
);

-- 1.3. 열람실 좌석 테이블
CREATE TABLE public.seats (
    id SERIAL PRIMARY KEY,
    seat_number INT NOT NULL,
    room_name TEXT NOT NULL DEFAULT '제1열람실',
    status TEXT DEFAULT 'AVAILABLE' CHECK (status IN ('AVAILABLE', 'OCCUPIED', 'REPORTED_1ST', 'REPORTED_2ND', 'CLEARING', 'MAINTENANCE')),
    current_reservation_id INT REFERENCES public.reservations(id) ON DELETE SET NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,
    clearing_timer_seconds INT,
    use_timer_seconds INT,
    total_duration_minutes INT,
    reserved_at TEXT,
    ends_at TEXT,
    CONSTRAINT unique_seat_number_per_room UNIQUE (seat_number, room_name)
);

-- reservations 테이블의 seat_id 외래키 추가
ALTER TABLE public.reservations
ADD CONSTRAINT fk_reservations_seat_id
FOREIGN KEY (seat_id) REFERENCES public.seats(id) ON DELETE CASCADE;

-- 1.4. 부재 신고 및 타이머 추적 테이블
CREATE TABLE public.absence_reports (
    id SERIAL PRIMARY KEY,
    reservation_id INT REFERENCES public.reservations(id) ON DELETE CASCADE NOT NULL,
    seat_id INT REFERENCES public.seats(id) ON DELETE CASCADE NOT NULL,
    reporter_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
    first_photo_url TEXT NOT NULL,
    first_reported_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,
    second_photo_url TEXT,
    second_reported_at TIMESTAMP WITH TIME ZONE,
    release_type TEXT CHECK (release_type IN ('IMMEDIATE', 'DELAYED_10MIN')), -- 개방 방식 로그 기록
    status TEXT DEFAULT 'PENDING' CHECK (status IN ('PENDING', 'RESOLVED_RETURNED', 'RESOLVED_RELEASED')),
    resolved_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
);

-- ==========================================
-- 2. 인덱스 및 제약 조건 최적화

-- 2.1. 유저당 활성 상태의 예약(ACTIVE)은 최대 1개만 존재할 수 있도록 고유 인덱스 설정
CREATE UNIQUE INDEX unique_active_reservation_per_user 
ON public.reservations (user_id) 
WHERE (status = 'ACTIVE');

-- 2.2. 빠른 조회를 위한 검색 인덱스 추가
CREATE INDEX idx_seats_status ON public.seats(status);
CREATE INDEX idx_reservations_user_active ON public.reservations(user_id, status);
CREATE INDEX idx_absence_reports_pending ON public.absence_reports(status) WHERE (status = 'PENDING');

-- ==========================================
-- 3. 트리거 & 공통 함수 설정

-- 3.1. Supabase Auth 가입 시 profiles 테이블에 자동 데이터 삽입 트리거
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, university_id, name, role)
  VALUES (
    new.id,
    COALESCE(new.raw_user_meta_data->>'university_id', 'unknown_' || substr(new.id::text, 1, 8)),
    COALESCE(new.raw_user_meta_data->>'name', '사용자'),
    COALESCE(new.raw_user_meta_data->>'role', 'USER')
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- 3.2. 좌석 상태 변경에 따른 예약 데이터 자동 동기화 트리거
CREATE OR REPLACE FUNCTION public.handle_seat_status_change()
RETURNS TRIGGER AS $$
BEGIN
  -- 1) 좌석이 AVAILABLE(빈자리)로 변경될 때 기존 활성 예약이 있다면 완료 처리
  IF NEW.status = 'AVAILABLE' AND OLD.status != 'AVAILABLE' AND OLD.current_reservation_id IS NOT NULL THEN
    UPDATE public.reservations
    SET status = 'COMPLETED',
        check_out_at = NOW()
    WHERE id = OLD.current_reservation_id AND status = 'ACTIVE';
    
    NEW.current_reservation_id := NULL;
  END IF;

  -- 2) 좌석이 CLEARING(물품 정리 중)으로 변경될 때 활성 예약 상태를 강제 퇴실(FORCED_RELEASED)로 변경
  IF NEW.status = 'CLEARING' AND OLD.status != 'CLEARING' AND OLD.current_reservation_id IS NOT NULL THEN
    UPDATE public.reservations
    SET status = 'FORCED_RELEASED',
        check_out_at = NOW()
    WHERE id = OLD.current_reservation_id AND status = 'ACTIVE';
  END IF;

  NEW.updated_at := NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE TRIGGER trg_seat_status_change
  BEFORE UPDATE ON public.seats
  FOR EACH ROW EXECUTE FUNCTION public.handle_seat_status_change();

-- ==========================================
-- 4. 핵심 트랜잭션 함수 (Security Definer) - 경합 차단 및 무결성 확보

-- 4.1. 좌석 예약 함수
CREATE OR REPLACE FUNCTION public.reserve_seat(p_seat_id INT, p_user_id UUID)
RETURNS INT AS $$
DECLARE
  v_reservation_id INT;
  v_seat_status TEXT;
BEGIN
  -- 1) 다른 활성 예약이 있는지 체크
  IF EXISTS (SELECT 1 FROM public.reservations WHERE user_id = p_user_id AND status = 'ACTIVE') THEN
    RAISE EXCEPTION '이미 활성화된 예약이 존재합니다. 1인 1좌석만 예약 가능합니다.';
  END IF;

  -- 2) 좌석 상태 확인 및 동시성 제어를 위한 행 락(Row Lock) 설정
  SELECT status INTO v_seat_status FROM public.seats WHERE id = p_seat_id FOR UPDATE;
  
  IF v_seat_status != 'AVAILABLE' THEN
    RAISE EXCEPTION '해당 좌석은 현재 예약이 불가능한 상태입니다. (상태: %)', v_seat_status;
  END IF;

  -- 3) 예약 데이터 생성
  INSERT INTO public.reservations (user_id, seat_id, status)
  VALUES (p_user_id, p_seat_id, 'ACTIVE')
  RETURNING id INTO v_reservation_id;

  -- 4) 좌석 상태 변경
  UPDATE public.seats
  SET status = 'OCCUPIED',
      current_reservation_id = v_reservation_id,
      updated_at = NOW()
  WHERE id = p_seat_id;

  RETURN v_reservation_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 4.2. 반납 및 자진 퇴실 함수
CREATE OR REPLACE FUNCTION public.return_seat(p_seat_id INT, p_user_id UUID)
RETURNS VOID AS $$
DECLARE
  v_res_id INT;
BEGIN
  -- 1) 본인의 예약 건이 맞는지 확인
  SELECT current_reservation_id INTO v_res_id 
  FROM public.seats 
  WHERE id = p_seat_id AND current_reservation_id IS NOT NULL FOR UPDATE;

  IF v_res_id IS NULL THEN
    RAISE EXCEPTION '현재 이용 중인 예약 정보가 없습니다.';
  END IF;

  IF NOT EXISTS (SELECT 1 FROM public.reservations WHERE id = v_res_id AND user_id = p_user_id AND status = 'ACTIVE') THEN
    RAISE EXCEPTION '본인의 예약 좌석만 반납할 수 있습니다.';
  END IF;

  -- 2) 좌석을 빈자리로 변경 (트리거에 의해 예약 건도 자동 COMPLETED 종료 처리됨)
  UPDATE public.seats
  SET status = 'AVAILABLE',
      current_reservation_id = NULL,
      updated_at = NOW()
  WHERE id = p_seat_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 4.3. 1차 부재 신고 등록 함수
CREATE OR REPLACE FUNCTION public.submit_absence_report_1st(p_seat_id INT, p_reporter_id UUID, p_photo_url TEXT)
RETURNS INT AS $$
DECLARE
  v_res_id INT;
  v_seat_status TEXT;
  v_report_id INT;
BEGIN
  -- 1) 좌석 잠금 및 상태 확인
  SELECT status, current_reservation_id INTO v_seat_status, v_res_id 
  FROM public.seats WHERE id = p_seat_id FOR UPDATE;

  IF v_seat_status != 'OCCUPIED' THEN
    RAISE EXCEPTION '이용 중인 좌석만 부재 신고가 가능합니다.';
  END If;

  IF v_res_id IS NULL THEN
    RAISE EXCEPTION '예약 정보가 유효하지 않은 좌석입니다.';
  END IF;

  -- 2) 본인 자리 신고 방지
  IF EXISTS (SELECT 1 FROM public.reservations WHERE id = v_res_id AND user_id = p_reporter_id) THEN
    RAISE EXCEPTION '본인의 예약 좌석은 부재 신고할 수 없습니다.';
  END IF;

  -- 3) 1차 신고 데이터 생성
  INSERT INTO public.absence_reports (reservation_id, seat_id, reporter_id, first_photo_url, status)
  VALUES (v_res_id, p_seat_id, p_reporter_id, p_photo_url, 'PENDING')
  RETURNING id INTO v_report_id;

  -- 4) 좌석 상태 변경 (1차 신고 접수됨)
  UPDATE public.seats
  SET status = 'REPORTED_1ST',
      updated_at = NOW()
  WHERE id = p_seat_id;

  RETURN v_report_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 4.4. 1차 경고 후 원예약자 복귀 확인 함수
CREATE OR REPLACE FUNCTION public.confirm_user_returned(p_seat_id INT, p_user_id UUID)
RETURNS VOID AS $$
DECLARE
  v_res_id INT;
  v_seat_status TEXT;
BEGIN
  -- 1) 좌석 잠금 및 정보 획득
  SELECT status, current_reservation_id INTO v_seat_status, v_res_id 
  FROM public.seats WHERE id = p_seat_id FOR UPDATE;

  IF v_seat_status != 'REPORTED_1ST' THEN
    RAISE EXCEPTION '부재 신고(1차) 상태인 좌석만 복귀 확인이 가능합니다.';
  END IF;

  IF NOT EXISTS (SELECT 1 FROM public.reservations WHERE id = v_res_id AND user_id = p_user_id AND status = 'ACTIVE') THEN
    RAISE EXCEPTION '본인의 예약 좌석만 복귀 확인할 수 있습니다.';
  END IF;

  -- 2) 신고 내역 무효 처리 (RESOLVED_RETURNED)
  UPDATE public.absence_reports
  SET status = 'RESOLVED_RETURNED',
      resolved_at = NOW()
  WHERE reservation_id = v_res_id AND status = 'PENDING';

  -- 3) 좌석 상태 복구 (OCCUPIED)
  UPDATE public.seats
  SET status = 'OCCUPIED',
      updated_at = NOW()
  -- 트리거 방지를 위해 수동 업데이트
  WHERE id = p_seat_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 4.5. 2차 최종 부재 신고 등록 함수 (30분 경과 후)
CREATE OR REPLACE FUNCTION public.submit_absence_report_2nd(p_seat_id INT, p_photo_url TEXT)
RETURNS VOID AS $$
DECLARE
  v_res_id INT;
  v_seat_status TEXT;
  v_report_id INT;
  v_first_reported TIMESTAMP WITH TIME ZONE;
BEGIN
  -- 1) 좌석 상태 및 1차 신고 시간 대조
  SELECT status, current_reservation_id INTO v_seat_status, v_res_id 
  FROM public.seats WHERE id = p_seat_id FOR UPDATE;

  IF v_seat_status != 'REPORTED_1ST' THEN
    RAISE EXCEPTION '1차 신고가 접수된 좌석만 2차 최종 신고가 가능합니다.';
  END IF;

  -- 2) 활성 신고 건 조회 및 30분 타이머 검증
  SELECT id, first_reported_at INTO v_report_id, v_first_reported 
  FROM public.absence_reports 
  WHERE reservation_id = v_res_id AND status = 'PENDING' 
  ORDER BY first_reported_at DESC LIMIT 1 FOR UPDATE;

  IF v_report_id IS NULL THEN
    RAISE EXCEPTION '유효한 1차 신고 내역을 찾을 수 없습니다.';
  END IF;

  IF NOW() < v_first_reported + INTERVAL '30 minutes' THEN
    RAISE EXCEPTION '1차 신고 시점으로부터 30분이 경과해야 2차 최종 신고가 가능합니다. (남은 시간: %)', 
      (v_first_reported + INTERVAL '30 minutes') - NOW();
  END IF;

  -- 3) 2차 신고 업데이트
  UPDATE public.absence_reports
  SET second_photo_url = p_photo_url,
      second_reported_at = NOW()
  WHERE id = v_report_id;

  -- 4) 좌석 상태 변경 (2차 최종 신고 - 관리자 대시보드 검증 대기)
  UPDATE public.seats
  SET status = 'REPORTED_2ND',
      updated_at = NOW()
  WHERE id = p_seat_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ==========================================
-- 5. Row Level Security (RLS) 정책 보안 설정

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.seats ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.reservations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.absence_reports ENABLE ROW LEVEL SECURITY;

-- 5.1. profiles RLS
CREATE POLICY "누구나 프로필을 조회할 수 있습니다." 
ON public.profiles FOR SELECT USING (true);

CREATE POLICY "본인 프로필만 수정할 수 있습니다." 
ON public.profiles FOR UPDATE USING (auth.uid() = id);

-- 5.2. seats RLS
CREATE POLICY "누구나 좌석 현황을 실시간 조회할 수 있습니다." 
ON public.seats FOR SELECT USING (true);

CREATE POLICY "관리자만 좌석 설정을 추가/수정/삭제할 수 있습니다." 
ON public.seats FOR ALL 
USING (EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'ADMIN'))
WITH CHECK (EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'ADMIN'));

-- 5.3. reservations RLS
CREATE POLICY "인증된 사용자는 본인의 예약 내역을 조회할 수 있습니다." 
ON public.reservations FOR SELECT 
USING (auth.uid() = user_id OR EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'ADMIN'));

CREATE POLICY "인증된 사용자는 예약을 등록할 수 있습니다." 
ON public.reservations FOR INSERT 
WITH CHECK (auth.uid() = user_id);

-- 5.4. absence_reports RLS
CREATE POLICY "신고자 본인 및 관리자만 신고 내역을 볼 수 있습니다." 
ON public.absence_reports FOR SELECT 
USING (auth.uid() = reporter_id OR EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'ADMIN'));

CREATE POLICY "인증된 유저는 신고를 작성할 수 있습니다." 
ON public.absence_reports FOR INSERT 
WITH CHECK (auth.uid() = reporter_id);

-- ==========================================
-- 6. 백엔드 자동화 엔진 (10분 지연 자동 개방 pg_cron 설정)

-- pg_cron이 지원되는 Supabase 환경에서 작동할 백그라운드 태스크 예약
-- 매 1분마다 CLEARING 상태로 들어간 지 10분이 지난 좌석을 자동으로 AVAILABLE(빈자리)로 변경합니다.
CREATE EXTENSION IF NOT EXISTS pg_cron;

-- 기존에 동일한 크론이 등록되어 있다면 등록 해제
SELECT cron.unschedule('clear-expired-seats');

-- 크론 스케줄 등록
SELECT cron.schedule(
  'clear-expired-seats',
  '* * * * *', -- 매 분 작동
  $$
  -- 1) 10분이 경과한 CLEARING 좌석의 예약 상태 변경 (만약 트리거가 누락되었을 시 보완용)
  UPDATE public.reservations
  SET status = 'FORCED_RELEASED',
      check_out_at = NOW()
  FROM public.seats
  WHERE public.reservations.id = public.seats.current_reservation_id
    AND public.seats.status = 'CLEARING'
    AND public.seats.updated_at <= NOW() - INTERVAL '10 minutes';
      
  -- 2) 10분이 경과한 CLEARING 좌석을 빈자리로 자동 개방
  UPDATE public.seats
  SET status = 'AVAILABLE',
      current_reservation_id = NULL,
      updated_at = NOW()
  WHERE status = 'CLEARING'
    AND updated_at <= NOW() - INTERVAL '10 minutes';
  $$
);
