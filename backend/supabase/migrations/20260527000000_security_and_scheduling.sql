-- ==========================================
-- 🛡️ Du-Reserve 백엔드 보안 강화 및 자동화 DDL (V2)
-- 작성일자: 2026년 5월 27일
-- 구현 목표: 미입실 예약 폭파, 10분 미소명 패널티 자동화, 민원 30분 쿨타임, 점검중 좌석 예약 방지, 실시간 민원 연동
-- ==========================================

-- 1. reservations 테이블 컬럼 및 기본값 설정
-- 1.1) 입실 여부 및 인증시간을 위한 컬럼 신규 추가
ALTER TABLE public.reservations ADD COLUMN IF NOT EXISTS is_checked_in BOOLEAN DEFAULT FALSE NOT NULL;

-- 1.2) check_in_at 컬럼의 제약 조건 조정 (예약과 동시에 check-in이 일어나지 않으므로 Nullable로 조정하고 기본값을 제거)
ALTER TABLE public.reservations ALTER COLUMN check_in_at DROP NOT NULL;
ALTER TABLE public.reservations ALTER COLUMN check_in_at DROP DEFAULT;
ALTER TABLE public.reservations ALTER COLUMN check_in_at SET DEFAULT NULL;


-- 2. pg_cron 스케줄러를 통한 백그라운드 태스크 자동화

-- 2.1) [TODO 1] 15분 미입실 예약 자동 폭파 및 개방
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM cron.job WHERE jobname = 'release-unconfirmed-reservations') THEN
    PERFORM cron.unschedule('release-unconfirmed-reservations');
  END IF;
END $$;

SELECT cron.schedule(
  'release-unconfirmed-reservations',
  '* * * * *', -- 매 분 작동하며 입실 확인(is_checked_in = FALSE)이 안 된 건을 정리
  $$
  WITH expired_reservations AS (
    UPDATE public.reservations
    SET status = 'FORCED_RELEASED',
        check_out_at = NOW()
    WHERE status = 'ACTIVE'
      AND is_checked_in = FALSE
      AND created_at <= NOW() - INTERVAL '15 minutes'
    RETURNING id, seat_id
  )
  UPDATE public.seats s
  SET status = 'AVAILABLE',
      current_reservation_id = NULL,
      updated_at = NOW(),
      use_timer_seconds = NULL,
      total_duration_minutes = NULL,
      reserved_at = NULL,
      ends_at = NULL
  FROM expired_reservations er
  WHERE s.id = er.seat_id
    AND s.current_reservation_id = er.id;
  $$
);


-- 2.2) [TODO 2] 10분 부재 신고 셀프 소명 만료 및 제재 자동화
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM cron.job WHERE jobname = 'absence-report-penalty-timeout') THEN
    PERFORM cron.unschedule('absence-report-penalty-timeout');
  END IF;
END $$;

SELECT cron.schedule(
  'absence-report-penalty-timeout',
  '* * * * *', -- 매 분 작동하며 10분 내 미소명 건에 대해 자동 취소 및 제재 수행
  $$
  WITH expired_reports AS (
    UPDATE public.absence_reports
    SET status = 'RESOLVED_RELEASED',
        resolved_at = NOW()
    WHERE status = 'PENDING'
      AND first_reported_at <= NOW() - INTERVAL '10 minutes'
    RETURNING id, reservation_id, seat_id
  ),
  released_reservations AS (
    UPDATE public.reservations r
    SET status = 'FORCED_RELEASED',
        check_out_at = NOW()
    FROM expired_reports er
    WHERE r.id = er.reservation_id
      AND r.status = 'ACTIVE'
    RETURNING r.id, r.user_id, r.seat_id
  ),
  penalized_users AS (
    UPDATE public.profiles p
    SET penalty_ends_at = NOW() + INTERVAL '3 days',
        penalty_reason = '부재 신고 후 10분 이내 미소명 (자동 제재)'
    FROM released_reservations rr
    WHERE p.id = rr.user_id
  )
  UPDATE public.seats s
  SET status = 'AVAILABLE',
      current_reservation_id = NULL,
      updated_at = NOW(),
      use_timer_seconds = NULL,
      total_duration_minutes = NULL,
      reserved_at = NULL,
      ends_at = NULL
  FROM released_reservations rr
  WHERE s.id = rr.seat_id
    AND s.current_reservation_id = rr.id;
  $$
);


-- 3. 데이터베이스 트리거 (보안 강화)

-- 3.1) [TODO 4] 악성/스팸 신고 방지 30분 쿨타임 트리거 설정
CREATE OR REPLACE FUNCTION public.check_complaint_cooldown()
RETURNS TRIGGER AS $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM public.complaints
    WHERE user_id = NEW.user_id
      AND created_at >= NOW() - INTERVAL '30 minutes'
  ) THEN
    RAISE EXCEPTION '최근 30분 이내에 이미 민원을 접수하셨습니다. 악성 스팸 방지를 위해 30분 쿨타임이 적용됩니다.';
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE TRIGGER trg_complaint_cooldown
  BEFORE INSERT ON public.complaints
  FOR EACH ROW EXECUTE FUNCTION public.check_complaint_cooldown();


-- 3.2) [TODO 5] 좌석 수동 점검 중('MAINTENANCE') 상태일 시 신규 예약 제한 트리거 설정
CREATE OR REPLACE FUNCTION public.check_seat_maintenance_on_reserve()
RETURNS TRIGGER AS $$
DECLARE
  v_seat_status TEXT;
BEGIN
  SELECT status INTO v_seat_status FROM public.seats WHERE id = NEW.seat_id;
  IF v_seat_status = 'MAINTENANCE' THEN
    RAISE EXCEPTION '해당 좌석은 현재 수동 점검 중이므로 예약할 수 없습니다.';
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE TRIGGER trg_check_seat_maintenance_on_reserve
  BEFORE INSERT ON public.reservations
  FOR EACH ROW EXECUTE FUNCTION public.check_seat_maintenance_on_reserve();


-- 4. [TODO 6] 미해결 긴급 민원 실시간 피드 발행 (Supabase Realtime Sync 활성화)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables 
    WHERE pubname = 'supabase_realtime' AND schemaname = 'public' AND tablename = 'complaints'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.complaints;
  END IF;
EXCEPTION
  WHEN OTHERS THEN
    NULL;
END $$;
