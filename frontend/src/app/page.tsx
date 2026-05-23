"use client";

import React, { useState, useEffect } from "react";
import { 
  Building2, 
  ShieldCheck, 
  GraduationCap, 
  HelpCircle, 
  CheckCircle2, 
  AlertTriangle,
  FileText,
  Clock,
  User,
  Key,
  ArrowRight,
  LogOut,
  Sparkles,
  Laptop,
  Activity,
  Globe,
  Palette,
  BookOpen,
  CheckCircle,
  Users,
  Search
} from "lucide-react";
import SeatMap from "@/components/SeatMap";
import UserDashboard from "@/components/UserDashboard";
import AdminPanel from "@/components/AdminPanel";

// Models & Types
export type SeatStatus = "AVAILABLE" | "OCCUPIED" | "REPORTED_1ST" | "REPORTED_2ND" | "CLEARING";

export interface Profile {
  id: string;
  university_id: string;
  name: string;
  role: "USER" | "ADMIN";
}

export interface Seat {
  id: number;
  seat_number: number;
  room_name: string;
  status: SeatStatus;
  current_user_id?: string;
  current_user_name?: string;
  current_reservation_id?: number;
  clearing_timer_seconds?: number;
}

export interface AbsenceReport {
  id: number;
  seat_id: number;
  reporter_id: string;
  first_photo_url: string;
  first_reported_at: string;
  second_photo_url?: string;
  second_reported_at?: string;
  warning_timer_seconds?: number; // 30 minutes = 1800 seconds
  status: "PENDING" | "RESOLVED_RETURNED" | "RESOLVED_RELEASED";
}

export interface Facility {
  id: string;
  collegeId: string;
  name: string;
  roomName: string;
  category: "STUDY" | "SEMINAR" | "PC" | "LIBRARY" | "SPORTS";
  tags: string[];
  capacity: number;
  instantConfirm: boolean; // 즉시 확정 / 승인 필요 구분
  buildingName: string;
  description: string;
}

// 대구대학교 단과대학별 세부 시설(호실) 목록 (24개)
const FACILITIES: Facility[] = [
  // 1. IT·공과대학
  { id: "it-101", collegeId: "it-eng", name: "IT융합관 101호 공동 PC 실습실", roomName: "공동 PC 실습실", category: "PC", tags: ["고성능PC", "듀얼모니터", "멀티탭완비", "프린터연동"], capacity: 50, instantConfirm: true, buildingName: "IT융합관 1층", description: "최신 GPU 장착 워크스테이션 및 듀얼 모니터가 설치된 실습 스페이스" },
  { id: "it-305", collegeId: "it-eng", name: "IT융합관 305호 스마트 스터디 존", roomName: "스마트 스터디 존", category: "STUDY", tags: ["노트북연결", "화이트보드", "정원8명", "스마트TV"], capacity: 8, instantConfirm: true, buildingName: "IT융합관 3층", description: "소그룹 코딩 회의 및 노트북 사용에 최적화된 라운지형 스터디 공간" },
  { id: "it-204", collegeId: "it-eng", name: "공학2호관 204호 전공 세미나실", roomName: "전공 세미나실", category: "SEMINAR", tags: ["빔프로젝터", "화이트보드", "음향시설", "냉난방개별"], capacity: 15, instantConfirm: false, buildingName: "공학2호관 2층", description: "학부/대학원 세미나 및 캡스톤 디자인 발표 리허설에 적합한 공간" },
  { id: "it-402", collegeId: "it-eng", name: "공학1호관 402호 자율 열람실", roomName: "자율 열람실", category: "LIBRARY", tags: ["독서실형", "백색소음기", "24시간개방", "개인스탠드"], capacity: 30, instantConfirm: true, buildingName: "공학1호관 4층", description: "조용히 학업에 몰두할 수 있는 독서실형 고도의 집중 학습 공간" },

  // 2. 사범대학
  { id: "edu-205", collegeId: "edu", name: "사범관 205호 임용고시 대비실", roomName: "임용고시 대비실", category: "LIBRARY", tags: ["임용고시전용", "개별칸막이", "조용한환경", "독서대제공"], capacity: 30, instantConfirm: true, buildingName: "사범관 2층", description: "교사 임용 시험을 준비하는 사범대생들을 위한 전용 열람 구역" },
  { id: "edu-401", collegeId: "edu", name: "사범관 401호 모의수업 실습실", roomName: "모의수업 실습실", category: "SEMINAR", tags: ["전자칠판", "수업촬영캠", "피드백모니터", "방음완비"], capacity: 12, instantConfirm: false, buildingName: "사범관 4층", description: "실제 학교 교실과 유사한 칠판 및 카메라 녹화 장비를 구비한 모의 시험실" },
  { id: "edu-lobby", collegeId: "edu", name: "사범관 1층 스터디 라운지", roomName: "스터디 라운지", category: "STUDY", tags: ["개방형", "와이파이", "편안한소파", "음료반입가능"], capacity: 6, instantConfirm: true, buildingName: "사범관 1층 로비", description: "가벼운 그룹 스터디 및 과제 조율을 위한 쾌적한 오픈 스페이스" },

  // 3. 재활과학대학
  { id: "rehab-110", collegeId: "rehab", name: "재활관 110호 언어치료 실습실", roomName: "언어치료 실습실", category: "PC", tags: ["임상실습장비", "방음벽", "일방경거울", "관찰카메라"], capacity: 10, instantConfirm: false, buildingName: "재활관 1층", description: "언어재활 및 상담 연습을 위한 전문 모니터링 시설이 완비된 실습룸" },
  { id: "rehab-315", collegeId: "rehab", name: "재활관 315호 그룹스터디존", roomName: "그룹스터디존", category: "STUDY", tags: ["화이트보드", "멀티탭", "정원8명", "무선인터넷"], capacity: 8, instantConfirm: true, buildingName: "재활관 3층", description: "전공 서적 공동 스터디 및 발표 자료 준비에 안성맞춤인 조별룸" },
  { id: "rehab-402", collegeId: "rehab", name: "재활관 402호 전공 자율독서실", roomName: "전공 자율독서실", category: "LIBRARY", tags: ["개인스탠드", "공기청정기", "백색소음기", "집중형좌석"], capacity: 25, instantConfirm: true, buildingName: "재활관 4층", description: "재활과학대학 학생들의 전공 면학 분위기 조성을 위한 조용한 자율 공간" },

  // 4. 글로벌경영대학
  { id: "biz-201", collegeId: "biz", name: "경상관 201호 조별학습실", roomName: "조별학습실", category: "STUDY", tags: ["모니터TV", "개별에어컨", "정원8명", "콘센트박스"], capacity: 8, instantConfirm: true, buildingName: "경상관 2층", description: "경영 분석 케이스 스터디 및 토론에 최적화된 밀폐형 스터디 룸" },
  { id: "biz-305", collegeId: "biz", name: "경상관 305호 PC 열람실", roomName: "PC 열람실", category: "PC", tags: ["사무용PC", "고속인쇄기", "인터넷서핑", "넓은테이블"], capacity: 40, instantConfirm: true, buildingName: "경상관 3층", description: "레포트 작성, 자료조사 및 고속 문서 인쇄가 가능한 컴퓨터실" },
  { id: "biz-102", collegeId: "biz", name: "경상관 102호 경상독서실", roomName: "경상독서실", category: "LIBRARY", tags: ["개방식독서실", "공기청정", "콘센트존", "정원35명"], capacity: 35, instantConfirm: true, buildingName: "경상관 1층", description: "답답하지 않은 오픈형 넓은 좌석 배치를 적용한 경상대 전용 자율 열람 공간" },

  // 5. 공공인재대학
  { id: "pub-301", collegeId: "public", name: "법정관 301호 행정고시반", roomName: "행정고시반", category: "LIBRARY", tags: ["국가고시대비", "지정석운영", "독서대구비", "24시간개방"], capacity: 20, instantConfirm: false, buildingName: "법정관 3층", description: "5급 공무원, 로스쿨 진학 및 전문 자격시험 준비반 전용 열람실" },
  { id: "pub-105", collegeId: "public", name: "법정관 105호 소모임 세미나실", roomName: "소모임 세미나실", category: "SEMINAR", tags: ["대형화이트보드", "프로젝터", "멀티탭", "정원10명"], capacity: 10, instantConfirm: true, buildingName: "법정관 15층", description: "모의재판 연습 및 행정/법학 관련 세미나 소모임 룸" },
  { id: "pub-212", collegeId: "public", name: "법정관 212호 법학 토론실", roomName: "법학 토론실", category: "STUDY", tags: ["원형테이블", "노트북무선연결", "정원8명", "유리보드"], capacity: 8, instantConfirm: true, buildingName: "법정관 2층", description: "유리 보드를 이용한 아이디어 도출 및 토론 전용 라운지룸" },

  // 6. 디자인예술대학
  { id: "des-105", collegeId: "design", name: "조형관 105호 크리에이티브 스튜디오", roomName: "크리에이티브 스튜디오", category: "PC", tags: ["대형제도테이블", "미팅스페이스", "자유토론", "작품임시보관"], capacity: 15, instantConfirm: true, buildingName: "조형관 1층", description: "공동 작업 및 도면 제도, 대형 실습 테이블이 마련된 창작 공간" },
  { id: "des-210", collegeId: "design", name: "조형관 210호 그래픽 워크스테이션", roomName: "그래픽 워크스테이션", category: "PC", tags: ["액정와콤타블렛", "어도비전제품", "정밀스캐너", "정원25명"], capacity: 25, instantConfirm: false, buildingName: "조형관 2층", description: "일러스트 및 3D 모델링, 고사양 어도비 라이선스가 완비된 컴퓨터실" },
  { id: "des-lounge", collegeId: "design", name: "조형관 3층 크리에이티브 라운지", roomName: "크리에이티브 라운지", category: "STUDY", tags: ["감성인테리어", "와이파이", "개방식테이블", "정원8명"], capacity: 8, instantConfirm: true, buildingName: "조형관 3층", description: "미술 예술학부 학생들의 자유로운 작품 구상 및 아이디어 교환 카페룸" },

  // 7. 중앙도서관 (창파도서관)
  { id: "lib-study-a", collegeId: "library", name: "창파도서관 1층 그룹스터디룸 A", roomName: "그룹스터디룸 A", category: "STUDY", tags: ["대형TV", "화이트보드", "정원6명", "완벽방음"], capacity: 6, instantConfirm: true, buildingName: "중앙도서관 1층", description: "대형 TV에 모니터 연결이 가능하며, 소음을 차단하는 더블 방음 구조의 예약룸" },
  { id: "lib-study-b", collegeId: "library", name: "창파도서관 1층 그룹스터디룸 B", roomName: "그룹스터디룸 B", category: "STUDY", tags: ["PC연결모니터", "유리화이트보드", "정원4명", "멀티탭"], capacity: 4, instantConfirm: true, buildingName: "중앙도서관 1층", description: "조원간 신속한 과제 검토 및 오피스 자료 작성이 가능한 실용적인 스터디룸" },
  { id: "lib-seminar", collegeId: "library", name: "창파도서관 2층 세미나홀", roomName: "세미나홀", category: "SEMINAR", tags: ["빔프로젝터", "마이크장비", "음향시설", "정원30명"], capacity: 30, instantConfirm: false, buildingName: "중앙도서관 2층", description: "학부 연합 발표, 대규모 세미나 및 초청 강연 등에 활용되는 다목적 홀" },
  { id: "lib-reading-1", collegeId: "library", name: "창파도서관 제1자율열람실", roomName: "제1자율열람실", category: "LIBRARY", tags: ["독서실형", "칸막이석", "노트북타이핑금지", "24시간개방"], capacity: 24, instantConfirm: true, buildingName: "중앙도서관 2층", description: "전형적인 정적 독서실 구조로 고도의 집중력을 요구하는 공부 전용 공간" },
];

// Initial Mock Seats (24 Seats in total)
const INITIAL_SEATS: Seat[] = Array.from({ length: 24 }, (_, i) => {
  const seatNumber = i + 1;
  
  if (seatNumber === 3) {
    return {
      id: seatNumber,
      seat_number: seatNumber,
      room_name: "제1열람실",
      status: "OCCUPIED",
      current_user_id: "user-2",
      current_user_name: "홍길동 (정보통신학과)",
      current_reservation_id: 103
    };
  }
  
  if (seatNumber === 7) {
    return {
      id: seatNumber,
      seat_number: seatNumber,
      room_name: "제1열람실",
      status: "REPORTED_1ST",
      current_user_id: "user-3",
      current_user_name: "김민수 (컴퓨터공학과)",
      current_reservation_id: 107
    };
  }

  if (seatNumber === 15) {
    return {
      id: seatNumber,
      seat_number: seatNumber,
      room_name: "제1열람실",
      status: "CLEARING",
      current_user_id: "user-4",
      current_user_name: "박서연 (경영학과)",
      current_reservation_id: 115,
      clearing_timer_seconds: 480
    };
  }

  return {
    id: seatNumber,
    seat_number: seatNumber,
    room_name: "제1열람실",
    status: "AVAILABLE"
  };
});

// Initial Mock Absence Reports
const INITIAL_REPORTS: AbsenceReport[] = [
  {
    id: 1,
    seat_id: 7,
    reporter_id: "user-mock-reporter",
    first_photo_url: "data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='100' height='100' viewBox='0 0 100 100'><rect width='100' height='100' fill='%231e293b'/><circle cx='50' cy='50' r='20' fill='%23d97706'/><text x='50' y='80' fill='%23f8fafc' font-size='10' text-anchor='middle'>[1차] 방치된 책가방</text></svg>",
    first_reported_at: new Date(Date.now() - 10 * 60 * 1000).toISOString(),
    warning_timer_seconds: 1200,
    status: "PENDING"
  }
];

export default function Page() {
  // Authentication & Session States
  const [isLoggedIn, setIsLoggedIn] = useState<boolean>(false);
  const [currentUser, setCurrentUser] = useState<Profile | null>(null);
  const [loginTab, setLoginTab] = useState<"STUDENT" | "ADMIN">("STUDENT");

  // Selection & Filter States (통합 메인용)
  const [selectedFacility, setSelectedFacility] = useState<Facility | null>(null);
  const [facilityFilter, setFacilityFilter] = useState<"ALL" | "STUDY" | "SEMINAR" | "PC" | "LIBRARY" | "CHANGPA">("ALL");

  // 상세 검색 상태 변수
  const [searchKeyword, setSearchKeyword] = useState<string>("");
  const [searchBuilding, setSearchBuilding] = useState<string>("ALL");
  const [searchCapacity, setSearchCapacity] = useState<string>("");

  // Login inputs
  const [studentIdInput, setStudentIdInput] = useState<string>("");
  const [studentNameInput, setStudentNameInput] = useState<string>("");
  const [adminCodeInput, setAdminCodeInput] = useState<string>("");
  const [loginError, setLoginError] = useState<string | null>(null);

  // Global State for Reservation desk
  const [perspective, setPerspective] = useState<"STUDENT" | "ADMIN">("STUDENT");
  const [absenceReports, setAbsenceReports] = useState<AbsenceReport[]>(INITIAL_REPORTS);
  const [selectedSeat, setSelectedSeat] = useState<Seat | null>(null);
  
  // Timer speedup state (60x speed for testing)
  const [timerSpeedUp, setTimerSpeedUp] = useState<boolean>(true);
  
  // Track forced checkout notification
  const [forcedCheckoutAlert, setForcedCheckoutAlert] = useState<{
    show: boolean;
    seatNumber: number;
  }>({ show: false, seatNumber: 0 });

  // ----------------------------------------------------
  // INDEPENDENT SEAT STATES FOR EACH FACILITY
  // ----------------------------------------------------
  const [facilitySeats, setFacilitySeats] = useState<Record<string, Seat[]>>({});

  // Initialize seats for each facility on component load
  useEffect(() => {
    const seatMapInit: Record<string, Seat[]> = {};
    FACILITIES.forEach(fac => {
      seatMapInit[fac.id] = INITIAL_SEATS.map((seat, idx) => {
        if (seat.id === 3 || seat.id === 7 || seat.id === 15) {
          return { ...seat };
        }
        const hash = fac.id.charCodeAt(0) + fac.id.charCodeAt(1) + idx;
        if (hash % 7 === 0) {
          return {
            ...seat,
            status: "OCCUPIED" as SeatStatus,
            current_user_id: `mock-user-${hash}`,
            current_user_name: `임의학생 (학부생)`,
            current_reservation_id: 1000 + hash
          };
        }
        return { ...seat };
      });
    });
    setFacilitySeats(seatMapInit);
  }, []);

  // Currently active seats array based on selected facility
  const activeSeats = selectedFacility && facilitySeats[selectedFacility.id]
    ? facilitySeats[selectedFacility.id]
    : INITIAL_SEATS;

  // Update helper for facility seats
  const setSeats = (updater: Seat[] | ((prev: Seat[]) => Seat[])) => {
    if (!selectedFacility) return;
    setFacilitySeats(prev => {
      const current = prev[selectedFacility.id] || INITIAL_SEATS;
      const nextSeats = typeof updater === "function" ? updater(current) : updater;
      return {
        ...prev,
        [selectedFacility.id]: nextSeats
      };
    });
  };

  // Get active reservation for the logged in student
  const myReservationFacilityId = Object.keys(facilitySeats).find(facId => {
    if (!currentUser) return false;
    const reservedSeat = facilitySeats[facId]?.find(s => s.current_user_id === currentUser.id);
    return !!reservedSeat;
  }) || null;

  const myReservation = currentUser && myReservationFacilityId && selectedFacility && myReservationFacilityId === selectedFacility.id
    ? facilitySeats[selectedFacility.id]?.find(s => s.current_user_id === currentUser.id) || null
    : null;

  const activeStudentWarning = myReservation
    ? absenceReports.find(r => r.seat_id === myReservation.id && r.status === "PENDING")
    : null;

  // Active warning modal trigger (if my reserved seat goes into REPORTED_1ST)
  const [showWarningModal, setShowWarningModal] = useState<boolean>(false);

  // Monitor my seat status changes for warning popup
  useEffect(() => {
    if (myReservation && myReservation.status === "REPORTED_1ST") {
      setShowWarningModal(true);
    } else {
      setShowWarningModal(false);
    }
  }, [myReservation?.status]);

  // Timers management effect
  useEffect(() => {
    const interval = setInterval(() => {
      // 1. Tick Warning timers
      setAbsenceReports((prevReports) =>
        prevReports.map((report) => {
          if (report.status === "PENDING" && report.warning_timer_seconds !== undefined) {
            const decrement = timerSpeedUp ? 60 : 1;
            const newSeconds = Math.max(0, report.warning_timer_seconds - decrement);
            return {
              ...report,
              warning_timer_seconds: newSeconds
            };
          }
          return report;
        })
      );

      // 2. Tick Clearing seat timers across ALL facilities
      setFacilitySeats((prevMap) => {
        const nextMap = { ...prevMap };
        Object.keys(nextMap).forEach(facId => {
          nextMap[facId] = nextMap[facId].map((seat) => {
            if (seat.status === "CLEARING" && seat.clearing_timer_seconds !== undefined) {
              const decrement = timerSpeedUp ? 60 : 1;
              const newSeconds = Math.max(0, seat.clearing_timer_seconds - decrement);
              
              if (newSeconds === 0) {
                return {
                  ...seat,
                  status: "AVAILABLE",
                  current_user_id: undefined,
                  current_user_name: undefined,
                  current_reservation_id: undefined,
                  clearing_timer_seconds: undefined
                };
              }
              return {
                ...seat,
                clearing_timer_seconds: newSeconds
              };
            }
            return seat;
          });
        });
        return nextMap;
      });
    }, 1000);

    return () => clearInterval(interval);
  }, [timerSpeedUp]);

  // Update selected seat details whenever active seats list changes
  useEffect(() => {
    if (selectedSeat && selectedFacility) {
      const currentList = facilitySeats[selectedFacility.id] || INITIAL_SEATS;
      const updated = currentList.find(s => s.id === selectedSeat.id);
      if (updated) setSelectedSeat(updated);
    }
  }, [facilitySeats, selectedFacility]);

  // Login handler
  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    setLoginError(null);

    if (loginTab === "STUDENT") {
      if (!studentIdInput.trim() || !studentNameInput.trim()) {
        setLoginError("학번과 이름을 모두 입력해 주세요.");
        return;
      }
      if (studentIdInput.trim().length !== 8) {
        setLoginError("학번은 8자리 숫자로 입력해 주세요.");
        return;
      }

      const profile: Profile = {
        id: `student-${studentIdInput.trim()}`,
        university_id: studentIdInput.trim(),
        name: `${studentNameInput.trim()} (${getRandomDepartment()})`,
        role: "USER"
      };
      
      setCurrentUser(profile);
      setIsLoggedIn(true);
      setPerspective("STUDENT");
    } else {
      if (!adminCodeInput.trim()) {
        setLoginError("관리자 비밀코드를 입력해 주세요.");
        return;
      }

      const profile: Profile = {
        id: "admin-session-current",
        university_id: "ADM-9942",
        name: "이영희 사서관",
        role: "ADMIN"
      };

      setCurrentUser(profile);
      setIsLoggedIn(true);
      setPerspective("ADMIN");
    }
  };

  // Demo direct login helpers
  const loginAsDemoStudent = () => {
    const profile: Profile = {
      id: "user-student-current",
      university_id: "20222043",
      name: "강민성 (전자공학과)",
      role: "USER"
    };
    setCurrentUser(profile);
    setIsLoggedIn(true);
    setPerspective("STUDENT");
  };

  const loginAsDemoAdmin = () => {
    const profile: Profile = {
      id: "user-admin-current",
      university_id: "ADM-9942",
      name: "이영희 사서관",
      role: "ADMIN"
    };
    setCurrentUser(profile);
    setIsLoggedIn(true);
    setPerspective("ADMIN");
  };

  const handleLogout = () => {
    setIsLoggedIn(false);
    setCurrentUser(null);
    setSelectedFacility(null);
    setSelectedSeat(null);
    setStudentIdInput("");
    setStudentNameInput("");
    setAdminCodeInput("");
    setLoginError(null);
    resetFilters();
  };

  const resetFilters = () => {
    setSearchKeyword("");
    setSearchBuilding("ALL");
    setSearchCapacity("");
    setFacilityFilter("ALL");
  };

  // Helper for random mock departments
  const getRandomDepartment = () => {
    const depts = ["전자공학과", "컴퓨터공학과", "정보통신학과", "기계공학과", "경영학과", "문헌정보학과"];
    return depts[Math.floor(Math.random() * depts.length)];
  };

  // Student Actions: Book Seat
  const handleReserveSeat = (seatId: number) => {
    if (!currentUser) return;
    setSeats((prev) =>
      prev.map((s) =>
        s.id === seatId
          ? {
              ...s,
              status: "OCCUPIED",
              current_user_id: currentUser.id,
              current_user_name: `${currentUser.name}`,
              current_reservation_id: Math.floor(Math.random() * 1000)
            }
          : s
      )
    );
  };

  // Student Actions: Checkout/Release Seat
  const handleCheckoutSeat = () => {
    if (!currentUser) return;
    
    const reservedFacId = Object.keys(facilitySeats).find(facId => {
      return facilitySeats[facId]?.some(s => s.current_user_id === currentUser.id);
    });

    if (!reservedFacId) return;

    setFacilitySeats(prev => {
      const nextMap = { ...prev };
      nextMap[reservedFacId] = nextMap[reservedFacId].map(s => 
        s.current_user_id === currentUser.id
          ? {
              ...s,
              status: "AVAILABLE",
              current_user_id: undefined,
              current_user_name: undefined,
              current_reservation_id: undefined
            }
          : s
      );
      return nextMap;
    });

    const activeStudentSeat = facilitySeats[reservedFacId]?.find(s => s.current_user_id === currentUser.id);
    if (activeStudentSeat) {
      setAbsenceReports((prev) =>
        prev.map((r) =>
          r.seat_id === activeStudentSeat.id ? { ...r, status: "RESOLVED_RETURNED" } : r
        )
      );
    }
    setShowWarningModal(false);
  };

  // Student Actions: Confirm Return (Resets warning)
  const handleConfirmReturn = () => {
    if (!currentUser) return;
    
    const reservedFacId = Object.keys(facilitySeats).find(facId => {
      return facilitySeats[facId]?.some(s => s.current_user_id === currentUser.id);
    });

    if (!reservedFacId) return;

    const myReservedSeat = facilitySeats[reservedFacId]?.find(s => s.current_user_id === currentUser.id);
    if (!myReservedSeat) return;

    setFacilitySeats(prev => {
      const nextMap = { ...prev };
      nextMap[reservedFacId] = nextMap[reservedFacId].map(s => 
        s.current_user_id === currentUser.id
          ? {
              ...s,
              status: "OCCUPIED"
            }
          : s
      );
      return nextMap;
    });

    setAbsenceReports((prev) =>
      prev.map((r) =>
        r.seat_id === myReservedSeat.id && r.status === "PENDING"
          ? { ...r, status: "RESOLVED_RETURNED", warning_timer_seconds: undefined }
          : r
      )
    );
    setShowWarningModal(false);
  };

  // Student Actions: 1st Absence Report
  const handleReportAbsence1st = (seatId: number, photoUrl: string) => {
    if (!currentUser) return;
    setSeats((prev) =>
      prev.map((s) => (s.id === seatId ? { ...s, status: "REPORTED_1ST" } : s))
    );

    const newReport: AbsenceReport = {
      id: absenceReports.length + 1,
      seat_id: seatId,
      reporter_id: currentUser.id,
      first_photo_url: photoUrl,
      first_reported_at: new Date().toISOString(),
      warning_timer_seconds: 1800,
      status: "PENDING"
    };

    setAbsenceReports((prev) => [...prev, newReport]);
  };

  // Student Actions: 2nd Absence Report
  const handleReportAbsence2nd = (seatId: number, photoUrl: string) => {
    setSeats((prev) =>
      prev.map((s) => (s.id === seatId ? { ...s, status: "REPORTED_2ND" } : s))
    );

    setAbsenceReports((prev) =>
      prev.map((r) =>
        r.seat_id === seatId && r.status === "PENDING"
          ? {
              ...r,
              second_photo_url: photoUrl,
              second_reported_at: new Date().toISOString(),
              warning_timer_seconds: 0
            }
          : r
      )
    );
  };

  // Admin Actions: Immediate release
  const handleImmediateRelease = (seatId: number) => {
    if (!selectedFacility) return;
    const seat = activeSeats.find(s => s.id === seatId);
    if (!seat) return;

    if (currentUser && seat.current_user_id === currentUser.id) {
      setForcedCheckoutAlert({ show: true, seatNumber: seat.seat_number });
    }

    setSeats((prev) =>
      prev.map((s) =>
        s.id === seatId
          ? {
              ...s,
              status: "AVAILABLE",
              current_user_id: undefined,
              current_user_name: undefined,
              current_reservation_id: undefined
            }
          : s
      )
    );

    setAbsenceReports((prev) =>
      prev.map((r) =>
        r.seat_id === seatId && r.status === "PENDING"
          ? { ...r, status: "RESOLVED_RELEASED", resolved_at: new Date().toISOString() }
          : r
      )
    );
  };

  // Admin Actions: Delayed release
  const handleDelayedRelease = (seatId: number) => {
    if (!selectedFacility) return;
    const seat = activeSeats.find(s => s.id === seatId);
    if (!seat) return;

    if (currentUser && seat.current_user_id === currentUser.id) {
      setForcedCheckoutAlert({ show: true, seatNumber: seat.seat_number });
    }

    setSeats((prev) =>
      prev.map((s) =>
        s.id === seatId
          ? {
              ...s,
              status: "CLEARING",
              clearing_timer_seconds: 600
            }
          : s
      )
    );

    setAbsenceReports((prev) =>
      prev.map((r) =>
        r.seat_id === seatId && r.status === "PENDING"
          ? { ...r, status: "RESOLVED_RELEASED", resolved_at: new Date().toISOString() }
          : r
      )
    );
  };

  // ----------------------------------------------------
  // RENDER: Welcome & Login Screen (if not logged in)
  // ----------------------------------------------------
  if (!isLoggedIn || !currentUser) {
    return (
      <div className="min-h-screen flex flex-col justify-between bg-gradient-to-br from-emerald-50 via-lime-50/20 to-white text-slate-800 animate-gradient-x">
        <header className="w-full py-4 px-6 flex justify-between items-center border-b border-slate-200/50 bg-white/40 backdrop-blur-xs">
          <div className="flex items-center space-x-2">
            <img src="/logo.png" alt="Daegu University Logo" className="h-8 w-8 object-contain" />
            <span className="font-bold text-slate-800 text-sm tracking-tight">대구대학교 스마트 예약</span>
          </div>
          <span className="text-[10px] text-emerald-700 bg-emerald-100/50 px-2 py-0.5 rounded border border-emerald-200 font-bold uppercase tracking-widest font-mono">
            Portal v2.6
          </span>
        </header>

        <main className="flex-grow flex items-center justify-center p-4">
          <div className="w-full max-w-md bg-white/80 backdrop-blur-md rounded-3xl border border-slate-200/70 p-8 shadow-2xl shadow-emerald-950/5 animate-fade-in-up">
            <div className="text-center mb-8">
              <div className="inline-block p-3.5 bg-white rounded-full shadow-md border border-slate-100 mb-4 transition-transform hover:scale-105 duration-300">
                <img src="/logo.png" alt="Daegu University Logo" className="h-20 w-20 object-contain" />
              </div>
              <h2 className="text-xl font-extrabold text-slate-900 tracking-tight">
                스마트 시설 예약 시스템
              </h2>
              <p className="text-xs text-slate-500 mt-1.5 leading-relaxed">
                대구대학교 중앙도서관 및 단과대학 열람실의 실시간 예약 및<br />
                장기 부재 방지를 위한 통합 스마트 관리 포털입니다.
              </p>
            </div>

            <div className="flex bg-slate-100 p-1 rounded-xl border border-slate-200 mb-6">
              <button
                type="button"
                onClick={() => {
                  setLoginTab("STUDENT");
                  setLoginError(null);
                }}
                className={`flex-1 py-2 rounded-lg text-xs font-bold transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
                  loginTab === "STUDENT"
                    ? "bg-emerald-600 text-white shadow-xs"
                    : "text-slate-500 hover:text-slate-800"
                }`}
              >
                <GraduationCap className="h-4 w-4" />
                <span>학생 로그인</span>
              </button>
              <button
                type="button"
                onClick={() => {
                  setLoginTab("ADMIN");
                  setLoginError(null);
                }}
                className={`flex-1 py-2 rounded-lg text-xs font-bold transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
                  loginTab === "ADMIN"
                    ? "bg-emerald-700 text-white shadow-xs"
                    : "text-slate-500 hover:text-slate-800"
                }`}
              >
                <ShieldCheck className="h-4 w-4" />
                <span>관리자 로그인</span>
              </button>
            </div>

            {loginError && (
              <div className="mb-4 p-3 bg-red-50 border border-red-200 text-xs font-semibold text-red-700 rounded-xl flex items-center gap-2">
                <AlertTriangle className="h-4 w-4 text-red-500 flex-shrink-0" />
                <span>{loginError}</span>
              </div>
            )}

            <form onSubmit={handleLogin} className="space-y-4">
              {loginTab === "STUDENT" ? (
                <>
                  <div className="space-y-1">
                    <label className="text-[10px] uppercase font-bold text-slate-500 tracking-wider">학번 (8자리)</label>
                    <div className="relative">
                      <User className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                      <input
                        type="text"
                        maxLength={8}
                        value={studentIdInput}
                        onChange={(e) => setStudentIdInput(e.target.value.replace(/[^0-9]/g, ""))}
                        placeholder="예: 20222043"
                        className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:bg-white focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20 outline-none transition-all"
                      />
                    </div>
                  </div>
                  <div className="space-y-1">
                    <label className="text-[10px] uppercase font-bold text-slate-500 tracking-wider">성명</label>
                    <div className="relative">
                      <Sparkles className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                      <input
                        type="text"
                        value={studentNameInput}
                        onChange={(e) => setStudentNameInput(e.target.value)}
                        placeholder="성함 입력"
                        className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:bg-white focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20 outline-none transition-all"
                      />
                    </div>
                  </div>
                </>
              ) : (
                <div className="space-y-1">
                  <label className="text-[10px] uppercase font-bold text-slate-500 tracking-wider">관리자 액세스 코드</label>
                  <div className="relative">
                    <Key className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                    <input
                      type="password"
                      value={adminCodeInput}
                      onChange={(e) => setAdminCodeInput(e.target.value)}
                      placeholder="비밀코드 입력 (데모용 자유 입력 가능)"
                      className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:bg-white focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20 outline-none transition-all"
                    />
                  </div>
                </div>
              )}

              <button
                type="submit"
                className="w-full py-3 mt-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl font-bold text-sm shadow-lg shadow-emerald-700/10 transition-all active:scale-[0.98] cursor-pointer flex items-center justify-center gap-1.5"
              >
                <span>시작하기</span>
                <ArrowRight className="h-4 w-4" />
              </button>
            </form>

            <div className="mt-8 pt-6 border-t border-slate-200/60 text-center">
              <span className="text-[10px] text-slate-400 uppercase tracking-widest font-bold block mb-3">
                편리한 테스트를 위한 원클릭 계정
              </span>
              <div className="flex gap-2.5">
                <button
                  type="button"
                  onClick={loginAsDemoStudent}
                  className="flex-1 py-2 px-3 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 rounded-xl border border-emerald-100 text-xs font-bold transition-all cursor-pointer"
                >
                  학생 데모 로그인
                </button>
                <button
                  type="button"
                  onClick={loginAsDemoAdmin}
                  className="flex-1 py-2 px-3 bg-slate-50 hover:bg-slate-100 text-slate-700 rounded-xl border border-slate-200 text-xs font-bold transition-all cursor-pointer"
                >
                  관리자 데모 로그인
                </button>
              </div>
            </div>
          </div>
        </main>

        <footer className="w-full py-4 text-center text-[10px] text-slate-400 border-t border-slate-250/30 bg-white/20">
          <p>© 2026 Daegu University. Smart Facility Reservation System. All rights reserved.</p>
        </footer>
      </div>
    );
  }

  // ----------------------------------------------------
  // RENDER: 통합 메인 포털 사이트 (상세 검색 + 카테고리 필터 + 전체 시설)
  // ----------------------------------------------------
  if (selectedFacility === null) {
    // 복합 쿼리 필터링 알고리즘
    const filteredFacilities = FACILITIES.filter(fac => {
      // 1. 건물 필터
      if (searchBuilding !== "ALL") {
        if (!fac.buildingName.includes(searchBuilding)) return false;
      }

      // 2. 카테고리 버튼 필터
      if (facilityFilter !== "ALL") {
        if (facilityFilter === "STUDY" && fac.category !== "STUDY") return false;
        if (facilityFilter === "SEMINAR" && fac.category !== "SEMINAR") return false;
        if (facilityFilter === "PC" && fac.category !== "PC") return false;
        if (facilityFilter === "LIBRARY" && fac.category !== "LIBRARY") return false;
        if (facilityFilter === "CHANGPA" && fac.collegeId !== "library") return false;
      }

      // 3. 키워드 검색
      if (searchKeyword.trim() !== "") {
        const keyword = searchKeyword.toLowerCase();
        const nameMatch = fac.name.toLowerCase().includes(keyword);
        const descMatch = fac.description.toLowerCase().includes(keyword);
        const tagMatch = fac.tags.some(t => t.toLowerCase().includes(keyword));
        const buildingMatch = fac.buildingName.toLowerCase().includes(keyword);
        if (!nameMatch && !descMatch && !tagMatch && !buildingMatch) return false;
      }

      // 4. 최소 수용 인원 필터
      if (searchCapacity.trim() !== "" && !isNaN(Number(searchCapacity))) {
        if (fac.capacity < Number(searchCapacity)) return false;
      }

      return true;
    });

    return (
      <div className="min-h-screen flex flex-col justify-between bg-gradient-to-br from-emerald-50 via-lime-50/20 to-white text-slate-800 animate-gradient-x">
        {/* Navbar */}
        <header className="sticky top-0 z-40 bg-white/80 border-b border-slate-200/50 backdrop-blur-md shadow-xs">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <div className="bg-emerald-600 p-2 rounded-xl text-white flex items-center justify-center shadow-lg shadow-emerald-700/20">
                <Building2 className="h-5 w-5" />
              </div>
              <div>
                <h1 className="text-sm sm:text-base font-bold tracking-tight text-slate-900 leading-none">DU-Smart Reservation</h1>
                <p className="text-[9px] text-emerald-650 font-bold uppercase tracking-widest mt-0.5 leading-none">대구대 스마트 예약 포털</p>
              </div>
            </div>

            <div className="flex items-center space-x-3">
              <div className="text-xs border-r border-slate-200 pr-3 hidden sm:flex items-center space-x-2">
                <span className="text-slate-400 font-mono">접속자:</span>
                <span className="font-bold text-slate-700">{currentUser.name}</span>
                <span className="bg-emerald-50 text-emerald-700 border border-emerald-100 rounded px-1.5 py-0.5 text-[9px] font-bold">
                  {currentUser.role === "ADMIN" ? "사서관" : "학부생"}
                </span>
              </div>
              <button
                onClick={handleLogout}
                className="flex items-center justify-center p-2 rounded-xl border border-slate-200 bg-white hover:bg-red-50 hover:border-red-200 text-slate-500 hover:text-red-655 transition-all cursor-pointer shadow-2xs"
                title="로그아웃"
              >
                <LogOut className="h-4.5 w-4.5" />
              </button>
            </div>
          </div>
        </header>

        {/* 메인 통합 영역 */}
        <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 mt-10 mb-16 flex-grow w-full">
          
          {/* 대구대학교 스마트 교내 공간 예약 웅장한 배너 */}
          <div className="mb-8 rounded-3xl bg-gradient-to-r from-emerald-800 to-emerald-950 p-8 text-white shadow-xl relative overflow-hidden">
            <div className="absolute inset-0 bg-gradient-to-br from-lime-500/10 to-transparent pointer-events-none" />
            <div className="relative z-10 max-w-2xl space-y-2">
              <span className="px-2.5 py-1 text-[9px] font-extrabold uppercase tracking-widest bg-emerald-700/50 border border-emerald-500/30 rounded-md inline-block text-emerald-300">
                Du-Smart Facility System
              </span>
              <h2 className="text-2xl sm:text-3xl font-black tracking-tight text-white leading-tight">
                대구대학교 스마트 교내 공간 예약
              </h2>
              <p className="text-xs sm:text-sm text-slate-300 leading-relaxed font-medium">
                웅지관, 경상관, 종합정보센터 등 교내 주요 학업 및 스터디룸 시설을 실시간으로 확인하고 빠르게 대여해 보세요.
              </p>
            </div>
            
            {/* 통계 상태 배지 데코 */}
            <div className="absolute right-8 bottom-8 hidden md:flex items-center gap-4">
              <div className="bg-white/10 backdrop-blur-xs border border-white/10 px-4 py-2.5 rounded-2xl text-center">
                <span className="text-[10px] text-emerald-200 font-bold block leading-none">대여 가능 시설</span>
                <span className="text-xl font-bold font-mono mt-1 block">24개</span>
              </div>
              <div className="bg-white/10 backdrop-blur-xs border border-white/10 px-4 py-2.5 rounded-2xl text-center">
                <span className="text-[10px] text-amber-300 font-bold block leading-none">즉시 확정 공간</span>
                <span className="text-xl font-bold font-mono mt-1 block">17개</span>
              </div>
            </div>
          </div>

          {/* 2단 분할 레이아웃 그리드 */}
          <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
            
            {/* 좌측: 시설 상세 검색 사이드바 */}
            <div className="lg:col-span-1 bg-white border border-slate-200 rounded-2xl p-6 shadow-xs h-fit space-y-6 animate-fade-in-up">
              <div className="border-b border-slate-150 pb-3 flex justify-between items-center">
                <h3 className="text-sm font-bold text-slate-900 flex items-center gap-1.5">
                  <Building2 className="h-4.5 w-4.5 text-emerald-600" />
                  <span>시설 상세 검색</span>
                </h3>
                <button
                  onClick={resetFilters}
                  className="text-[10px] text-slate-400 hover:text-emerald-650 font-bold transition-all cursor-pointer"
                >
                  필터 초기화
                </button>
              </div>

              {/* 1. 키워드 검색 */}
              <div className="space-y-1.5">
                <label className="text-[10px] uppercase font-bold text-slate-500 tracking-wider">시설명 / 위치 키워드</label>
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                  <input
                    type="text"
                    value={searchKeyword}
                    onChange={(e) => setSearchKeyword(e.target.value)}
                    placeholder="예: 웅지관, 스터디룸"
                    className="w-full pl-9 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:bg-white focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20 outline-none transition-all"
                  />
                </div>
              </div>

              {/* 2. 건물 필터 */}
              <div className="space-y-1.5">
                <label className="text-[10px] uppercase font-bold text-slate-500 tracking-wider">건물별 필터</label>
                <select
                  value={searchBuilding}
                  onChange={(e) => setSearchBuilding(e.target.value)}
                  className="w-full px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:bg-white focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20 outline-none transition-all cursor-pointer font-bold text-slate-750"
                >
                  <option value="ALL">전체 건물</option>
                  <option value="IT융합관">IT융합관 / 공학관</option>
                  <option value="사범관">사범관</option>
                  <option value="재활과학관">재활과학관</option>
                  <option value="경상관">경상관 (글로벌경영대)</option>
                  <option value="법정관">법정관 (공공인재대)</option>
                  <option value="조형관">조형관 (디자인예술대)</option>
                  <option value="중앙도서관">중앙도서관 (창파도서관)</option>
                </select>
              </div>

              {/* 3. 최소 수용 인원 */}
              <div className="space-y-1.5">
                <label className="text-[10px] uppercase font-bold text-slate-500 tracking-wider">최소 수용 인원</label>
                <input
                  type="text"
                  value={searchCapacity}
                  onChange={(e) => setSearchCapacity(e.target.value.replace(/[^0-9]/g, ""))}
                  placeholder="예: 4 (명)"
                  className="w-full px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:bg-white focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20 outline-none transition-all font-bold"
                />
              </div>

              <p className="text-[10px] text-slate-400 leading-normal">
                💡 검색 필터값을 조절하는 즉시, 우측 카드 목록이 실시간으로 동기화되어 예약 가능한 최적의 공간을 매칭합니다.
              </p>
            </div>

            {/* 우측: 카테고리 툴바 및 카드 리스트 */}
            <div className="lg:col-span-3 space-y-6">
              
              {/* 카테고리 버튼 필터 툴바 */}
              <div className="flex bg-white p-1 rounded-xl border border-slate-200/80 shadow-2xs w-fit">
                {[
                  { label: "전체", key: "ALL" },
                  { label: "창파도서관", key: "CHANGPA" },
                  { label: "스터디룸", key: "STUDY" },
                  { label: "세미나실", key: "SEMINAR" },
                  { label: "PC실/실습실", key: "PC" },
                  { label: "자율열람실", key: "LIBRARY" }
                ].map((btn) => (
                  <button
                    key={btn.key}
                    onClick={() => setFacilityFilter(btn.key as any)}
                    className={`px-4 py-2 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                      facilityFilter === btn.key
                        ? "bg-emerald-600 text-white shadow-xs"
                        : "text-slate-500 hover:text-slate-800"
                    }`}
                  >
                    {btn.label}
                  </button>
                ))}
              </div>

              {/* 시설 카드 그리드 */}
              {filteredFacilities.length > 0 ? (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 animate-fade-in-up">
                  {filteredFacilities.map((fac) => (
                    <div
                      key={fac.id}
                      className="bg-white border border-slate-200/80 rounded-2xl overflow-hidden shadow-xs hover:shadow-md hover:border-emerald-300 transition-all duration-300 flex flex-col justify-between"
                    >
                      {/* Card Upper: Mock Image Visual & Badge */}
                      <div className="relative aspect-video w-full bg-slate-900 overflow-hidden flex items-center justify-center border-b border-slate-100">
                        <div className="absolute inset-0 bg-gradient-to-br from-emerald-800/10 via-lime-500/5 to-slate-900 pointer-events-none" />
                        <div className="z-10 text-center p-4">
                          {fac.category === "STUDY" && <Users className="h-10 w-10 text-emerald-400/80 mx-auto mb-2" />}
                          {fac.category === "SEMINAR" && <Building2 className="h-10 w-10 text-blue-400/80 mx-auto mb-2" />}
                          {fac.category === "PC" && <Laptop className="h-10 w-10 text-cyan-400/80 mx-auto mb-2" />}
                          {fac.category === "LIBRARY" && <BookOpen className="h-10 w-10 text-yellow-400/80 mx-auto mb-2" />}
                          <span className="text-[10px] text-slate-400 uppercase tracking-widest font-mono block">ROOM CODE: {fac.id.toUpperCase()}</span>
                        </div>

                        <div className="absolute top-3 right-3">
                          <span className="bg-emerald-500 text-white text-[10px] font-bold px-2 py-0.5 rounded-full border border-emerald-400 shadow-xs">
                            예약가능
                          </span>
                        </div>

                        <div className="absolute top-3 left-3">
                          <span className={`text-[10px] font-bold px-2 py-0.5 rounded-md shadow-xs ${
                            fac.instantConfirm 
                              ? "bg-emerald-600 text-white border border-emerald-500" 
                              : "bg-amber-500 text-white border border-amber-400"
                          }`}>
                            {fac.instantConfirm ? "즉시 확정" : "승인 필요"}
                          </span>
                        </div>

                        <div className="absolute bottom-3 left-3">
                          <span className="bg-slate-900/60 backdrop-blur-xs text-white text-[10px] px-2.5 py-1 rounded-lg">
                            📍 {fac.buildingName}
                          </span>
                        </div>
                      </div>

                      {/* Card Body */}
                      <div className="p-6 flex-grow flex flex-col justify-between space-y-4">
                        <div className="space-y-1">
                          <h3 className="text-base font-extrabold text-slate-900">
                            {fac.name}
                          </h3>
                          <p className="text-xs text-slate-500 leading-relaxed min-h-[32px] line-clamp-2">
                            {fac.description}
                          </p>
                        </div>

                        {/* Tags & Capacity */}
                        <div className="space-y-3 pt-3 border-t border-slate-100">
                          <div className="flex flex-wrap gap-1.5">
                            {fac.tags.map((tag, tIdx) => (
                              <span
                                key={tIdx}
                                className="bg-slate-50 text-slate-500 hover:text-emerald-700 hover:bg-emerald-50/50 border border-slate-200/80 px-2 py-0.5 rounded text-[10px] font-semibold transition-all cursor-default"
                              >
                                #{tag}
                              </span>
                            ))}
                          </div>

                          <div className="flex items-center justify-between text-xs text-slate-500">
                            <span className="flex items-center gap-1">
                              <Users className="h-3.5 w-3.5 text-slate-400" />
                              <span>정원: <strong>{fac.capacity}명</strong></span>
                            </span>
                            
                            <button
                              onClick={() => setSelectedFacility(fac)}
                              className="bg-emerald-600 hover:bg-emerald-500 text-white px-4 py-1.5 rounded-xl font-bold text-xs shadow-md shadow-emerald-700/10 transition-all hover:scale-[1.02] active:scale-[0.98] cursor-pointer flex items-center gap-1"
                            >
                              <span>자세히 보기 & 예약</span>
                              <ArrowRight className="h-3 w-3" />
                            </button>
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="py-20 text-center border border-dashed border-slate-250 rounded-2xl bg-white space-y-4 animate-fade-in-up">
                  <HelpCircle className="h-12 w-12 text-slate-350 mx-auto animate-bounce-short" />
                  <div className="space-y-1">
                    <h3 className="text-base font-bold text-slate-500">조건에 부합하는 교내 시설이 없습니다.</h3>
                    <p className="text-xs text-slate-400">상세 검색 조건(건물, 수용인원, 키워드)을 조절하여 재검색해 주십시오.</p>
                  </div>
                  <button
                    onClick={resetFilters}
                    className="bg-emerald-600 hover:bg-emerald-500 text-white px-4 py-2 rounded-xl text-xs font-bold shadow-md cursor-pointer transition-all active:scale-95"
                  >
                    검색 조건 초기화
                  </button>
                </div>
              )}
            </div>
          </div>
        </main>

        {/* Footer */}
        <footer className="w-full py-6 text-center text-xs text-slate-400 border-t border-slate-200/50 bg-white">
          <p>© 2026 Daegu University. Smart Facility Reservation System. All rights reserved.</p>
        </footer>
      </div>
    );
  }

  // ----------------------------------------------------
  // RENDER: Core Portal Screen (when facility is selected) (3단계)
  // ----------------------------------------------------
  return (
    <div className="flex-grow flex flex-col min-h-screen bg-slate-50 text-slate-800 pb-16">
      {/* Top Navbar */}
      <header className="sticky top-0 z-40 bg-white/90 border-b border-slate-200 backdrop-blur-md shadow-xs">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="bg-emerald-600 p-1.5 rounded-lg text-white flex items-center justify-center shadow-lg shadow-emerald-700/20">
              <img src="/logo.png" alt="Daegu University Logo" className="h-6 w-6 object-contain invert brightness-200" />
            </div>
            <div>
              <h1 className="text-base sm:text-lg font-bold tracking-tight text-slate-900 flex items-center gap-1.5 leading-none">
                <span>Du-Reserve</span>
              </h1>
              <p className="text-[9px] text-emerald-655 font-bold uppercase tracking-wider mt-0.5">대구대 스마트 열람실</p>
            </div>
          </div>

          {/* Perspective switcher / session info tab */}
          <div className="flex items-center space-x-3 sm:space-x-4">
            <div className="hidden md:flex items-center space-x-2 text-xs border-r border-slate-200 pr-4">
              <span className="text-slate-400 font-mono">접속자:</span>
              <span className="font-bold text-slate-700">{currentUser.name}</span>
              <span className="bg-emerald-50 text-emerald-700 border border-emerald-100 rounded px-1.5 py-0.5 font-bold text-[10px]">
                {currentUser.role === "ADMIN" ? "사서관" : "학부생"}
              </span>
            </div>

            {/* 메인 화면 복귀 버튼 */}
            <button
              onClick={() => {
                setSelectedFacility(null);
                setSelectedSeat(null);
              }}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 text-xs font-bold transition-all shadow-2xs cursor-pointer"
            >
              <Building2 className="h-3.5 w-3.5 text-emerald-600" />
              <span>메인 화면 복귀</span>
            </button>

            {/* Quick switcher (visible for demo) */}
            <div className="flex bg-slate-100 p-1 rounded-xl border border-slate-200">
              <button
                onClick={() => {
                  setPerspective("STUDENT");
                  setSelectedSeat(null);
                }}
                className={`flex items-center space-x-1.5 px-3 py-1.5 rounded-lg text-[11px] font-bold transition-all ${
                  perspective === "STUDENT"
                    ? "bg-emerald-600 text-white shadow-sm"
                    : "text-slate-500 hover:text-slate-800"
                }`}
              >
                <GraduationCap className="h-3.5 w-3.5" />
                <span className="hidden sm:inline">학생 화면</span>
              </button>
              <button
                onClick={() => {
                  setPerspective("ADMIN");
                  setSelectedSeat(null);
                }}
                className={`flex items-center space-x-1.5 px-3 py-1.5 rounded-lg text-[11px] font-bold transition-all ${
                  perspective === "ADMIN"
                    ? "bg-emerald-700 text-white shadow-sm"
                    : "text-slate-500 hover:text-slate-800"
                }`}
              >
                <ShieldCheck className="h-3.5 w-3.5" />
                <span className="hidden sm:inline">관리자 화면</span>
              </button>
            </div>

            {/* Logout Button */}
            <button
              onClick={handleLogout}
              className="flex items-center justify-center p-2 rounded-xl border border-slate-200 bg-white hover:bg-red-50 hover:border-red-200 text-slate-500 hover:text-red-655 transition-all cursor-pointer shadow-2xs"
              title="로그아웃"
            >
              <LogOut className="h-4 w-4" />
            </button>
          </div>
        </div>
      </header>

      {/* Main container */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 mt-8 flex-grow w-full">
        {/* Banner info */}
        <div className="mb-6 flex flex-col md:flex-row justify-between items-start md:items-center gap-4 bg-gradient-to-r from-emerald-50 via-lime-50/40 to-transparent border border-emerald-500/10 rounded-2xl p-6 shadow-xs">
          <div className="space-y-1">
            <h2 className="text-lg font-bold text-slate-850">
              {selectedFacility.name} ({selectedFacility.buildingName}) - {perspective === "STUDENT" ? "좌석 예약" : "중앙 관제"}
            </h2>
            <p className="text-xs text-slate-500 max-w-2xl leading-normal">
              {perspective === "STUDENT"
                ? `선택된 공간은 ${selectedFacility.name} 입니다. 도면에서 좌석을 선택하여 예약을 실행하세요. 장기 공석 발생 시 사진 증빙으로 퇴실 신고를 접수할 수 있습니다.`
                : `현재 ${selectedFacility.roomName}의 실시간 장기 미사용 신고 현황을 대조 검증하고, 강제 퇴실 명령을 명령합니다.`}
            </p>
          </div>
          <div className="flex flex-wrap gap-1 items-center">
            {selectedFacility.tags.map((tag, idx) => (
              <span key={idx} className="bg-white text-emerald-700 border border-slate-200 shadow-2xs rounded px-2.5 py-0.5 text-[9px] font-semibold">
                #{tag}
              </span>
            ))}
          </div>
        </div>

        {/* Dynamic components */}
        {perspective === "STUDENT" ? (
          <div className="space-y-8">
            <UserDashboard
              user={currentUser}
              selectedSeat={selectedSeat}
              userReservation={myReservation}
              absenceReports={absenceReports}
              onReserve={handleReserveSeat}
              onCheckout={handleCheckoutSeat}
              onConfirmReturn={handleConfirmReturn}
              onReportAbsence1st={handleReportAbsence1st}
              onReportAbsence2nd={handleReportAbsence2nd}
              timerSpeedUp={timerSpeedUp}
              setTimerSpeedUp={setTimerSpeedUp}
              selectedFacility={selectedFacility}
            />

            <div className="bg-white border border-slate-200 shadow-xs rounded-2xl p-6">
              <SeatMap
                seats={activeSeats}
                onSelectSeat={setSelectedSeat}
                selectedSeatId={selectedSeat?.id || null}
                userReservationSeatId={myReservation?.id || null}
                selectedFacility={selectedFacility}
              />
            </div>
          </div>
        ) : (
          <div className="space-y-8">
            <AdminPanel
              adminUser={currentUser}
              seats={activeSeats}
              absenceReports={absenceReports}
              onImmediateRelease={handleImmediateRelease}
              onDelayedRelease={handleDelayedRelease}
            />
          </div>
        )}
      </main>

      {/* Footer */}
      <footer className="mt-16 border-t border-slate-200 py-6 text-center text-xs text-slate-500 bg-white">
        <div className="max-w-7xl mx-auto px-4 flex flex-col sm:flex-row items-center justify-between gap-4">
          <p>© 2026 Daegu University. Smart Facility Reservation System. All rights reserved.</p>
          <div className="flex items-center space-x-4">
            <span className="flex items-center gap-1 text-[11px] text-slate-500">
              <svg className="h-3.5 w-3.5 text-slate-500" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M15 22v-4a4.8 4.8 0 0 0-1-3.5c3 0 6-2 6-5.5.08-1.25-.27-2.48-1-3.5.28-1.15.28-2.35 0-3.5 0 0-1 0-3 1.5-2.64-.5-5.36-.5-8 0C6 2 5 2 5 2c-.3 1.15-.3 2.35 0 3.5A5.403 5.403 0 0 0 4 9c0 3.5 3 5.5 6 5.5-.39.49-.68 1.05-.85 1.65-.17.6-.22 1.23-.15 1.85v4" /><path d="M9 18c-4.51 2-5-2-7-2" /></svg>
              <span>kiaman0700/du-reserve</span>
            </span>
          </div>
        </div>
      </footer>

      {/* Warning popup */}
      {showWarningModal && activeStudentWarning && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 p-4 backdrop-blur-xs">
          <div className="w-full max-w-md overflow-hidden rounded-2xl border border-amber-200 bg-white shadow-2xl animate-bounce-short">
            <div className="bg-amber-50 border-b border-amber-200 px-6 py-4 flex items-center gap-3 text-amber-600">
              <AlertTriangle className="h-6 w-6 animate-pulse" />
              <h3 className="font-bold text-slate-800">장기 부재 경고 안내 (1차 접수)</h3>
            </div>
            
            <div className="p-6 space-y-4">
              <div className="bg-amber-50/50 border border-amber-200 p-4 rounded-xl text-xs text-amber-800 leading-relaxed font-semibold">
                ⚠️ 장기 부재 신고가 접수되었습니다. 30분 이내에 좌석으로 복귀하여 [복귀 확인] 버튼을 누르지 않으면 담당자에 의해 강제 퇴실 조치 및 좌석이 초기화될 수 있습니다.
              </div>

              <div className="flex items-center justify-between bg-slate-50 p-3 rounded-lg border border-slate-200 text-xs">
                <span className="text-slate-600 flex items-center gap-1">
                  <Clock className="h-3.5 w-3.5 text-amber-500" /> 복귀 유예 남은 시간:
                </span>
                <span className="font-mono text-sm font-bold text-amber-600">
                  {activeStudentWarning.warning_timer_seconds !== undefined && activeStudentWarning.warning_timer_seconds > 0 ? (
                    `${Math.floor(activeStudentWarning.warning_timer_seconds / 60)}분 ${activeStudentWarning.warning_timer_seconds % 60}초`
                  ) : (
                    "시간 초과! 2차 최종 촬영 접수 대기 상태"
                  )}
                </span>
              </div>
            </div>

            <div className="bg-slate-50 px-6 py-4 flex justify-end border-t border-slate-200">
              <button
                onClick={handleConfirmReturn}
                className="bg-emerald-600 hover:bg-emerald-500 text-white px-5 py-2 rounded-xl text-sm font-bold shadow-md shadow-emerald-900/10 transition-all active:scale-95 cursor-pointer"
              >
                자리 복귀 확인 (신고 리셋)
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Forced checkout popup */}
      {forcedCheckoutAlert.show && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 p-4 backdrop-blur-xs animate-fade-in">
          <div className="w-full max-w-md overflow-hidden rounded-2xl border border-red-200 bg-white shadow-2xl">
            <div className="bg-red-50 border-b border-red-200 px-6 py-4 flex items-center gap-3 text-red-655">
              <AlertTriangle className="h-6 w-6 animate-pulse" />
              <h3 className="font-bold text-slate-800">좌석 강제 퇴실 처분 고지</h3>
            </div>
            
            <div className="p-6 space-y-3">
              <p className="text-sm font-bold text-slate-700">
                대상: {forcedCheckoutAlert.seatNumber}번 좌석
              </p>
              <div className="bg-red-50 border border-red-200 p-4 rounded-xl text-xs text-red-800 leading-relaxed font-semibold">
                🚨 장기 부재 신고 누적으로 인해 해당 좌석이 강제 퇴실 처리되었습니다. 방치되어 있던 개인 물품은 현장 점검 후 [도서관 1층 안내 데스크 / 관리실]로 이동 보관되었습니다. 물품을 찾으러 해당 장소로 방문해 주시기 바랍니다.
              </div>
            </div>

            <div className="bg-slate-50 px-6 py-4 flex justify-end border-t border-slate-200">
              <button
                onClick={() => setForcedCheckoutAlert({ show: false, seatNumber: 0 })}
                className="bg-red-655 hover:bg-red-500 text-white px-5 py-2 rounded-xl text-sm font-bold shadow-md shadow-red-900/10 transition-all active:scale-95 cursor-pointer"
              >
                확인 및 닫기
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
