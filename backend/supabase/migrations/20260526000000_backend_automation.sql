-- ==========================================
-- ⚙️ Du-Reserve 백엔드 자동화 및 보안 마이그레이션 DDL
-- 작성일자: 2026년 5월 26일
-- ==========================================

-- 0. 중복 오버로딩된 구형 함수 삭제 (p_user_id TEXT/UUID 타입 경합 해결)
DROP FUNCTION IF EXISTS public.reserve_seat(integer, text);
DROP FUNCTION IF EXISTS public.reserve_seat(integer, uuid);

-- 1. reserve_seat 저장 프로시저(RPC) 리라이트
-- 제재(블랙리스트) 기간이 유효한 학생은 예약 신청 시 데이터베이스 수준에서 원천 차단합니다.
CREATE OR REPLACE FUNCTION public.reserve_seat(p_seat_id INT, p_user_id UUID)
RETURNS INT AS $$
DECLARE
  v_reservation_id INT;
  v_seat_status TEXT;
  v_penalty_ends_at TIMESTAMP WITH TIME ZONE;
BEGIN
  -- 1.1) 제재(블랙리스트) 여부 검증
  SELECT penalty_ends_at INTO v_penalty_ends_at 
  FROM public.profiles 
  WHERE id = p_user_id;

  IF v_penalty_ends_at IS NOT NULL AND v_penalty_ends_at > NOW() THEN
    RAISE EXCEPTION '현재 제재(블랙리스트) 상태이므로 좌석 예약이 불가능합니다. (제재 만료일: %)', 
      to_char(v_penalty_ends_at AT TIME ZONE 'Asia/Seoul', 'YYYY-MM-DD HH24:MI:SS');
  END IF;

  -- 1.2) 다른 활성 예약이 있는지 체크
  IF EXISTS (SELECT 1 FROM public.reservations WHERE user_id = p_user_id AND status = 'ACTIVE') THEN
    RAISE EXCEPTION '이미 활성화된 예약이 존재합니다. 1인 1좌석만 예약 가능합니다.';
  END IF;

  -- 1.3) 좌석 상태 확인 및 동시성 제어를 위한 행 락(Row Lock) 설정
  SELECT status INTO v_seat_status FROM public.seats WHERE id = p_seat_id FOR UPDATE;
  
  IF v_seat_status != 'AVAILABLE' THEN
    RAISE EXCEPTION '해당 좌석은 현재 예약이 불가능한 상태입니다. (상태: %)', v_seat_status;
  END IF;

  -- 1.4) 예약 데이터 생성
  INSERT INTO public.reservations (user_id, seat_id, status)
  VALUES (p_user_id, p_seat_id, 'ACTIVE')
  RETURNING id INTO v_reservation_id;

  -- 1.5) 좌석 상태 변경
  UPDATE public.seats
  SET status = 'OCCUPIED',
      current_reservation_id = v_reservation_id,
      updated_at = NOW()
  WHERE id = p_seat_id;

  RETURN v_reservation_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;


-- 2. 백엔드 배치 자동화 엔진 (pg_cron 스케줄러 등록)
CREATE EXTENSION IF NOT EXISTS pg_cron;

-- 2.1) eod-force-checkout: 시설별 운영 마감 시간 일괄 퇴실 스케줄러 등록 해제 후 신규 등록
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM cron.job WHERE jobname = 'eod-force-checkout') THEN
    PERFORM cron.unschedule('eod-force-checkout');
  END IF;
END $$;

SELECT cron.schedule(
  'eod-force-checkout',
  '* * * * *', -- 매 분 작동하며 마감 시간이 지난 자리를 회수
  $$
  -- 1) 마감시간이 지난 시설의 모든 예약 상태 변경 (reservations -> COMPLETED)
  UPDATE public.reservations r
  SET status = 'COMPLETED',
      check_out_at = NOW()
  FROM public.seats s
  JOIN public.facility_configs fc ON s.room_name = fc.room_name
  WHERE r.id = s.current_reservation_id
    AND r.status = 'ACTIVE'
    AND to_char(NOW() AT TIME ZONE 'Asia/Seoul', 'HH24:MI:SS') >= to_char(fc.close_time, 'HH24:MI:SS');

  -- 2) 마감시간이 지난 시설의 모든 좌석 개방 (seats -> AVAILABLE)
  UPDATE public.seats s
  SET status = 'AVAILABLE',
      current_reservation_id = NULL,
      updated_at = NOW(),
      clearing_timer_seconds = NULL,
      use_timer_seconds = NULL,
      total_duration_minutes = NULL,
      reserved_at = NULL,
      ends_at = NULL
  FROM public.facility_configs fc
  WHERE s.room_name = fc.room_name
    AND s.status NOT IN ('AVAILABLE', 'MAINTENANCE')
    AND to_char(NOW() AT TIME ZONE 'Asia/Seoul', 'HH24:MI:SS') >= to_char(fc.close_time, 'HH24:MI:SS');
  $$
);


-- 2.2) individual-timer-checkout: 개인별 지정 이용 시간 및 조기 퇴실 예정 시간 만료 반납 스케줄러 등록 해제 후 신규 등록
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM cron.job WHERE jobname = 'individual-timer-checkout') THEN
    PERFORM cron.unschedule('individual-timer-checkout');
  END IF;
END $$;

SELECT cron.schedule(
  'individual-timer-checkout',
  '* * * * *', -- 매 분 작동하며 ends_at이 지난 예약을 회수
  $$
  -- 1) 이용만료 시간(ends_at)이 경과한 좌석의 예약 상태 변경 (reservations -> COMPLETED)
  UPDATE public.reservations r
  SET status = 'COMPLETED',
      check_out_at = NOW()
  FROM public.seats s
  WHERE r.id = s.current_reservation_id
    AND r.status = 'ACTIVE'
    AND s.ends_at IS NOT NULL
    AND s.ends_at != ''
    AND to_char(NOW() AT TIME ZONE 'Asia/Seoul', 'HH24:MI:SS') >= s.ends_at;

  -- 2) 이용만료 시간(ends_at)이 경과한 좌석 개방 (seats -> AVAILABLE)
  UPDATE public.seats s
  SET status = 'AVAILABLE',
      current_reservation_id = NULL,
      updated_at = NOW(),
      clearing_timer_seconds = NULL,
      use_timer_seconds = NULL,
      total_duration_minutes = NULL,
      reserved_at = NULL,
      ends_at = NULL
  WHERE s.status NOT IN ('AVAILABLE', 'MAINTENANCE', 'CLEARING')
    AND s.ends_at IS NOT NULL
    AND s.ends_at != ''
    AND to_char(NOW() AT TIME ZONE 'Asia/Seoul', 'HH24:MI:SS') >= s.ends_at;
  $$
);
