# ⚙️ Du-Reserve Backend (Express API Server) 개발자 가이드

이 문서는 **du-reserve** 백엔드 개발 및 데이터베이스 설계를 담당한 백엔드 개발자(팀원 B)의 작업 명세서이자, 프론트엔드 개발자(팀원 A)와의 원활한 통합을 위한 **한글 Express REST API 연동 가이드**입니다.

본 프로젝트는 **Express + TypeScript**로 구현된 중앙 백엔드 API 서버를 기반으로 하며, 내부적으로는 **Supabase (PostgreSQL)**와 직접 통신하여 트랜잭션 세이프(Transaction-safe)한 스마트 열람실 예약을 서빙합니다.

---

## 🛠️ 백엔드 아키텍처 및 로컬 설정

```text
backend/
├── README.md               # [본 문서] 백엔드 실행 가이드 및 API 명세
├── package.json            # 백엔드 라이브러리 설정
├── tsconfig.json           # TypeScript 빌드 설정
├── .env.example            # 로컬 환경설정 예시 파일
├── .env                    # 로컬 환경설정 파일 (Git 제외)
├── src/
│   ├── index.ts            # 백엔드 서버 구동 엔트리
│   ├── app.ts              # Express 애플리케이션 정의 및 라우터 매핑
│   ├── supabaseClient.ts   # Supabase Admin 전용 연결 모듈
│   └── controllers/
│       └── seatController.ts # 전체적인 비즈니스 로직(조회, 예약, 반납, 신고) 처리 컨트롤러
└── supabase/
    ├── seed.sql            # 초기 열람실 좌석 (24석) 테스트 시드 데이터 DML
    └── migrations/
        ├── 20260522000000_init_schema.sql  # 테이블, 트리거, RPC 함수 및 RLS 보안 설정
        └── 20260522000100_storage_setup.sql # 증거용 사진 업로드 전용 Storage 설정
```

### 로컬 실행 방법

1. **의존성 모듈 설치**:
   ```bash
   cd backend
   npm install
   ```

2. **환경 변수 파일 생성**:
   `backend/.env.example` 파일을 복사하여 `backend/.env` 파일을 만들고, 본인의 Supabase API 접속 정보(URL 및 Service Role Key)를 입력해 주세요.
   ```env
   PORT=5000
   SUPABASE_URL=https://본인프로젝트.supabase.co
   SUPABASE_SERVICE_ROLE_KEY=본인의서비스롤키
   ```
   > ⚠️ **중요**: 백엔드는 스토리지 업로드 및 DB 락 권한 우회를 위해 반드시 **Service Role Key**를 사용해야 합니다. 절대 공개용 `anon_key`를 사용하지 마십시오.

3. **개발 서버 구동**:
   ```bash
   npm run dev
   ```
   개발 서버가 정상 구동되면 `http://localhost:5000`에서 백엔드 API 서버가 대기하기 시작합니다.

4. **프로덕션 빌드 및 실행**:
   ```bash
   npm run build
   ```

---

## 🔌 Express REST API 명세 (포트: 5000)

프론트엔드(`frontend/src/app/page.tsx`)는 백엔드가 실행 중인 `http://localhost:5000` 주소를 기준으로 아래의 REST API 엔드포인트들을 호출해 연동을 완료합니다.

### 1. 좌석 및 부재 신고 현황 전체 조회
* **Endpoint**: `GET /api/seats`
* **설명**: 24석 스마트 좌석 현황과 현재 접수된 진행 중인(PENDING) 1차/2차 부재 신고 상태를 정밀하게 통합 가공하여 프론트엔드가 요구하는 구조화된 JSON 데이터로 일괄 반환합니다.

### 2. 좌석 예약하기
* **Endpoint**: `POST /api/reservations`
* **Body**:
  ```json
  {
    "seatId": 5,
    "userId": "사용자UUID"
  }
  ```
* **설명**: 지정된 좌석에 대해 예약을 신규 신청합니다. 내부 DB RPC 함수(`reserve_seat`)를 경유해 동시성 중복 예약을 완벽하게 방어하며, 위반 시 한글 에러 응답을 제공합니다.

### 3. 자진 반납 및 퇴실
* **Endpoint**: `POST /api/reservations/checkout`
* **Body**:
  ```json
  {
    "seatId": 5,
    "userId": "사용자UUID"
  }
  ```
* **설명**: 이용 중이던 본인의 좌석을 반납하여 빈자리(`AVAILABLE`) 상태로 즉시 개방합니다.

### 4. 1차 부재 신고 등록
* **Endpoint**: `POST /api/absence-reports/1st`
* **Body**:
  ```json
  {
    "seatId": 5,
    "reporterId": "신고자UUID",
    "firstPhotoBase64": "data:image/png;base64,..."
  }
  ```
* **설명**: 방치물품이 있는 좌석을 사진 촬영해 1차 신고합니다. 전달된 Base64 이미지는 백엔드에서 즉시 바이너리로 해독되어 Supabase Storage(`evidence-photos`)에 안전하게 자동 업로드된 후, RPC 함수(`submit_absence_report_1st`)에 의해 좌석이 `REPORTED_1ST`로 임시 잠금 및 타이머가 발송됩니다.

### 5. 원래 이용자의 좌석 복귀 확인
* **Endpoint**: `POST /api/absence-reports/return`
* **Body**:
  ```json
  {
    "seatId": 5,
    "userId": "원래이용자UUID"
  }
  ```
* **설명**: 1차 경보를 받은 이용자가 좌석으로 복귀하여 경고를 리셋하고 좌석 상태를 다시 `OCCUPIED`로 안전 복구시킵니다.

### 6. 2차 최종 부재 신고 등록 (30분 경과 후)
* **Endpoint**: `POST /api/absence-reports/2nd`
* **Body**:
  ```json
  {
    "seatId": 5,
    "secondPhotoBase64": "data:image/png;base64,..."
  }
  ```
* **설명**: 1차 경고 시점으로부터 30분이 지난 후에도 복귀하지 않은 유저의 좌석을 최종 신고하여 사서 수거 상태(`REPORTED_2ND`)로 확정합니다.

### 7. 사서/관리자 강제 개방 및 물품 수거 대기
* **Endpoint**: `POST /api/absence-reports/release`
* **Body**:
  ```json
  {
    "seatId": 5
  }
  ```
* **설명**: 사서가 현장을 점검하고 물품을 보관소로 이송하기 위해 좌석을 정리 중(`CLEARING`)으로 강제 지정합니다. 기존의 활성 예약은 강제 취소(`FORCED_RELEASED`)됩니다.

### 8. 사서 정리 작업 완료 및 빈자리 개방
* **Endpoint**: `POST /api/absence-reports/clear-complete`
* **Body**:
  ```json
  {
    "seatId": 5
  }
  ```
* **설명**: 10분 수동 완료 혹은 스케줄러 만료 시 좌석을 완전히 정제된 빈자리(`AVAILABLE`) 상태로 최종 해제 및 초기화합니다.
