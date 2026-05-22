# 🗓️ Du-Reserve (듀-리저브)

> **2인 1조 예약 및 관리 서비스 협업 프로젝트**
> 
> 이 레포지토리는 예약 서비스를 위한 웹 애플리케이션으로, **프론트엔드**와 **백엔드**가 모노레포(Monorepo) 구조로 통합 관리되는 저장소입니다.

---

## 📂 프로젝트 구조 (Monorepo)

본 프로젝트는 충돌 방지 및 통합 관리를 위해 다음과 같은 모노레포 구조를 가집니다.

```text
du-reserve/
├── .gitignore          # 전역 Git 제외 설정
├── README.md           # [본 문서] 프로젝트 전체 안내
├── backend/            # 백엔드 서버 프로젝트 (Express + TypeScript)
└── frontend/           # 프론트엔드 웹 프로젝트 (파트너 담당)
```

- **`backend/`**: API 설계, 비즈니스 로직, 데이터베이스(DB) 및 인증을 처리하는 백엔드 공간입니다.
- **`frontend/`**: 사용자 화면(UI/UX), 상태 관리 및 백엔드 API 연동을 담당하는 프론트엔드 공간입니다.

---

## 🤝 Git 협업 가이드라인

원활한 2인 협업과 코드 충돌(Conflict) 방지를 위해 다음 브랜치 전략을 준수합니다.

### 1. 브랜치 전략 (Git Flow)

- **`main` (배포)**: 배포 가능한 수준의 가장 안정적인 상용 브랜치입니다.
- **`develop` (개발 통합)**: 각 파트에서 기능 개발 완료 후 병합(Merge)되는 기준 브랜치입니다.
- **`feat/backend-*` (백엔드 기능)**: 백엔드 기능 개발 시 생성하는 기능별 브랜치입니다. (예: `feat/backend-auth`, `feat/backend-reserve`)
- **`feat/frontend-*` (프론트엔드 기능)**: 프론트엔드 기능 개발 시 생성하는 브랜치입니다.

### 2. 커밋 메시지 규칙 (Commit Convention)

서로의 개발 현황을 쉽게 파악하기 위해 다음 접두사를 사용해 커밋 메시지를 통일합니다.

- `feat: ` 새로운 기능 추가
- `fix: ` 버그 수정
- `docs: ` 문서 수정 (README 등)
- `style: ` 코드 포맷팅, 세미콜론 누락 등 (코드 변경이 없는 경우)
- `refactor: ` 코드 리팩토링 (기능 변화가 없는 구조 개편)
- `chore: ` 빌드 태스크, 패키지 매니저 설정 등 변경

*예시: `feat: 백엔드 로그인 API 및 JWT 인증 토큰 발급 구현`*

### 3. 작업 및 병합 프로세스

1. 새로운 기능을 개발할 때 `develop` 브랜치로부터 각자의 기능 브랜치를 파생합니다.
   ```bash
   git checkout develop
   git pull origin develop
   git checkout -b feat/backend-auth
   ```
2. 작업이 완료되면 원격 저장소에 푸시합니다.
   ```bash
   git push origin feat/backend-auth
   ```
3. GitHub에서 **Pull Request (PR)**를 생성하여 상대방에게 알리고, 리뷰 및 상호 합의 하에 `develop` 브랜치에 병합(Merge)합니다.

---

## 💻 실행 및 로컬 환경 설정

### 백엔드 (Backend)
백엔드 실행과 설정에 관한 자세한 가이드는 [backend/README.md](./backend/README.md)를 참고해 주세요.

### 프론트엔드 (Frontend)
프론트엔드 실행과 설정에 관한 자세한 가이드는 [frontend/README.md](./frontend/README.md)를 참고해 주세요.
