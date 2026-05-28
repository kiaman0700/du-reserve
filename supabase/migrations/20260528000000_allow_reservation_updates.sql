-- Allow authenticated users to update their own active reservation (e.g. check in)
-- and allow admins to update any reservation.
DROP POLICY IF EXISTS "인증된 사용자는 본인의 예약 내역을 수정할 수 있습니다." ON public.reservations;

CREATE POLICY "인증된 사용자는 본인의 예약 내역을 수정할 수 있습니다."
ON public.reservations FOR UPDATE
USING (auth.uid() = user_id OR EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'ADMIN'))
WITH CHECK (auth.uid() = user_id OR EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'ADMIN'));
