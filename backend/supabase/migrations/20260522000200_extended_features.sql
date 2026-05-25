-- ==========================================
-- 🗓️ Du-Reserve 스마트 기능 확장 스키마 마이그레이션
-- 작성일자: 2026년 5월 22일 (스마트 기능 확장)
-- ==========================================

-- 1. 프로필 테이블에 제재 관련 컬럼 및 관리 구역 컬럼 추가
ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS penalty_ends_at TIMESTAMP WITH TIME ZONE,
ADD COLUMN IF NOT EXISTS penalty_reason TEXT,
ADD COLUMN IF NOT EXISTS managed_college_id TEXT;

-- 1.1. 가입 트리거 함수 업데이트 (managed_college_id 컬럼 지원)
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, university_id, name, role, managed_college_id)
  VALUES (
    new.id,
    COALESCE(new.raw_user_meta_data->>'university_id', 'unknown_' || substr(new.id::text, 1, 8)),
    COALESCE(new.raw_user_meta_data->>'name', '사용자'),
    COALESCE(new.raw_user_meta_data->>'role', 'USER'),
    COALESCE(new.raw_user_meta_data->>'managed_college_id', CASE WHEN (new.raw_user_meta_data->>'role') = 'ADMIN' THEN 'library' ELSE NULL END)
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 2. 시설 설정 테이블 생성
CREATE TABLE IF NOT EXISTS public.facility_configs (
    room_name TEXT PRIMARY KEY,
    open_time TIME DEFAULT '09:00:00'::TIME NOT NULL,
    close_time TIME DEFAULT '22:00:00'::TIME NOT NULL,
    max_use_hours INT, -- NULL 일 경우 제한 없음(무제한)
    created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
);

-- 3. 통합 민원 신고 테이블 생성
CREATE TABLE IF NOT EXISTS public.complaints (
    id SERIAL PRIMARY KEY,
    user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL, -- 신고자
    seat_id INT REFERENCES public.seats(id) ON DELETE CASCADE,
    room_name TEXT NOT NULL,
    category TEXT NOT NULL CHECK (category IN ('NOISE', 'DAMAGE', 'CLEANLINESS', 'ABSENCE', 'OTHER')),
    description TEXT,
    photo_url TEXT,
    status TEXT DEFAULT 'PENDING' CHECK (status IN ('PENDING', 'PROCESSING', 'RESOLVED')),
    resolution_comment TEXT,
    resolved_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
);

-- 4. 빈자리 알림 신청 테이블 생성
CREATE TABLE IF NOT EXISTS public.notifications (
    id SERIAL PRIMARY KEY,
    user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
    room_name TEXT NOT NULL,
    status TEXT DEFAULT 'PENDING' CHECK (status IN ('PENDING', 'SENT')),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
);

-- 5. RLS(Row Level Security) 설정
ALTER TABLE public.facility_configs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.complaints ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;

-- 5.1. facility_configs RLS
CREATE POLICY "누구나 시설 설정을 볼 수 있습니다." 
ON public.facility_configs FOR SELECT USING (true);

CREATE POLICY "관리자만 시설 설정을 관리할 수 있습니다." 
ON public.facility_configs FOR ALL 
USING (EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'ADMIN'));

-- 5.2. complaints RLS
CREATE POLICY "본인 민원 또는 관리자만 민원을 조회할 수 있습니다." 
ON public.complaints FOR SELECT 
USING (auth.uid() = user_id OR EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'ADMIN'));

CREATE POLICY "인증된 사용자는 민원을 등록할 수 있습니다." 
ON public.complaints FOR INSERT 
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "관리자만 민원을 수정할 수 있습니다." 
ON public.complaints FOR UPDATE 
USING (EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'ADMIN'));

-- 5.3. notifications RLS
CREATE POLICY "본인 알림 신청 내역만 볼 수 있습니다." 
ON public.notifications FOR SELECT 
USING (auth.uid() = user_id);

CREATE POLICY "인증된 사용자는 알림 신청을 등록할 수 있습니다." 
ON public.notifications FOR INSERT 
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "관리자 또는 시스템만 알림 신청을 수정/삭제할 수 있습니다." 
ON public.notifications FOR ALL 
USING (EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'ADMIN'));

-- 6. 초기 시설 설정 정보 삽입
INSERT INTO public.facility_configs (room_name, open_time, close_time, max_use_hours)
VALUES 
    ('제1열람실', '09:00:00'::TIME, '22:00:00'::TIME, 3),
    ('2층 열람실', '09:00:00'::TIME, '22:00:00'::TIME, 4),
    ('5층 열람실', '09:00:00'::TIME, '23:00:00'::TIME, NULL)
ON CONFLICT (room_name) DO UPDATE 
SET open_time = EXCLUDED.open_time,
    close_time = EXCLUDED.close_time,
    max_use_hours = EXCLUDED.max_use_hours;
