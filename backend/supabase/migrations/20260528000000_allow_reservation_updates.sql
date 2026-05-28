-- Allow authenticated users to update their own active reservation (e.g. check in)
-- and allow admins to update any reservation.
DROP POLICY IF EXISTS "인증된 사용자는 본인의 예약 내역을 수정할 수 있습니다." ON public.reservations;

CREATE POLICY "인증된 사용자는 본인의 예약 내역을 수정할 수 있습니다."
ON public.reservations FOR UPDATE
USING (auth.uid() = user_id OR EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'ADMIN'))
WITH CHECK (auth.uid() = user_id OR EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'ADMIN'));

-- 2. Modify reserve_seat RPC function to immediately check in reservations
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

  -- 3) 예약 데이터 생성 (즉시 입실 완료 상태로 생성: check_in_at = NOW(), is_checked_in = TRUE)
  INSERT INTO public.reservations (user_id, seat_id, status, check_in_at, is_checked_in)
  VALUES (p_user_id, p_seat_id, 'ACTIVE', NOW(), TRUE)
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
