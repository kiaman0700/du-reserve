# ⚙️ Du-Reserve Backend (Supabase) Developer Guide

이 문서는 **du-reserve** 백엔드 개발 및 데이터베이스 설계를 담당한 백엔드 개발자(팀원 B)의 작업 명세서이자, 프론트엔드 개발자(팀원 A)와의 원활한 API 연동을 위한 연동 가이드입니다.

---

## 🛠️ 백엔드 아키텍처

본 프로젝트는 빠르고 비용 효율적인 개발을 위해 **Supabase (PostgreSQL)**를 서버리스 백엔드로 사용합니다.
모든 데이터 비즈니스 로직은 **트랜잭션 세이프(Transaction-safe)한 PostgreSQL RPC (Stored Procedure)** 형태로 DB 내부에 캡슐화되어 있어, 동시성 오류 및 사재기 선점 경합 문제를 완전히 예방합니다.

### 폴더 구조
```text
backend/
├── README.md               # [본 문서] 백엔드 가이드 및 API 명세
└── supabase/
    ├── seed.sql            # 초기 열람실 좌석 (24석) 테스트 시드 데이터
    └── migrations/
        ├── 20260522000000_init_schema.sql  # DDL, 트리거, DB 함수 및 RLS 정책
        └── 20260522000100_storage_setup.sql # 증거 사진 Storage 및 권한 설정
```

---

## 💾 데이터베이스 스키마 및 주요 제약 사항

1. **`profiles`**: Supabase Auth와 연동되어 가입 시 자동으로 프로필이 생성됩니다. `university_id`(학번/교직원번호)로 대구대 포털 로그인을 대체 식별합니다.
2. **`seats`**: 총 24석의 좌석 정보를 갖고 있으며, `status` 컬럼에 따라 실시간 갱신됩니다.
3. **`reservations`**: 예약 건을 관리하며, 유저당 활성 상태의 예약(`ACTIVE`)은 **오직 1개**만 존재할 수 있도록 고유 인덱스가 걸려있습니다.
4. **`absence_reports`**: 1차/2차 사진 증거 및 타이머 기준 신고 데이터를 보관합니다.

---

## 🔌 프론트엔드 연동용 RPC API 명세

프론트엔드(Next.js)에서 Supabase JS Client를 사용해 백엔드 비즈니스 로직을 호출하는 방법입니다. **일반적인 `insert/update` 대신 안전한 `rpc` 함수를 사용해 호출해 주세요.**

### 1. 좌석 예약하기 (`reserve_seat`)
사용자가 좌석을 터치하여 예약할 때 호출합니다. 1인 1개 활성 예약 제약과 이미 예약된 자리에 대한 경합을 안전하게 처리합니다.
```typescript
const { data: reservationId, error } = await supabase.rpc('reserve_seat', {
  p_seat_id: 5,               // 예약할 좌석의 ID (number)
  p_user_id: '유저UUID'        // 로그인한 유저의 UUID (string)
});
```

### 2. 자진 퇴실 및 반납 (`return_seat`)
본인이 예약한 자리를 자진해서 반납할 때 호출합니다. (반납 시 해당 예약은 `COMPLETED`로 종료되며 좌석은 즉시 `AVAILABLE`이 됩니다.)
```typescript
const { error } = await supabase.rpc('return_seat', {
  p_seat_id: 5,               // 반납할 좌석의 ID (number)
  p_user_id: '유저UUID'        // 로그인한 유저의 UUID (string)
});
```

### 3. 1차 부재 신고 등록 (`submit_absence_report_1st`)
타 유저가 비어있는 예약석을 발견하고 **1차 부재 신고 사진**을 업로드할 때 호출합니다.
```typescript
const { data: reportId, error } = await supabase.rpc('submit_absence_report_1st', {
  p_seat_id: 5,               // 신고할 좌석의 ID (number)
  p_reporter_id: '신고자UUID',  // 신고한 유저의 UUID (string)
  p_photo_url: '스토리지사진URL' // 1차 증거 이미지 URL (string)
});
// 성공 시 좌석 상태는 즉시 'REPORTED_1ST' (황색 점멸)로 전환됩니다.
```

### 4. 1차 경고 접수 후 원예약자 복귀 확인 (`confirm_user_returned`)
경고 팝업을 본 원예약자가 30분 이내에 자리에 돌아와 **[복귀 확인]**을 눌렀을 때 호출합니다.
```typescript
const { error } = await supabase.rpc('confirm_user_returned', {
  p_seat_id: 5,               // 좌석의 ID (number)
  p_user_id: '원예약자UUID'    // 로그인한 유저의 UUID (string)
});
// 성공 시 신고 내역은 'RESOLVED_RETURNED'로 종료되며, 좌석 상태는 다시 'OCCUPIED'로 복구됩니다.
```

### 5. 2차 최종 부재 신고 등록 (`submit_absence_report_2nd`)
1차 신고 후 30분이 지난 뒤에도 원예약자가 복귀하지 않아, 최종적으로 **2차 부재 신고 사진**을 업로드할 때 호출합니다.
```typescript
const { error } = await supabase.rpc('submit_absence_report_2nd', {
  p_seat_id: 5,               // 좌석의 ID (number)
  p_photo_url: '2차스토리지사진URL' // 2차 증거 이미지 URL (string)
});
// DB 내부에서 1차 신고 기준 30분 경과 여부를 정밀 검증합니다.
// 성공 시 좌석 상태는 'REPORTED_2ND' (적색 점멸)로 전환되며 관리자 대시보드로 즉시 이송됩니다.
```

---

## ⚡ 백엔드 자동화 스케줄러 (10분 지연 자동 개방)

관리자가 현장에서 소지품을 수거하여 안내데스크로 이동하는 물리적 10분 유예를 보장하기 위해 PostgreSQL `pg_cron` 백그라운드 엔진이 동작 중입니다.

- **작동 기전**: 관리자가 대시보드에서 `[물품 수거 및 자리 정리]` 버튼을 누르면 좌석 상태는 즉시 `CLEARING` (보라색)으로 지정되며, 기존 예약은 즉시 강제 퇴실(`FORCED_RELEASED`) 처리됩니다.
- **자동 전환**: 정확히 10분 뒤에 백그라운드 크론 스케줄러가 해당 좌석 상태를 `AVAILABLE` (빈자리)로 전환하여 다음 사람이 신속하게 예약할 수 있도록 자동으로 활성화합니다.

---

## 🔒 데이터 보안 및 RLS 정책
모든 테이블과 스토리지 버킷은 **Row Level Security (RLS)**가 걸려있습니다.
- **일반 사용자**: 타인의 프로필과 좌석 현황 조회만 가능하며, 타인의 예약 내역이나 신고 정보는 변조 및 읽기가 불가능합니다.
- **관리자 (ADMIN)**: 모든 좌석 강제 해제 및 관리자 대시보드 통계/신고 건 조회가 가능합니다.

---

## 🚀 Supabase 적용 방법

1. Supabase 프로젝트의 **SQL Editor**로 이동합니다.
2. `backend/supabase/migrations/20260522000000_init_schema.sql` 내용을 복사하여 붙여넣고 **Run** 합니다.
3. `backend/supabase/migrations/20260522000100_storage_setup.sql` 내용을 복사하여 붙여넣고 **Run** 합니다. (Storage 버킷 및 RLS 활성화)
4. `backend/supabase/seed.sql` 내용을 복사하여 붙여넣고 **Run** 하여 24석의 빈 좌석 데이터를 활성화합니다.
