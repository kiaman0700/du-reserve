# [PRD] 대구대학교 시설 예약 및 관리 시스템 (Phase 1: 스마트 열람실)
**Product Requirements Document (제품 요구사항 정의서)**

| 문서 정보 | 내용 |
| --- | --- |
| **프로젝트명** | 대구대학교 스마트 시설 예약 및 관리 시스템 (Daegu Univ. Facility Reservation System) |
| **버전** | v1.2.0 (3차 고도화: 이원화 개방 및 협업 가이드 반영) |
| **작성자** | 시니어 IT 서비스 기획자 |
| **대상 독자** | 프론트엔드/백엔드 개발자, UI/UX 디자이너, 도서관 관리자 |
| **작성일자** | 2026년 5월 22일 |

---

## 1. 프로젝트 개요 및 5W1H

본 프로젝트는 대구대학교 구성원(학부생, 교직원 등)이 이용하는 교내 시설의 예약 효율성을 높이고, **'자리 독점(사재기)' 및 '장기 부재 노쇼' 문제를 현장 증거 기반으로 원천 해결**하기 위한 실시간 예약 및 2단계 상호 감시형 관리 플랫폼입니다. 2인 1조 팀이 GitHub을 통해 투명하게 협업하며, 전 스택 무료 티어를 활용하여 빌드합니다.

### 5W1H 분석 매트릭스

| 요소 | 정의 | 상세 내용 |
| --- | --- | --- |
| **Who (주체)** | **이용자 / 관리자** | 대구대학교 학부생(학번), 교직원(교직원번호) 전체 및 도서관 관리자 |
| **Why (목적)** | **문제 해결** | - 소지품만 두고 몇 시간씩 자리를 비우는 악성 이용자 퇴출 및 회전율 극대화<br>- 갤러리 합성 사진을 통한 허위 신고 기능 악용 차단<br>- 담당자의 현장 물품 수거 및 정리 정돈을 위한 물리적 유유 시간 확보 |
| **What (대상)** | **스마트 열람실 시스템** | - 대구대 포털 ID 연동 기반 예약 웹 앱<br>- 내장 카메라 API 기반 '30분 간격 2차 검증 신고 시스템'<br>- **담당자 제어용 이원화 좌석 개방(10분 자동 예약 타이머 / 수동 즉시 개방)** 시스템 |
| **When (일정)** | **2026년 1학기** | 오픈소스 소프트웨어 과제 2인 1조 프로젝트 (GitHub 프로세스 추적 가능 빌드) |
| **Where (공간)** | **대구대 중앙도서관** | 대구대학교 중앙도서관 열람실 우선 타겟 적용 후 교내 시설 확장 가능 |
| **How (방법)** | **무료 오픈소스 스택** | Next.js(App Router) + Supabase(Realtime DB, Auth, Storage) + Vercel |

---

## 2. 기술 스택 (Tech Stack Matrix)

* **Frontend**: `Next.js (v14+ App Router)`, `Tailwind CSS`, `Shadcn/ui`
    * *카메라 인터페이스*: HTML5 `getUserMedia` API를 연동하여 기기의 후면 카메라를 직접 제어. 갤러리 파일 업로드(`input type="file"`)를 원천 차단하여 실시간 촬영만 허용.
* **Backend & DB**: `Supabase (PostgreSQL)`
    * *Realtime & Storage*: 좌석 상태 실시간 브로드캐스팅 및 1차/2차 현장 증거 사진 저장용 Storage 활용.
    * *Automated Trigger*: 10분 지연 자동 개방을 위한 PostgreSQL `pg_net` 또는 Supabase Edge Functions 타이머 활용.
* **Deployment & Version Control**: `GitHub`, `Vercel`

---

## 3. 기능 상세 정의 (Functional Specifications)

### 3.1. 대구대학교 계정 기반 인증 (Authentication)
* **[REQ-01-01] 대구대 포털 ID 로그인**
    * 사용자는 대구대학교에서 발급받은 고유 번호(학생: 학번 / 교직원: 교직원번호)를 고유 고유 ID로 사용함.
    * 비밀번호는 가입 시 사용자가 직접 설정한 커스텀 암호를 입력받아 처리함 (Supabase Auth 연동).

### 3.2. 실시간 혼잡도 및 좌석 정보
* **[REQ-02-01] 좌석 상태 정의 및 색상 가이드**
    * `AVAILABLE` (빈자리 - 청색)
    * `OCCUPIED` (이용 중 - 회색)
    * `REPORTED_1ST` (1차 신고 접수됨 - 황색 점멸)
    * `REPORTED_2ND` (2차 최종 신고 완료 - 적색 점멸, 담당자 확인 대기)
    * `CLEARING` (담당자 물품 정리 중 - 보라색, **10분 후 자동 AVAILABLE 전환 상태**)

### 3.3. 내장 카메라 및 타이머 기반 2단계 부재 신고 시스템
* **[REQ-03-01] 1차 부재 신고 및 라이브 촬영**
    * 타 사용자가 비어있는 좌석 선택 후 [부재 신고] 시 기기 카메라 활성화 (갤러리 업로드 불가). 촬영 사진은 Storage 저장 및 좌석 상태 `REPORTED_1ST` 전환.
* **[REQ-03-02] 원예약자 대상 1차 경고 실시간 팝업**
    * 1차 사진 업로드 즉시 원예약자 화면에 경고 모달 노출.
    * *문구*: `⚠️ 장기 부재 신고가 접수되었습니다. 30분 이내에 좌석으로 복귀하여 [복귀 확인] 버튼을 누르지 않으면 담당자에 의해 강제 퇴실 조치 및 좌석이 초기화될 수 있습니다.`
* **[REQ-03-03] 30분 대기 타이머 및 2차 최종 촬영 제한**
    * 1차 신고 시점부터 30분간 카운트다운 타이머 작동 (2차 연타 신고 방지).
    * 30분 경과 후에도 복귀하지 않을 경우 2차 촬영 버튼 활성화. 2차 라이브 사진 업로드 시 좌석 상태 `REPORTED_2ND`로 변경되며 담당자 대시보드로 이관.

### 3.4. 담당자 이원화 좌석 개방 및 사후 처리 (Admin Dual-Release Control)
* **[REQ-04-01] 관리자 관제 대시보드 검증**
    * 담당자(`ADMIN`) 화면에 1차 사진과 2차 사진이 매칭된 최종 신고 대기 건이 타임라인 순으로 노출됨. 담당자는 두 장의 사진을 대조하여 사재기 여부를 확인.
* **[REQ-04-02] 이원화된 좌석 개방 선택권 (핵심 요구사항)**
    * 담당자는 현장 상황 및 운영 방식에 따라 다음 2가지 제어 방식 중 하나를 선택하여 좌석을 개방함.
        1. **지연 자동 개방 ([물품 수거 및 자리 정리] 버튼)**
            * 담당자가 현장에서 사재기 유저의 물품을 치우기 시작할 때 누르는 버튼.
            * 클릭 시 좌석 상태는 즉시 `CLEARING`으로 변경되며, **10분 자동 카운트다운 타이머**가 작동함.
            * **10분이 경과하면 시스템이 자동으로 좌석 상태를 `AVAILABLE`(빈자리)로 변경**하여 일반 유저에게 전파함. (담당자가 물품을 수거함으로 이동시키고 자리를 정돈하는 물리적인 작업 시간 확보용)
        2. **즉시 수동 개방 ([즉시 빈자리 전환] 버튼)**
            * 현장 확인 결과 즉각적인 자리가 비어있거나, 담당자가 직접 신고 처리를 완료하여 즉시 개방해도 무방한 경우 누르는 버튼.
            * 클릭 시 10분의 유예 시간 없이 **그 즉시 좌석 상태가 `AVAILABLE`(빈자리)**로 강제 변경됨.
* **[REQ-04-03] 퇴실 대상자 사후 안내 팝업 발송**
    * 담당자가 위의 두 방식 중 하나로 퇴실 처리를 완료하면, 강제 퇴실당한 사용자가 이후 웹 앱에 재접속 시 화면에 사후 안내 팝업을 강제 강제 노출함.
    * *문구*: `🚨 장기 부재 신고 누적으로 인해 해당 좌석이 강제 퇴실 처리되었습니다. 방치되어 있던 개인 물품은 현장 점검 후 [도서관 1층 안내 데스크 / 관리실]로 이동 보관되었습니다. 물품을 찾으러 해당 장소로 방문해 주시기 바랍니다.`

---

## 4. UX Flow (사용자 경험 흐름)

```
[신고자] 빈자리 확인 ──▶ 1차 라이브 촬영 ──▶ [30분 타이머 락 가동]
                                                   │
   ┌───────────────────────────────────────────────┘
   ▼
[원예약자 폰] Realtime 경고 팝업 노출 ("30분 내 미복귀시 퇴실 조치")
   │
   ├─▶ (30분 내 복귀시) ──▶ [복귀 확인] 클릭 ──▶ 신고 리셋 & 이용 유지
   │
   └─▶ (30분 내 미복귀시) ──▶ [신고자] 30분 후 2차 라이브 촬영 ──▶ [담당자 관제 이관]
                                                                        │
   ┌────────────────────────────────────────────────────────────────────┘
   ▼
[도서관 담당자] 1차/2차 사진 대조 검증 후 개방 방식 선택
   │
   ├─▶ [물품 수거 및 자리 정리] 클릭 ──▶ 좌석: CLEARING 전환 ──▶ (10분 뒤) ──▶ 자동 AVAILABLE (빈자리)
   │
   └─▶ [즉시 빈자리 전환] 클릭     ──▶ 좌석: 즉시 AVAILABLE (빈자리) 전환
   │
   ▼
[원예약자 사후 접속] ──▶ 안내 팝업 노출 ("물품을 찾으러 [안내데스크]로 오세요")
```

---

## 5. 데이터베이스 스키마 설계 (Supabase PostgreSQL DDL)

```sql
-- 1. 대구대 구성원 프로필 테이블
CREATE TABLE public.profiles (
    id UUID REFERENCES auth.users ON DELETE CASCADE PRIMARY KEY,
    university_id TEXT UNIQUE NOT NULL, -- 학번 또는 교직원번호
    name TEXT NOT NULL,
    role TEXT DEFAULT 'USER' CHECK (role IN ('USER', 'ADMIN')),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
);

-- 2. 열람실 좌석 테이블
CREATE TABLE public.seats (
    id SERIAL PRIMARY KEY,
    seat_number INT UNIQUE NOT NULL,
    room_name TEXT NOT NULL DEFAULT '제1열람실',
    status TEXT DEFAULT 'AVAILABLE' CHECK (status IN ('AVAILABLE', 'OCCUPIED', 'REPORTED_1ST', 'REPORTED_2ND', 'CLEARING', 'MAINTENANCE')),
    current_reservation_id INT,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
);

-- 3. 예약 내역 테이블
CREATE TABLE public.reservations (
    id SERIAL PRIMARY KEY,
    user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
    seat_id INT REFERENCES public.seats(id) ON DELETE CASCADE NOT NULL,
    check_in_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,
    check_out_at TIMESTAMP WITH TIME ZONE,
    status TEXT DEFAULT 'ACTIVE' CHECK (status IN ('ACTIVE', 'COMPLETED', 'FORCED_RELEASED')),
    CONSTRAINT one_active_reservation_per_user UNIQUE (user_id, status)
);

-- 4. 부재 신고 및 타이머 추적 테이블
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
    resolved_at TIMESTAMP WITH TIME ZONE
);

ALTER TABLE public.seats 
ADD CONSTRAINT fk_current_reservation 
FOREIGN KEY (current_reservation_id) REFERENCES public.reservations(id) ON DELETE SET NULL;
```

---

## 6. R&R (역할 분담) 및 GitHub 협업 워크플로우

2인 1조 프로젝트의 개발 생산성을 극대화하고, 커밋 기록을 통해 기여도를 명확히 검증할 수 있도록 깃허브 협업 프로세스를 정립합니다.

### 6.1. 팀원별 R&R (Role and Responsibilities)

| 담당자 | 대분류 | 상세 구현 범위 |
| --- | --- | --- |
| **팀원 A** | **UI/UX & 인터페이스** | - Next.js 기반 반응형 대시보드 및 열람실 좌석 배치도 퍼블리싱<br>- 좌석 상태별(`AVAILABLE`, `CLEARING` 등) 시각적 피드백 구현<br>- HTML5 `getUserMedia` API 연동 실시간 카메라 캡처 레이어 인터페이스 구현<br>- 실시간 경고 및 사후 수거 안내 모달(Popup) 컴포넌트 프론트엔드 제어 |
| **팀원 B** | **DB & 백엔드 로직** | - Supabase PostgreSQL 테이블 구조 설계 및 관계 정의(DDL)<br>- 가입 유저의 학번/교직원번호 식별 가입 및 세션 관리 정책 수립<br>- 1차/2차 증거 사진 저장을 위한 Supabase Storage 권한 정책(RLS) 세팅<br>- **백엔드 타이머 트리거 엔진 구축** (1차 신고 후 30분 제한 및 관리자 치움 시작 후 10분 뒤 `AVAILABLE` 상태 자동 전환 Cron/Edge Function 구성) |

### 6.2. GitHub 기반 작업 프로세스 (Transparency)
* **Branch 전략 (Git-Flow MVP)**: 
    * `main`: 상시 배포 가능한 안정 버전 브랜치 (Vercel 자동 프로덕션 배포 연동).
    * `feature/ui-interface` (팀원 A): UI 컴포넌트 및 클라이언트 사이드 카메라 스크립트 전용 개발 브랜치.
    * `feature/backend-db` (팀원 B): Supabase API 통신 연동, DB 핸들러, 백엔드 타이머 자동화 처리 브랜치.
* **협업 과정 증명(Commit & PR)**:
    * 두 팀원은 서로의 코드가 겹치지 않도록 기능 단위로 세분화하여 커밋 메시지를 기록함.
    * 개발된 코드는 상대방의 **Pull Request (PR) 검토 및 승인(Approve)** 단계를 거쳐 `main` 브랜치에 합쳐지도록 설정하여, GitHub 커밋 그래프 및 PR 로그 자체를 과제 제출 시 기여도 증빙 자료로 활용함.

---

## 7. 개발자 구현 요구 조건 (Developer QA Checklist)

* **[QA-01]** 담당자가 [물품 수거 및 자리 정리] 선택 시 좌석이 보라색(`CLEARING`)으로 즉시 변경되고, 정확히 서버 시간 기준 10분 뒤에 `AVAILABLE`로 데이터 동기화가 이루어지는가?
* **[QA-02]** [즉시 빈자리 전환] 선택 시에는 스케줄러를 타지 않고 즉시 웹소켓 브로드캐스팅을 통해 타 유저 도면에 빈자리로 반영되는가?
* **[QA-03]** 두 명의 팀원이 각자 분담한 브랜치명으로 GitHub 커밋 로그가 논리적으로 나뉘어 있으며, 코드 충돌 없이 PR을 통해 머지되었는가?
