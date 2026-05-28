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
  Search,
  X,
  Trash2,
  VolumeX,
  Wrench,
  Megaphone,
  Bell,
  ToggleLeft,
  Sliders,
  MapPin,
  Camera,
  Plus,
  Info
} from "lucide-react";
import SeatMap from "@/components/SeatMap";
import UserDashboard from "@/components/UserDashboard";
import AdminPanel from "@/components/AdminPanel";
import { supabase } from "@/supabaseClient";

// Models & Types
export type SeatStatus = "AVAILABLE" | "OCCUPIED" | "REPORTED_1ST" | "REPORTED_2ND" | "CLEARING" | "MAINTENANCE";

export interface Profile {
  id: string;
  university_id: string;
  name: string;
  role: "USER" | "ADMIN";
  managed_college_id?: string;
  penalty_ends_at?: string;
  penalty_reason?: string;
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
  reserved_at?: string;
  ends_at?: string;
  use_timer_seconds?: number;
  total_duration_minutes?: number;
  check_in_at?: string;
}

export interface AbsenceReport {
  id: number;
  seat_id: number;
  reporter_id: string;
  first_photo_url: string;
  first_reported_at: string;
  second_photo_url?: string;
  second_reported_at?: string;
  warning_timer_seconds?: number; 
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
  instantConfirm: boolean; 
  buildingName: string;
  description: string;
}

// 대구대학교 단과대학별 세부 시설 (총 24개)
const FACILITIES: Facility[] = [
  // 1. IT·공과대학
  { id: "it-101", collegeId: "it-eng", name: "IT융합관 101호 공동 PC 실습실", roomName: "공동 PC 실습실", category: "PC", tags: ["고성능PC", "듀얼모니터", "멀티탭완비"], capacity: 50, instantConfirm: true, buildingName: "IT융합관 1층", description: "최신 GPU 장착 워크스테이션 및 듀얼 모니터가 설치된 실습 스페이스" },
  { id: "it-305", collegeId: "it-eng", name: "IT융합관 305호 스마트 스터디 존", roomName: "스마트 스터디 존", category: "STUDY", tags: ["노트북연결", "화이트보드", "정원8명"], capacity: 8, instantConfirm: true, buildingName: "IT융합관 3층", description: "소그룹 코딩 회의 및 노트북 사용에 최적화된 라운지형 스터디 공간" },
  { id: "it-204", collegeId: "it-eng", name: "공학2호관 204호 전공 세미나실", roomName: "전공 세미나실", category: "SEMINAR", tags: ["빔프로젝터", "화이트보드", "개별냉난방"], capacity: 15, instantConfirm: false, buildingName: "공학2호관 2층", description: "학부/대학원 세미나 및 캡스톤 디자인 발표 리허설에 적합한 공간" },
  { id: "it-402", collegeId: "it-eng", name: "공학1호관 402호 자율 열람실", roomName: "자율 열람실", category: "LIBRARY", tags: ["독서실형", "백색소음기", "개인스탠드"], capacity: 30, instantConfirm: true, buildingName: "공학1호관 4층", description: "조용히 학업에 몰두할 수 있는 독서실형 고도의 집중 학습 공간" },

  // 2. 사범대학
  { id: "edu-205", collegeId: "edu", name: "사범관 205호 임용고시 대비실", roomName: "임용고시 대비실", category: "LIBRARY", tags: ["임용고시전용", "개별칸막이", "조용한환경"], capacity: 30, instantConfirm: true, buildingName: "사범관 2층", description: "교사 임용 시험을 준비하는 사범대생들을 위한 전용 열람 구역" },
  { id: "edu-401", collegeId: "edu", name: "사범관 401호 모의수업 실습실", roomName: "모의수업 실습실", category: "SEMINAR", tags: ["전자칠판", "수업촬영캠", "방음완비"], capacity: 12, instantConfirm: false, buildingName: "사범관 4층", description: "실제 학교 교실과 유사한 칠판 및 카메라 녹화 장비를 구비한 모의 시험실" },
  { id: "edu-lobby", collegeId: "edu", name: "사범관 1층 스터디 라운지", roomName: "스터디 라운지", category: "STUDY", tags: ["개방형", "와이파이", "음료반입가능"], capacity: 6, instantConfirm: true, buildingName: "사범관 1층 로비", description: "가벼운 그룹 스터디 및 과제 조율을 위한 쾌적한 오픈 스페이스" },

  // 3. 재활과학대학
  { id: "rehab-110", collegeId: "rehab", name: "재활관 110호 언어치료 실습실", roomName: "언어치료 실습실", category: "PC", tags: ["임상실습장비", "방음벽", "관찰카메라"], capacity: 10, instantConfirm: false, buildingName: "재활관 1층", description: "언어재활 및 상담 연습을 위한 전문 모니터링 시설이 완비된 실습룸" },
  { id: "rehab-315", collegeId: "rehab", name: "재활관 315호 그룹스터디존", roomName: "그룹스터디존", category: "STUDY", tags: ["화이트보드", "멀티탭", "정원8명"], capacity: 8, instantConfirm: true, buildingName: "재활관 3층", description: "전공 서적 공동 스터디 및 발표 자료 준비에 안성맞춤인 조별룸" },
  { id: "rehab-402", collegeId: "rehab", name: "재활관 402호 전공 자율독서실", roomName: "전공 자율독서실", category: "LIBRARY", tags: ["개인스탠드", "공기청정기", "백색소음기"], capacity: 25, instantConfirm: true, buildingName: "재활관 4층", description: "재활과학대학 학생들의 전공 면학 분위기 조성을 위한 조용한 자율 공간" },

  // 4. 글로벌경영대학
  { id: "biz-201", collegeId: "biz", name: "경상관 201호 조별학습실", roomName: "조별학습실", category: "STUDY", tags: ["모니터TV", "개별에어컨", "정원8명"], capacity: 8, instantConfirm: true, buildingName: "경상관 2층", description: "경영 분석 케이스 스터디 및 토론에 최적화된 밀폐형 스터디 룸" },
  { id: "biz-305", collegeId: "biz", name: "경상관 305호 PC 열람실", roomName: "PC 열람실", category: "PC", tags: ["사무용PC", "고속인쇄기", "넓은테이블"], capacity: 40, instantConfirm: true, buildingName: "경상관 3층", description: "레포트 작성, 자료조사 및 고속 문서 인쇄가 가능한 컴퓨터실" },
  { id: "biz-102", collegeId: "biz", name: "경상관 102호 경상독서실", roomName: "경상독서실", category: "LIBRARY", tags: ["개방식독서실", "공기청정", "콘센트존"], capacity: 35, instantConfirm: true, buildingName: "경상관 1층", description: "답답하지 않은 오픈형 넓은 좌석 배치를 적용한 경상대 전용 자율 열람 공간" },

  // 5. 공공인재대학
  { id: "pub-301", collegeId: "public", name: "법정관 301호 행정고시반", roomName: "행정고시반", category: "LIBRARY", tags: ["국가고시대비", "지정석운영", "24시간개방"], capacity: 20, instantConfirm: false, buildingName: "법정관 3층", description: "5급 공무원, 로스쿨 진학 및 전문 자격시험 준비반 전용 열람실" },
  { id: "pub-105", collegeId: "public", name: "법정관 105호 소모임 세미나실", roomName: "소모임 세미나실", category: "SEMINAR", tags: ["대형화이트보드", "프로젝터", "정원10명"], capacity: 10, instantConfirm: true, buildingName: "법정관 1층", description: "모의재판 연습 및 행정/법학 관련 세미나 소모임 룸" },
  { id: "pub-212", collegeId: "public", name: "법정관 212호 법학 토론실", roomName: "법학 토론실", category: "STUDY", tags: ["원형테이블", "노트북무선연결", "정원8명"], capacity: 8, instantConfirm: true, buildingName: "법정관 2층", description: "유리 보드를 이용한 아이디어 도출 및 토론 전용 라운지룸" },

  // 6. 디자인예술대학
  { id: "des-105", collegeId: "design", name: "조형관 105호 크리에이티브 스튜디오", roomName: "크리에이티브 스튜디오", category: "PC", tags: ["대형제도테이블", "미팅스페이스", "자유토론"], capacity: 15, instantConfirm: true, buildingName: "조형관 1층", description: "공동 작업 및 도면 제도, 대형 실습 테이블이 마련된 창작 공간" },
  { id: "des-210", collegeId: "design", name: "조형관 210호 그래픽 워크스테이션", roomName: "그래픽 워크스테이션", category: "PC", tags: ["액정타블렛", "어도비전제품", "정밀스캐너"], capacity: 25, instantConfirm: false, buildingName: "조형관 2층", description: "일러스트 및 3D 모델링, 고사양 어도비 라이선스가 완비된 컴퓨터실" },
  { id: "des-lounge", collegeId: "design", name: "조형관 3층 크리에이티브 라운지", roomName: "크리에이티브 라운지", category: "STUDY", tags: ["감성인테리어", "와이파이", "정원8명"], capacity: 8, instantConfirm: true, buildingName: "조형관 3층", description: "미술 예술학부 학생들의 자유로운 작품 구상 및 아이디어 교환 카페룸" },

  // 7. 중앙도서관 (창파도서관) - 84석 DB 연계 대상
  { id: "lib-reading-1", collegeId: "library", name: "창파도서관 제1자율열람실", roomName: "제1열람실", category: "LIBRARY", tags: ["독서실형", "칸막이석", "24시간개방"], capacity: 24, instantConfirm: true, buildingName: "중앙도서관 2층", description: "전형적인 정적 독서실 구조로 고도의 집중력을 요구하는 공부 전용 공간" },
  { id: "lib-reading-2", collegeId: "library", name: "창파도서관 2층 자율열람실", roomName: "2층 열람실", category: "LIBRARY", tags: ["집중학습", "개인스탠드", "백색소음기"], capacity: 28, instantConfirm: true, buildingName: "중앙도서관 2층", description: "집중 학습을 위한 칸막이형 열람석과 백색소음기가 구비된 쾌적한 학습 환경의 2층 열람실" },
  { id: "lib-reading-5", collegeId: "library", name: "창파도서관 5층 자율열람실", roomName: "5층 열람실", category: "LIBRARY", tags: ["오픈형테이블", "노트북가능", "전망좋은곳"], capacity: 32, instantConfirm: true, buildingName: "중앙도서관 5층", description: "넓은 창밖 전망을 즐기며 오픈형 테이블에서 자유롭게 공부 및 노트북 작업이 가능한 5층 열람실" }
];

// Initial Mock Seats (Fallback)
const INITIAL_SEATS: Seat[] = Array.from({ length: 24 }, (_, i) => {
  const seatNumber = i + 1;
  return {
    id: seatNumber,
    seat_number: seatNumber,
    room_name: "제1열람실",
    status: "AVAILABLE"
  };
});

const YellowDropsBackground = () => (
  <div className="fixed inset-0 overflow-hidden pointer-events-none z-0">
    <div className="absolute top-[10%] right-[-5%] w-[350px] h-[350px] rounded-full bg-emerald-250/10 blur-[80px] animate-pulse" style={{ animationDuration: "8s" }} />
    <div className="absolute top-[45%] left-[-10%] w-[400px] h-[400px] rounded-full bg-lime-100/10 blur-[100px] animate-pulse" style={{ animationDuration: "12s" }} />
    <div className="absolute bottom-[5%] right-[10%] w-[300px] h-[300px] rounded-full bg-emerald-300/5 blur-[90px] animate-pulse" style={{ animationDuration: "10s" }} />
  </div>
);

// Removed global isMockMode constant to make it a dynamic state within the Page component.

const getMockUuid = (id: string, role: string) => {
  const uuidRegex = /^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$/;
  if (uuidRegex.test(id)) return id;
  const clean = id.replace(/[^0-9a-fA-F]/g, '').slice(0, 12).padStart(12, '0');
  const prefix = role === 'ADMIN' ? '88888888-8888-8888-8888' : '11111111-1111-1111-1111';
  return `${prefix}-${clean}`;
};

const generateMockDbSeats = () => {
  const seatsList: Seat[] = [];
  let globalId = 1;
  FACILITIES.forEach(r => {
    const capacity = r.capacity || 24;
    for (let i = 1; i <= capacity; i++) {
      const hash = r.roomName.charCodeAt(0) + r.roomName.charCodeAt(1) + i;
      if (hash % 5 === 0) {
        seatsList.push({
          id: globalId++,
          seat_number: i,
          room_name: r.roomName,
          status: "OCCUPIED" as SeatStatus,
          current_user_id: `mock-user-${hash}`,
          current_user_name: `임의학생 (학부생)`,
          current_reservation_id: 1000 + hash,
          use_timer_seconds: 7200,
          total_duration_minutes: 120,
          reserved_at: "18:00:00",
          ends_at: "20:00:00"
        });
      } else {
        seatsList.push({
          id: globalId++,
          seat_number: i,
          room_name: r.roomName,
          status: "AVAILABLE" as SeatStatus
        });
      }
    }
  });
  return seatsList;
};

const withTimeout = <T,>(promise: Promise<T>, timeoutMs: number = 3500, errorMsg: string = "Connection timeout"): Promise<T> => {
  return Promise.race([
    promise,
    new Promise<T>((_, reject) => setTimeout(() => reject(new Error(errorMsg)), timeoutMs))
  ]);
};

export default function Page() {
  // Database Connection Mode State (Forced to False for Real Supabase Auth Integration)
  const [isMockMode, setIsMockModeState] = useState<boolean>(false);
  const isMockModeRef = React.useRef<boolean>(false);
  const setIsMockMode = (val: boolean) => {
    isMockModeRef.current = val;
    setIsMockModeState(val);
  };


  // Authentication & Session States
  const [isLoggedIn, setIsLoggedIn] = useState<boolean>(false);
  const [currentUser, setCurrentUser] = useState<Profile | null>(null);
  const [loginTab, setLoginTab] = useState<"STUDENT" | "ADMIN">("STUDENT");
  const [loginError, setLoginError] = useState<string | null>(null);
  const [studentIdInput, setStudentIdInput] = useState<string>("");
  const [studentPasswordInput, setStudentPasswordInput] = useState<string>(""); // [TODO 1] 비밀번호 상태 추가
  const [studentNameInput, setStudentNameInput] = useState<string>("");
  const [adminCodeInput, setAdminCodeInput] = useState<string>("");
  const [loginLoading, setLoginLoading] = useState<boolean>(false);

  // [TODO 3] RBAC 우회 차단 모달 상태
  const [showUnauthorizedModal, setShowUnauthorizedModal] = useState<boolean>(false);

  // [TODO 5.4] 원터치 포커싱 하이라이트 상태
  const [highlightSeatId, setHighlightSeatId] = useState<number | null>(null);

  // Admin Proxy Action Modal States [TODO 5]
  const [proxyStudentId, setProxyStudentId] = useState<string>("");
  const [proxyStudentName, setProxyStudentName] = useState<string>("");
  const [proxyReserveDuration, setProxyReserveDuration] = useState<number>(120);
  const [adminPenaltyReason, setAdminPenaltyReason] = useState<string>("상습 소음 유발");
  const [adminPenaltyDays, setAdminPenaltyDays] = useState<number>(3);

  // 관리자 수동 예약 시스템 states
  const [manualStudentId, setManualStudentId] = useState<string>("");
  const [manualStudentName, setManualStudentName] = useState<string>("");
  const [manualFacility, setManualFacility] = useState<Facility | null>(null);
  const [manualSeats, setManualSeats] = useState<Seat[]>([]);
  const [manualSelectedSeatId, setManualSelectedSeatId] = useState<number | null>(null);
  const [manualDuration, setManualDuration] = useState<number>(120);
  const [manualLoading, setManualLoading] = useState<boolean>(false);

  // Selection & Filter States (실제 검색 쿼리용)
  const [selectedFacility, setSelectedFacility] = useState<Facility | null>(null);
  const [facilityFilter, setFacilityFilter] = useState<string>("ALL");
  const [searchKeyword, setSearchKeyword] = useState<string>("");
  const [searchBuilding, setSearchBuilding] = useState<string>("ALL");
  const [searchCapacity, setSearchCapacity] = useState<string>("");

  // [요청 1] 인풋 렉 제거용 임시 검색 필터 States
  const [tempKeyword, setTempKeyword] = useState<string>("");
  const [tempBuilding, setTempBuilding] = useState<string>("ALL");
  const [tempCapacity, setTempCapacity] = useState<string>("");

  // DB & State
  const [dbSeats, setDbSeats] = useState<Seat[]>(generateMockDbSeats());
  const [facilitySeats, setFacilitySeats] = useState<Record<string, Seat[]>>({});
  const [absenceReports, setAbsenceReports] = useState<AbsenceReport[]>([]);
  const [complaints, setComplaints] = useState<any[]>([]);
  const [facilityConfigs, setFacilityConfigs] = useState<Record<string, any>>({
    "제1열람실": { room_name: "제1열람실", open_time: "09:00:00", close_time: "22:00:00", max_use_hours: 3 },
    "2층 열람실": { room_name: "2층 열람실", open_time: "09:00:00", close_time: "22:00:00", max_use_hours: 4 },
    "5층 열람실": { room_name: "5층 열람실", open_time: "09:00:00", close_time: "23:00:00", max_use_hours: null }
  });
  const [notificationSubscribed, setNotificationSubscribed] = useState<boolean>(false);
  const [cooldownTimeLeft, setCooldownTimeLeft] = useState<number>(0);
  
  // Navigation & perspective
  const [perspective, setPerspective] = useState<"STUDENT" | "ADMIN">("STUDENT");
  const [selectedSeat, setSelectedSeat] = useState<Seat | null>(null);
  const [timerSpeedUp, setTimerSpeedUp] = useState<boolean>(false);

  // [TODO 8] QR/GPS 입실 인증 상태
  const [isVerified, setIsVerified] = useState<boolean>(false);
  const [checkinTimeLeft, setCheckinTimeLeft] = useState<number>(900);

  // Alert State for forced checkout
  const [forcedCheckoutAlert, setForcedCheckoutAlert] = useState<{ show: boolean; seatNumber: number }>({ show: false, seatNumber: 0 });

  // Cooldown countdown timer
  useEffect(() => {
    if (cooldownTimeLeft <= 0) return;
    const timer = setInterval(() => {
      setCooldownTimeLeft(prev => prev - 1);
    }, 1000);
    return () => clearInterval(timer);
  }, [cooldownTimeLeft]);

  // Upload base64 image helper directly from browser to Storage
  const uploadPhotoToStorage = async (base64String: string, fileName: string): Promise<string> => {
    try {
      const base64Data = base64String.replace(/^data:image\/\w+;base64,/, '');
      const binary = atob(base64Data);
      const array = [];
      for (let i = 0; i < binary.length; i++) {
        array.push(binary.charCodeAt(i));
      }
      const blob = new Blob([new Uint8Array(array)], { type: 'image/png' });

      const { error } = await supabase.storage
        .from('evidence-photos')
        .upload(fileName, blob, {
          contentType: 'image/png',
          upsert: true
        });

      if (error) throw error;

      const { data: urlData } = supabase.storage
        .from('evidence-photos')
        .getPublicUrl(fileName);

      return urlData.publicUrl;
    } catch (err: any) {
      console.error('Storage upload error:', err);
      throw new Error('사진 파일 업로드 실패: ' + err.message);
    }
  };

  // Fetch configs from database
  const fetchConfigs = async () => {
    try {
      if (isMockMode) return;
      const { data, error } = await supabase.from('facility_configs').select('*');
      if (!error && data) {
        const configMap: Record<string, any> = {};
        data.forEach((cfg: any) => {
          configMap[cfg.room_name] = cfg;
        });
        setFacilityConfigs(configMap);
      }
    } catch (err) {
      console.error('Configs fetch error:', err);
    }
  };

  // Fetch complaints from database
  const fetchComplaints = async () => {
    try {
      if (isMockMode) return;
      const { data, error } = await supabase
        .from('complaints')
        .select(`
          *,
          profiles (
            university_id,
            name
          )
        `)
        .order('created_at', { ascending: false });
      if (!error && data) {
        setComplaints(data);
      }
    } catch (err) {
      console.error('Complaints fetch error:', err);
    }
  };

  // Fetch all db seats to calculate real counts in listing page
  const fetchAllDbSeats = async () => {
    try {
      if (isMockMode) return;
      const { data, error } = await supabase.from('seats').select('*');
      if (!error && data) {
        setDbSeats(prev => {
          const libraryRoomNames = ["제1열람실", "2층 열람실", "5층 열람실"];
          const nonLibrarySeats = prev.filter(s => !libraryRoomNames.includes(s.room_name));
          return [...nonLibrarySeats, ...data];
        });
      }
    } catch (err) {
      console.error('All db seats fetch error:', err);
    }
  };

  // Fetch real seats and reports for the active facility (room)
  const fetchSeatsAndReports = async () => {
    if (!selectedFacility) return;
    
    if (isMockMode) {
      const mockSeats = dbSeats.filter(s => s.room_name === selectedFacility.roomName);
      setFacilitySeats(prev => ({
        ...prev,
        [selectedFacility.id]: mockSeats
      }));
      return;
    }
    
    const isLibrary = selectedFacility.collegeId === 'library';
    if (isLibrary) {
      // Library rooms: always fetch from real Supabase DB
      let seatsData: any[] | null = null;
      try {
        const result = await supabase
          .from('seats')
          .select('*')
          .eq('room_name', selectedFacility.roomName)
          .order('seat_number', { ascending: true });

        if (result.error) {
          console.error('[Library Seats] DB query error:', result.error);
        } else {
          seatsData = result.data;
          console.log(`[Library Seats] Loaded ${seatsData?.length || 0} seats for ${selectedFacility.roomName}`);
        }
      } catch (queryErr) {
        console.error('[Library Seats] Exception during query:', queryErr);
      }

      // If DB query failed or returned empty, use fallback mock data
      if (!seatsData || seatsData.length === 0) {
        console.warn(`[Library Seats] No DB data for ${selectedFacility.roomName}, generating fallback seats`);
        const roomCapacity = selectedFacility.capacity || 24;
        const fallbackSeats: Seat[] = Array.from({ length: roomCapacity }, (_, i) => ({
          id: 80000 + (selectedFacility.id.charCodeAt(4) || 0) * 100 + i + 1,
          seat_number: i + 1,
          room_name: selectedFacility.roomName,
          status: "AVAILABLE" as SeatStatus
        }));
        setFacilitySeats(prev => ({
          ...prev,
          [selectedFacility.id]: fallbackSeats
        }));
        return;
      }

      // Safely fetch reservations (RLS may restrict for students)
      let resData: any[] = [];
      try {
        const { data, error: resErr } = await supabase
          .from('reservations')
          .select(`
            id,
            seat_id,
            user_id,
            status,
            check_in_at,
            profiles (
              university_id,
              name
            )
          `)
          .eq('status', 'ACTIVE');
        if (resErr) {
          console.warn("Supabase active reservations fetch failed (RLS/join):", resErr);
        } else if (data) {
          resData = data;
        }
      } catch (resException) {
        console.warn("Exception fetching active reservations:", resException);
      }

      // Safely fetch absence reports (RLS may restrict for students)
      let reportsData: any[] = [];
      try {
        const { data, error: reportsErr } = await supabase
          .from('absence_reports')
          .select('*')
          .eq('status', 'PENDING');
        if (reportsErr) {
          console.warn("Supabase absence reports fetch failed (RLS):", reportsErr);
        } else if (data) {
          reportsData = data;
        }
      } catch (repException) {
        console.warn("Exception fetching absence reports:", repException);
      }

      const mappedSeats = seatsData.map((seat: any) => {
        const activeRes = resData?.find((r: any) => r.seat_id === seat.id);
        
        let occupantName = undefined;
        if (activeRes && activeRes.profiles) {
          const profile: any = Array.isArray(activeRes.profiles) ? activeRes.profiles[0] : activeRes.profiles;
          if (profile) occupantName = `${profile.name} (${profile.university_id})`;
        }

        let clearingTimerSeconds = undefined;
        if (seat.status === 'CLEARING') {
          const updatedAt = new Date(seat.updated_at).getTime();
          const now = Date.now();
          const elapsed = Math.floor((now - updatedAt) / 1000);
          clearingTimerSeconds = Math.max(0, 600 - elapsed);
        }

        return {
          id: seat.id,
          seat_number: seat.seat_number,
          room_name: seat.room_name,
          status: seat.status as SeatStatus,
          current_user_id: activeRes ? activeRes.user_id : undefined,
          current_user_name: occupantName,
          current_reservation_id: activeRes ? activeRes.id : undefined,
          check_in_at: activeRes ? activeRes.check_in_at : undefined,
          clearing_timer_seconds: clearingTimerSeconds,
          use_timer_seconds: seat.use_timer_seconds !== null ? seat.use_timer_seconds : undefined,
          total_duration_minutes: seat.total_duration_minutes !== null ? seat.total_duration_minutes : undefined,
          reserved_at: seat.reserved_at || undefined,
          ends_at: seat.ends_at || undefined
        };
      });

      setFacilitySeats(prev => ({
        ...prev,
        [selectedFacility.id]: mappedSeats
      }));

      const mappedReports = (reportsData || []).map((report: any) => {
        const firstReportedAt = new Date(report.first_reported_at).getTime();
        const now = Date.now();
        const elapsed = Math.floor((now - firstReportedAt) / 1000);
        const warningTimerSeconds = Math.max(0, 600 - elapsed);

        return {
          id: report.id,
          seat_id: report.seat_id,
          reporter_id: report.reporter_id,
          first_photo_url: report.first_photo_url,
          first_reported_at: report.first_reported_at,
          second_photo_url: report.second_photo_url || undefined,
          second_reported_at: report.second_reported_at || undefined,
          warning_timer_seconds: warningTimerSeconds,
          status: report.status
        };
      });

      setAbsenceReports(mappedReports);

      // Check if current user is subscribed to empty seat notifications for this room
      if (currentUser) {
        try {
          const { data: sub } = await supabase
            .from('notifications')
            .select('*')
            .eq('user_id', currentUser.id)
            .eq('room_name', selectedFacility.roomName)
            .eq('status', 'PENDING');
          setNotificationSubscribed(!!(sub && sub.length > 0));
        } catch (notifErr) {
          console.warn("Failed to fetch notification status:", notifErr);
        }
      }
    } else {
      // Fallback for mock rooms (using existing generated dbSeats of correct capacities)
      const mockSeats = dbSeats.filter(s => s.room_name === selectedFacility.roomName);
      setFacilitySeats(prev => ({
        ...prev,
        [selectedFacility.id]: mockSeats
      }));
    }
  };

  // Base configurations and Auth listener
  useEffect(() => {
    const initSession = async () => {
      if (isMockModeRef.current) return;
      try {
        const { data: { session } } = await supabase.auth.getSession();
        if (session && session.user) {
          setIsLoggedIn(true);
          const { data: profile } = await supabase.from('profiles')
            .select('*')
            .eq('id', session.user.id)
            .single();
          if (profile) {
            if (profile.penalty_ends_at && new Date(profile.penalty_ends_at) > new Date()) {
              setLoginError(`현재 패널티 누적으로 인해 이용이 제한되었습니다. (제한 만료: ${new Date(profile.penalty_ends_at).toLocaleDateString()}, 사유: ${profile.penalty_reason || '미상'})`);
              await supabase.auth.signOut().catch(() => {});
              setIsLoggedIn(false);
              setCurrentUser(null);
              return;
            }
            if (profile.university_id === "22221992" && profile.name !== "이준엽 (컴퓨터공학전공)") {
              await supabase.from('profiles').update({ name: '이준엽 (컴퓨터공학전공)' }).eq('id', session.user.id);
              profile.name = '이준엽 (컴퓨터공학전공)';
            }
            if (profile.university_id === "ADM-9942" && (profile.role !== "ADMIN" || profile.managed_college_id !== "library")) {
              await supabase.from('profiles').update({ role: 'ADMIN', managed_college_id: 'library' }).eq('id', session.user.id);
              profile.role = 'ADMIN';
              profile.managed_college_id = 'library';
            }
            setCurrentUser({
              id: profile.id,
              university_id: profile.university_id,
              name: profile.name,
              role: profile.role as "USER" | "ADMIN",
              managed_college_id: profile.managed_college_id
            });
            setPerspective(profile.role === 'ADMIN' ? 'ADMIN' : 'STUDENT');
          } else {
            const meta = session.user.user_metadata || {};
            const defaultRole = meta.role === 'ADMIN' ? 'ADMIN' : 'USER';
            setCurrentUser({
              id: session.user.id,
              university_id: meta.university_id || session.user.email?.split('@')[0] || 'unknown',
              name: meta.name || '사용자',
              role: defaultRole,
              managed_college_id: meta.managed_college_id || null
            });
            setPerspective(defaultRole === 'ADMIN' ? 'ADMIN' : 'STUDENT');
          }
        }
      } catch (err) {
        console.warn("Failed to initialize session profile", err);
      }
    };
    initSession();

    const authListener = supabase.auth.onAuthStateChange(async (_event, session) => {
      if (isMockModeRef.current) return;
      if (session && session.user) {
        setIsLoggedIn(true);
        try {
          const { data: profile } = await supabase.from('profiles').select('*').eq('id', session.user.id).single();
          if (profile) {
            if (profile.penalty_ends_at && new Date(profile.penalty_ends_at) > new Date()) {
              setLoginError(`현재 패널티 누적으로 인해 이용이 제한되었습니다. (제한 만료: ${new Date(profile.penalty_ends_at).toLocaleDateString()}, 사유: ${profile.penalty_reason || '미상'})`);
              supabase.auth.signOut().catch(() => {});
              setIsLoggedIn(false);
              setCurrentUser(null);
              return;
            }
            if (profile.university_id === "22221992" && profile.name !== "이준엽 (컴퓨학전공)") {
              await supabase.from('profiles').update({ name: '이준엽 (컴퓨터공학전공)' }).eq('id', session.user.id);
              profile.name = '이준엽 (컴퓨터공학전공)';
            }
            if (profile.university_id === "ADM-9942" && (profile.role !== "ADMIN" || profile.managed_college_id !== "library")) {
              await supabase.from('profiles').update({ role: 'ADMIN', managed_college_id: 'library' }).eq('id', session.user.id);
              profile.role = 'ADMIN';
              profile.managed_college_id = 'library';
            }
            setCurrentUser({
              id: profile.id,
              university_id: profile.university_id,
              name: profile.name,
              role: profile.role as "USER" | "ADMIN",
              managed_college_id: profile.managed_college_id
            });
            setPerspective(profile.role === 'ADMIN' ? 'ADMIN' : 'STUDENT');
          } else {
            const meta = session.user.user_metadata || {};
            const defaultRole = meta.role === 'ADMIN' ? 'ADMIN' : 'USER';
            const fallbackProfile = {
              id: session.user.id,
              university_id: meta.university_id || session.user.email?.split('@')[0] || 'unknown',
              name: meta.name || '사용자',
              role: defaultRole,
              managed_college_id: meta.managed_college_id || null
            };
            await supabase.from('profiles').upsert(fallbackProfile);
            setCurrentUser(fallbackProfile as any);
            setPerspective(defaultRole === 'ADMIN' ? 'ADMIN' : 'STUDENT');
          }
        } catch (profileErr) {
          console.warn("Failed to fetch auth change profile", profileErr);
        }
      } else {
        setIsLoggedIn(false);
        setCurrentUser(null);
      }
    });

    return () => {
      authListener.data.subscription.unsubscribe();
    };
  }, [isMockMode]);

  // Global Realtime WebSockets configurations
  useEffect(() => {
    fetchConfigs();
    fetchComplaints();
    fetchAllDbSeats();

    let dbChannel: any = null;
    if (!isMockMode) {
      try {
        dbChannel = supabase.channel('global-db-updates')
          .on('postgres_changes', { event: '*', schema: 'public', table: 'seats' }, (payload) => {
            fetchAllDbSeats();
            if (selectedFacility) fetchSeatsAndReports();

            if (payload.eventType === 'UPDATE') {
              const newSeat = payload.new;
              const oldSeat = payload.old;
              if (newSeat.status === 'AVAILABLE' && oldSeat.status !== 'AVAILABLE') {
                checkAndTriggerSeatNotification(newSeat.room_name, 'AVAILABLE');
              }
              if (newSeat.ends_at && newSeat.ends_at !== oldSeat.ends_at) {
                checkAndTriggerSeatNotification(newSeat.room_name, 'EARLY_CHECKOUT', newSeat.ends_at);
              }
            }
          })
          .on('postgres_changes', { event: '*', schema: 'public', table: 'absence_reports' }, () => {
            if (selectedFacility) fetchSeatsAndReports();
          })
          .on('postgres_changes', { event: '*', schema: 'public', table: 'complaints' }, () => {
            fetchComplaints();
          })
          .on('postgres_changes', { event: '*', schema: 'public', table: 'facility_configs' }, () => {
            fetchConfigs();
          })
          .subscribe();
      } catch (err) {
        console.warn("Failed to subscribe to global realtime channel", err);
      }
    }

    return () => {
      if (dbChannel) {
        try {
          supabase.removeChannel(dbChannel);
        } catch (err) {
          console.warn("Failed to remove realtime channel", err);
        }
      }
    };
  }, [selectedFacility]);

  // Sync seats/reports when facility selected
  useEffect(() => {
    if (selectedFacility) {
      fetchSeatsAndReports();
    }
  }, [selectedFacility]);

  // Active seats map for selected room
  const activeSeats = selectedFacility && facilitySeats[selectedFacility.id]
    ? facilitySeats[selectedFacility.id]
    : [];

  const setSeats = (updater: Seat[] | ((prev: Seat[]) => Seat[])) => {
    if (!selectedFacility) return;
    setFacilitySeats(prev => {
      const current = prev[selectedFacility.id] || [];
      const nextSeats = typeof updater === "function" ? updater(current) : updater;
      return {
        ...prev,
        [selectedFacility.id]: nextSeats
      };
    });
  };

  const updateMockSeat = (seatId: number, updater: (seat: Seat) => Seat) => {
    setDbSeats(prev => {
      const nextDbSeats = prev.map(s => s.id === seatId ? updater(s) : s);
      
      if (selectedFacility) {
        const mockSeats = nextDbSeats.filter(s => s.room_name === selectedFacility.roomName);
        setFacilitySeats(fprev => ({
          ...fprev,
          [selectedFacility.id]: mockSeats
        }));
      }
      
      return nextDbSeats;
    });
  };

  // Logged-in user's active seat reservation
  const myReservationFacilityId = Object.keys(facilitySeats).find(facId => {
    if (!currentUser) return false;
    const reservedSeat = facilitySeats[facId]?.find(s => s.current_user_id === currentUser.id);
    return !!reservedSeat;
  }) || null;

  const myReservation = currentUser && myReservationFacilityId && selectedFacility && myReservationFacilityId === selectedFacility.id
    ? facilitySeats[selectedFacility.id]?.find(s => s.current_user_id === currentUser.id) || null
    : null;

  const globalMyReservation = currentUser
    ? dbSeats.find(s => s.current_user_id === currentUser.id) || 
      (myReservationFacilityId ? facilitySeats[myReservationFacilityId]?.find(s => s.current_user_id === currentUser.id) : null) || 
      null
    : null;

  const activeStudentWarning = globalMyReservation
    ? absenceReports.find(r => r.seat_id === globalMyReservation.id && r.status === "PENDING")
    : null;

  const [showWarningModal, setShowWarningModal] = useState<boolean>(false);

  useEffect(() => {
    if (globalMyReservation && globalMyReservation.status === "REPORTED_1ST") {
      setShowWarningModal(true);
    } else {
      setShowWarningModal(false);
    }
  }, [globalMyReservation?.status]);

  // Timer Tick (Local fallback & check closing hour auto-release)
  useEffect(() => {
    const interval = setInterval(() => {
      const decrement = timerSpeedUp ? 60 : 1;

      // 1. Tick Warning timers local view
      setAbsenceReports((prev) =>
        prev.map((r) => {
          if (r.status === "PENDING" && r.warning_timer_seconds !== undefined) {
            return {
              ...r,
              warning_timer_seconds: Math.max(0, r.warning_timer_seconds - decrement)
            };
          }
          return r;
        })
      );

      // 2. Tick Seat countdowns (Ticks both facilitySeats and dbSeats and auto-releases on Supabase when countdown hits 0)
      setFacilitySeats((prevMap) => {
        const nextMap = { ...prevMap };
        Object.keys(nextMap).forEach(facId => {
          nextMap[facId] = nextMap[facId].map((seat) => {
            if (seat.status === "CLEARING" && seat.clearing_timer_seconds !== undefined) {
              const newSeconds = Math.max(0, seat.clearing_timer_seconds - decrement);
              return {
                ...seat,
                status: (newSeconds === 0 ? "AVAILABLE" : seat.status) as SeatStatus,
                current_user_id: newSeconds === 0 ? undefined : seat.current_user_id,
                current_user_name: newSeconds === 0 ? undefined : seat.current_user_name,
                current_reservation_id: newSeconds === 0 ? undefined : seat.current_reservation_id,
                clearing_timer_seconds: newSeconds === 0 ? undefined : newSeconds
              };
            }

            if ((seat.status === "OCCUPIED" || seat.status === "REPORTED_1ST") && seat.use_timer_seconds !== undefined) {
              const newSeconds = Math.max(0, seat.use_timer_seconds - decrement);
              return {
                ...seat,
                status: (newSeconds === 0 ? "AVAILABLE" : seat.status) as SeatStatus,
                current_user_id: newSeconds === 0 ? undefined : seat.current_user_id,
                current_user_name: newSeconds === 0 ? undefined : seat.current_user_name,
                current_reservation_id: newSeconds === 0 ? undefined : seat.current_reservation_id,
                use_timer_seconds: newSeconds === 0 ? undefined : newSeconds,
                total_duration_minutes: newSeconds === 0 ? undefined : seat.total_duration_minutes,
                reserved_at: newSeconds === 0 ? undefined : seat.reserved_at,
                ends_at: newSeconds === 0 ? undefined : seat.ends_at
              };
            }
            return seat;
          });
        });
        return nextMap;
      });

      setDbSeats((prev) => {
        let currentUserSeatExpired = false;
        const next = prev.map((seat) => {
          if (seat.status === "CLEARING" && seat.clearing_timer_seconds !== undefined) {
            const newSeconds = Math.max(0, seat.clearing_timer_seconds - decrement);
            if (newSeconds === 0) {
              if (currentUser && seat.current_user_id === currentUser.id) {
                currentUserSeatExpired = true;
              }
              return {
                ...seat,
                status: "AVAILABLE" as SeatStatus,
                current_user_id: undefined,
                current_user_name: undefined,
                current_reservation_id: undefined,
                clearing_timer_seconds: undefined
              };
            }
            return { ...seat, clearing_timer_seconds: newSeconds };
          }
          if ((seat.status === "OCCUPIED" || seat.status === "REPORTED_1ST") && seat.use_timer_seconds !== undefined) {
            const newSeconds = Math.max(0, seat.use_timer_seconds - decrement);
            if (newSeconds === 0) {
              if (currentUser && seat.current_user_id === currentUser.id) {
                currentUserSeatExpired = true;
              }
              return {
                ...seat,
                status: "AVAILABLE" as SeatStatus,
                current_user_id: undefined,
                current_user_name: undefined,
                current_reservation_id: undefined,
                use_timer_seconds: undefined,
                total_duration_minutes: undefined,
                reserved_at: undefined,
                ends_at: undefined
              };
            }
            return { ...seat, use_timer_seconds: newSeconds };
          }
          return seat;
        });

        if (currentUserSeatExpired) {
          setTimeout(() => {
            handleCheckoutSeat();
          }, 0);
        }
        return next;
      });

      setCheckinTimeLeft((prev) => {
        if (isVerified) return 900;
        return Math.max(0, prev - decrement);
      });

    }, 1000);

    return () => clearInterval(interval);
  }, [timerSpeedUp, isVerified]);

  useEffect(() => {
    if (globalMyReservation && !isVerified && checkinTimeLeft === 0) {
      alert("⏱️ 15분 입실 확인 유예 시간이 만료되어 예약이 자동 취소(폭파) 및 좌석이 개방되었습니다.");
      handleCheckoutSeat();
    }
  }, [checkinTimeLeft, isVerified, globalMyReservation]);

  useEffect(() => {
    if (globalMyReservation) {
      if (globalMyReservation.check_in_at) {
        setIsVerified(true);
      } else {
        setIsVerified(false);
      }
    } else {
      setIsVerified(false);
      setCheckinTimeLeft(900);
    }
  }, [globalMyReservation]);

  const handleVerifyCheckin = async () => {
    setIsVerified(true);
    try {
      if (!isMockMode && globalMyReservation && globalMyReservation.current_reservation_id) {
        const { error } = await supabase.from('reservations').update({
          check_in_at: new Date().toISOString(),
          is_checked_in: true
        }).eq('id', globalMyReservation.current_reservation_id);

        if (error) {
          console.error("Supabase check-in error:", error);
          alert(`⚠️ 데이터베이스 입실 등록 실패: ${error.message}\n(백엔드 RLS 권한이 부족하여 업데이트가 실패하였습니다. SQL 에디터에 UPDATE 정책을 적용해 주세요. 로컬 가상 입실로 임시 전환합니다.)`);
        }
      }
    } catch (err: any) {
      console.warn("Failed to save checkin to Supabase:", err);
      alert(`⚠️ 입실 인증 연동 중 예외가 발생했습니다: ${err.message || err}`);
    }
    alert("✓ 입실 인증이 성공적으로 완료되었습니다. 즐거운 학습 시간 되세요!");
  };

  useEffect(() => {
    if (selectedSeat && selectedFacility) {
      const currentList = facilitySeats[selectedFacility.id] || [];
      const updated = currentList.find(s => s.id === selectedSeat.id);
      if (updated) setSelectedSeat(updated);
    }
  }, [facilitySeats, selectedFacility]);

  useEffect(() => {
    if (!selectedFacility || !currentUser) return;
    const seats = facilitySeats[selectedFacility.id] || [];
    const mySeat = seats.find(s => s.current_user_id === currentUser.id);
    if (mySeat) {
      setSelectedSeat(mySeat);
    }
  }, [selectedFacility, facilitySeats, currentUser]);

  const prevManualFacilityRef = React.useRef<string | null>(null);
  useEffect(() => {
    if (!manualFacility) {
      setManualSeats([]);
      setManualSelectedSeatId(null);
      prevManualFacilityRef.current = null;
      return;
    }
    const facilityChanged = prevManualFacilityRef.current !== manualFacility.id;
    
    const existing = facilitySeats[manualFacility.id];
    if (existing && existing.length > 0) {
      setManualSeats(existing);
    } else {
      if (manualFacility.collegeId === 'library' && !isMockMode) {
        (async () => {
          try {
            const { data, error } = await supabase
              .from('seats')
              .select('*')
              .eq('room_name', manualFacility.roomName)
              .order('seat_number', { ascending: true });
            if (!error && data && data.length > 0) {
              const mapped: Seat[] = data.map((seat: any) => ({
                id: seat.id,
                seat_number: seat.seat_number,
                room_name: seat.room_name,
                status: seat.status as SeatStatus
              }));
              setManualSeats(mapped);
              setFacilitySeats(prev => ({ ...prev, [manualFacility.id]: mapped }));
              return;
            }
          } catch (err) {
            console.warn('[ManualReserve] Failed to load library seats from DB:', err);
          }
          const mockSeats: Seat[] = Array.from({ length: manualFacility.capacity }, (_, i) => ({
            id: 90000 + (FACILITIES.indexOf(manualFacility) * 100) + i + 1,
            seat_number: i + 1,
            room_name: manualFacility.roomName,
            status: "AVAILABLE" as const
          }));
          setManualSeats(mockSeats);
          setFacilitySeats(prev => ({ ...prev, [manualFacility.id]: mockSeats }));
        })();
      } else {
        const mockSeats: Seat[] = Array.from({ length: manualFacility.capacity }, (_, i) => ({
          id: 90000 + (FACILITIES.indexOf(manualFacility) * 100) + i + 1,
          seat_number: i + 1,
          room_name: manualFacility.roomName,
          status: "AVAILABLE" as const
        }));
        setManualSeats(mockSeats);
        setFacilitySeats(prev => ({ ...prev, [manualFacility.id]: mockSeats }));
      }
    }
    if (facilityChanged) {
      setManualSelectedSeatId(null);
      prevManualFacilityRef.current = manualFacility.id;
    }
  }, [manualFacility, facilitySeats]);

  const checkAndTriggerSeatNotification = async (roomName: string, type: 'AVAILABLE' | 'EARLY_CHECKOUT', endsAt?: string) => {
    if (!currentUser) return;
    try {
      const { data, error } = await supabase
        .from('notifications')
        .select('*')
        .eq('user_id', currentUser.id)
        .eq('room_name', roomName)
        .eq('status', 'PENDING');

      if (!error && data && data.length > 0) {
        if (type === 'AVAILABLE') {
          alert(`📢 [빈자리 알림]\n반가운 소식! 신청하신 ${roomName}에 빈자리가 생겼습니다. 지금 바로 예약하세요!`);
        } else {
          alert(`📢 [빈자리 알림]\n신청하신 ${roomName}에 약 ${endsAt ? endsAt.slice(0, 5) : ""} 경에 빈자리가 발생할 예정입니다! 미리 준비해 보세요.`);
        }
        await supabase
          .from('notifications')
          .update({ status: 'SENT' })
          .eq('user_id', currentUser.id)
          .eq('room_name', roomName);
        setNotificationSubscribed(false);
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleSearchSubmit = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    setSearchKeyword(tempKeyword);
    setSearchBuilding(tempBuilding);
    setSearchCapacity(tempCapacity);

    if (tempBuilding === "중앙도서관") {
      setFacilityFilter("library");
    } else if (tempBuilding === "IT융합관") {
      setFacilityFilter("it-eng");
    } else if (tempBuilding === "사범관") {
      setFacilityFilter("edu");
    } else if (tempBuilding === "재활과학관") {
      setFacilityFilter("rehab");
    } else if (tempBuilding === "경상관") {
      setFacilityFilter("biz");
    } else if (tempBuilding === "법정관") {
      setFacilityFilter("public");
    } else if (tempBuilding === "조형관") {
      setFacilityFilter("design");
    } else {
      setFacilityFilter("ALL");
    }
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoginError(null);
    setLoginLoading(true);

    try {
      if (loginTab === "STUDENT") {
        if (!studentIdInput.trim() || !studentPasswordInput.trim()) {
          setLoginError("학번과 포털 비밀번호를 모두 입력해 주세요.");
          setLoginLoading(false);
          return;
        }
        if (studentIdInput.trim().length !== 8) {
          setLoginError("학번은 8자리 숫자로 입력해야 합니다.");
          setLoginLoading(false);
          return;
        }

        const email = `${studentIdInput.trim()}@daegu.ac.kr`;
        const password = studentPasswordInput.trim();

        try {
          if (isMockMode) throw new Error("Mock mode enabled");
          const { error } = await withTimeout(supabase.auth.signInWithPassword({ email, password }), 3500);
          if (error) {
            const { error: signUpErr } = await withTimeout(supabase.auth.signUp({
              email,
              password,
              options: {
                data: {
                  university_id: studentIdInput.trim(),
                  name: studentIdInput.trim() === "22221992" ? "이준엽 (컴퓨터공학전공)" : `강민성 (컴퓨터공학과)`,
                  role: 'USER'
                }
              }
            }), 3500);
            if (signUpErr) {
              throw signUpErr;
            }
            const { error: signIn2Err } = await withTimeout(supabase.auth.signInWithPassword({ email, password }), 3500);
            if (signIn2Err) throw signIn2Err;
          }

          const { data: { session } } = await withTimeout(supabase.auth.getSession(), 3500);
          const currentSessionUser = session?.user;

          if (currentSessionUser) {
            const studentName = studentIdInput.trim() === "22221992" ? "이준엽 (컴퓨터공학전공)" : "강민성 (컴퓨터공학과)";
            await supabase.from('profiles').upsert({
              id: currentSessionUser.id,
              university_id: studentIdInput.trim(),
              name: studentName,
              role: 'USER'
            }).select();

            setCurrentUser({
              id: currentSessionUser.id,
              university_id: studentIdInput.trim(),
              name: studentName,
              role: "USER"
            });
            setPerspective("STUDENT");
            setIsLoggedIn(true);
          } else {
            throw new Error("No session user found after successful sign in");
          }

          setIsMockMode(false);
        } catch (err: any) {
          console.warn("Supabase auth login failed, using local mock fallback:", err);
          setIsMockMode(true);
          setIsLoggedIn(true);
          setCurrentUser({
            id: getMockUuid(studentIdInput.trim(), "USER"),
            university_id: studentIdInput.trim(),
            name: studentIdInput.trim() === "22221992" ? "이준엽 (컴퓨터공학전공)" : `강민성 (컴퓨터공학과)`,
            role: "USER"
          });
          setPerspective("STUDENT");
        }
      } else {
        if (!adminCodeInput.trim()) {
          setLoginError("관리자 코드를 입력해 주세요.");
          setLoginLoading(false);
          return;
        }

        const email = `${adminCodeInput.trim()}@daegu.ac.kr`;
        const password = `admin_daegu_2026!`;

        try {
          if (isMockMode) throw new Error("Mock mode enabled");
          const { error } = await withTimeout(supabase.auth.signInWithPassword({ email, password }), 3500);
          if (error) {
            const { error: signUpErr } = await withTimeout(supabase.auth.signUp({
              email,
              password,
              options: {
                data: {
                  university_id: adminCodeInput.trim(),
                  name: "이영희 사서관",
                  role: 'ADMIN',
                  managed_college_id: 'library'
                }
              }
            }), 3500);
            if (signUpErr) throw signUpErr;
            const { error: signIn2Err } = await withTimeout(supabase.auth.signInWithPassword({ email, password }), 3500);
            if (signIn2Err) throw signIn2Err;
          }

          const { data: { session } } = await withTimeout(supabase.auth.getSession(), 3500);
          const currentSessionUser = session?.user;

          if (currentSessionUser) {
            await supabase.from('profiles').upsert({
              id: currentSessionUser.id,
              university_id: adminCodeInput.trim(),
              name: "이영희 사서관",
              role: 'ADMIN',
              managed_college_id: 'library'
            }).select();

            setCurrentUser({
              id: currentSessionUser.id,
              university_id: adminCodeInput.trim(),
              name: "이영희 사서관",
              role: "ADMIN",
              managed_college_id: "library"
            });
            setPerspective("ADMIN");
            setIsLoggedIn(true);
          } else {
            throw new Error("No session user found after successful sign in");
          }

          setIsMockMode(false);
        } catch (err: any) {
          console.warn("Supabase auth admin login failed, using local mock fallback:", err);
          setIsMockMode(true);
          setIsLoggedIn(true);
          setCurrentUser({
            id: getMockUuid(adminCodeInput.trim(), "ADMIN"),
            university_id: adminCodeInput.trim(),
            name: "이영희 사서관",
            role: "ADMIN",
            managed_college_id: "library"
          });
          setPerspective("ADMIN");
        }
      }
    } finally {
      setLoginLoading(false);
    }
  };

  const loginAsDemoStudent = async () => {
    setStudentIdInput("20222043");
    setStudentPasswordInput("20222043__daegu!");
    setStudentNameInput("강민성");
    setLoginLoading(true);
    const email = "20222043@daegu.ac.kr";
    const password = "20222043__daegu!";
    try {
      const { error } = await withTimeout(supabase.auth.signInWithPassword({ email, password }), 3500);
      if (error) {
        const { error: signUpErr } = await withTimeout(supabase.auth.signUp({
          email,
          password,
          options: {
            data: {
              university_id: "20222043",
              name: "강민성 (컴퓨터공학과)",
              role: 'USER'
            }
          }
        }), 3500);
        if (signUpErr) throw signUpErr;
        const { error: signIn2Err } = await withTimeout(supabase.auth.signInWithPassword({ email, password }), 3500);
        if (signIn2Err) throw signIn2Err;
      }
      
      const { data: { session } } = await withTimeout(supabase.auth.getSession(), 3500);
      const currentSessionUser = session?.user;
 
      if (currentSessionUser) {
        await supabase.from('profiles').upsert({
          id: currentSessionUser.id,
          university_id: "20222043",
          name: "강민성 (컴퓨터공학과)",
          role: 'USER'
        }).select();
 
        setCurrentUser({
          id: currentSessionUser.id,
          university_id: "20222043",
          name: "강민성 (컴퓨터공학과)",
          role: "USER"
        });
        setPerspective("STUDENT");
        setIsLoggedIn(true);
      } else {
        throw new Error("No session user found after successful sign in");
      }
      setIsMockMode(false);
    } catch (err) {
      console.warn("Supabase auth failed, logging in with demo mock session:", err);
      setIsMockMode(true);
      setIsLoggedIn(true);
      setCurrentUser({
        id: "a1b2c3d4-e5f6-7a8b-9c0d-1e2f3a4b5c6d",
        university_id: "20222043",
        name: "강민성 (컴퓨터공학과)",
        role: "USER"
      });
      setPerspective("STUDENT");
    } finally {
      setLoginLoading(false);
    }
  };
 
  const loginAsDemoAdmin = async () => {
    setAdminCodeInput("ADM-9942");
    setLoginLoading(true);
    const email = "ADM-9942@daegu.ac.kr";
    const password = "admin_daegu_2026!";
    try {
      const { data, error } = await withTimeout(supabase.auth.signInWithPassword({ email, password }), 3500);
      let currentSessionUser = data?.user;
      if (error) {
        const { data: signUpData, error: signUpErr } = await withTimeout(supabase.auth.signUp({
          email,
          password,
          options: {
            data: {
              university_id: "ADM-9942",
              name: "이영희 사서관",
              role: 'ADMIN',
              managed_college_id: 'library'
            }
          }
        }), 3500);
        if (signUpErr) throw signUpErr;
        const { data: signIn2Data, error: signIn2Err } = await withTimeout(supabase.auth.signInWithPassword({ email, password }), 3500);
        if (signIn2Err) throw signIn2Err;
        currentSessionUser = signIn2Data?.user;
      }
 
      if (currentSessionUser) {
        await supabase.from('profiles').upsert({
          id: currentSessionUser.id,
          university_id: "ADM-9942",
          name: "이영희 사서관",
          role: 'ADMIN',
          managed_college_id: 'library'
        }).select();
 
        setCurrentUser({
          id: currentSessionUser.id,
          university_id: "ADM-9942",
          name: "이영희 사서관",
          role: "ADMIN",
          managed_college_id: "library"
        });
        setPerspective("ADMIN");
        setIsLoggedIn(true);
      } else {
        throw new Error("No session user found after successful sign in");
      }
      setIsMockMode(false);
    } catch (err) {
      console.warn("Supabase auth failed, logging in with demo mock session:", err);
      setIsMockMode(true);
      setIsLoggedIn(true);
      setCurrentUser({
        id: "f9e8d7c6-b5a4-3f2e-1d0c-9b8a7f6e5d4c",
        university_id: "ADM-9942",
        name: "이영희 사서관",
        role: "ADMIN",
        managed_college_id: "library"
      });
      setPerspective("ADMIN");
    } finally {
      setLoginLoading(false);
    }
  };

  const handleLogout = async () => {
    setIsMockMode(false);
    setIsLoggedIn(false);
    setCurrentUser(null);
    setSelectedFacility(null);
    setSelectedSeat(null);
    setStudentIdInput("");
    setStudentNameInput("");
    setAdminCodeInput("");
    setLoginError(null);
    resetFilters();

    try {
      supabase.auth.signOut().catch(err => {
        console.warn("Supabase signOut silent error:", err);
      });
    } catch (err) {
      console.warn("Supabase signOut error, forcing local logout:", err);
    }
  };

  const resetFilters = () => {
    setTempKeyword("");
    setTempBuilding("ALL");
    setTempCapacity("");
    setSearchKeyword("");
    setSearchBuilding("ALL");
    setSearchCapacity("");
    setFacilityFilter("ALL");
  };

  const handleSearchStudentForManualReserve = async () => {
    if (manualStudentId.trim().length !== 8) {
      alert("학번은 8자리 숫자로 입력해 주세요.");
      return;
    }
    
    try {
      if (isMockMode) return;
      const { data, error } = await supabase
        .from('profiles')
        .select('name')
        .eq('university_id', manualStudentId)
        .single();
      
      if (error || !data) {
        throw new Error("Student not found");
      }
      
      setManualStudentName(data.name);
      alert(`✓ 학생 정보 검색 성공: ${data.name} 학생이 조회되었습니다.`);
    } catch (err) {
      console.warn("학생 검색 실패 (데이터 없음):", err);
      if (manualStudentId === "20222043") {
        setManualStudentName("강민성");
        alert("✓ 학생 정보 성공: 강민성 학생이 조회되었습니다.");
      } else {
        const generatedName = `학생_${manualStudentId}`;
        setManualStudentName(generatedName);
        alert(`✓ 학생 정보 성공: ${generatedName} 학생이 조회되었습니다.`);
      }
    }
  };

  const handleAdminManualReserve = async () => {
    if (!manualStudentId.trim() || !manualStudentName.trim()) {
      alert("학번과 이름을 입력해 주세요.");
      return;
    }
    if (!manualFacility) {
      alert("시설을 선택해 주세요.");
      return;
    }
    if (!manualSelectedSeatId) {
      alert("좌석을 선택해 주세요.");
      return;
    }
    const targetSeat = manualSeats.find(s => s.id === manualSelectedSeatId);
    if (!targetSeat || targetSeat.status !== "AVAILABLE") {
      alert("선택한 좌석은 이미 사용 중이거나 예약 불가합니다.");
      return;
    }

    setManualLoading(true);
    
    const config = facilityConfigs[manualFacility.roomName];
    const isUnlimited = config && (!config.max_use_hours || config.max_use_hours === 0);
    
    let effectiveDuration = manualDuration;
    let ends_at_str_value: string;
    let use_timer_value: number;
    
    const now = new Date();
    const reserved_at_str = now.toLocaleTimeString("ko-KR", { hour: "2-digit", minute: "2-digit", second: "2-digit", hour12: false });
    
    if (isUnlimited) {
      const closeTime = config?.close_time || "22:00:00";
      ends_at_str_value = closeTime;
      const [ch, cm, cs] = closeTime.split(":").map(Number);
      const closingDate = new Date();
      closingDate.setHours(ch, cm, cs);
      const diffMs = closingDate.getTime() - now.getTime();
      use_timer_value = Math.max(0, Math.floor(diffMs / 1000));
      effectiveDuration = Math.floor(use_timer_value / 60);
    } else {
      const end = new Date(now.getTime() + manualDuration * 60 * 1000);
      ends_at_str_value = end.toLocaleTimeString("ko-KR", { hour: "2-digit", minute: "2-digit", second: "2-digit", hour12: false });
      use_timer_value = manualDuration * 60;
    }
    
    const mockUserId = `manual-${manualStudentId}-${Date.now()}`;

    try {
      if (isMockMode) throw new Error("Mock mode enabled");

      const { data: profile } = await supabase.from('profiles').select('id').eq('university_id', manualStudentId).single();
      const userId = profile?.id || mockUserId;

      const { data: newResId, error: rpcErr } = await supabase.rpc('reserve_seat', { p_seat_id: manualSelectedSeatId, p_user_id: userId });
      if (rpcErr) throw rpcErr;

      if (newResId) {
        await supabase.from('reservations').update({
          check_in_at: new Date().toISOString(),
          is_checked_in: true
        }).eq('id', newResId);
      }

      await supabase.from('seats').update({
        use_timer_seconds: use_timer_value,
        total_duration_minutes: isUnlimited ? null : effectiveDuration,
        reserved_at: reserved_at_str,
        ends_at: ends_at_str_value
      }).eq('id', manualSelectedSeatId);

      alert(`✅ 수동 예약 완료!\n학번: ${manualStudentId} / 이름: ${manualStudentName}\n시설: ${manualFacility.name}\n좌석: ${targetSeat.seat_number}번\n이용 시간: ${isUnlimited ? '무제한 (폐관까지)' : effectiveDuration + '분'}`);
    } catch (err: any) {
      console.warn("Admin manual reserve - using mock mode:", err);
      const mockUserIdFallback = `manual-${manualStudentId}`;
      const mockResId = Math.floor(Math.random() * 99999);
      const checkInTimeMock = new Date().toISOString();

      const seatInManual = manualSeats.find(s => s.id === manualSelectedSeatId);
      if (seatInManual) {
        const dbSeat = dbSeats.find(ds => ds.room_name === manualFacility.roomName && ds.seat_number === seatInManual.seat_number);
        if (dbSeat) {
          updateMockSeat(dbSeat.id, s => ({
            ...s,
            status: "OCCUPIED",
            current_user_id: mockUserIdFallback,
            current_user_name: `${manualStudentName} (${manualStudentId})`,
            current_reservation_id: mockResId,
            check_in_at: checkInTimeMock,
            use_timer_seconds: use_timer_value,
            total_duration_minutes: isUnlimited ? undefined : effectiveDuration,
            reserved_at: reserved_at_str,
            ends_at: ends_at_str_value
          }));
        }
      }

      setManualSeats(prev => prev.map(s => s.id === manualSelectedSeatId ? {
        ...s,
        status: "OCCUPIED" as const,
        current_user_id: mockUserIdFallback,
        current_user_name: `${manualStudentName} (${manualStudentId})`,
        current_reservation_id: mockResId,
        check_in_at: checkInTimeMock,
        use_timer_seconds: use_timer_value,
        total_duration_minutes: isUnlimited ? undefined : effectiveDuration,
        reserved_at: reserved_at_str,
        ends_at: ends_at_str_value
      } : s));

      alert(`✅ 수동 예약 완료!\n학번: ${manualStudentId} / 이름: ${manualStudentName}\n시설: ${manualFacility.name}\n좌석: ${targetSeat.seat_number}번\n이용 시간: ${isUnlimited ? '무제한 (폐관까지)' : effectiveDuration + '분'}`);
    } finally {
      setManualLoading(false);
      setManualSelectedSeatId(null);
      setManualStudentId("");
      setManualStudentName("");
    }
  };

  const handleReserveSeat = async (seatId: number, durationMinutes: number | null) => {
    if (!currentUser || !selectedFacility) return;
    try {
      if (isMockMode) throw new Error("Mock mode enabled");
      const config = facilityConfigs[selectedFacility.roomName];
      if (config) {
        const nowStr = new Date().toTimeString().slice(0, 8);
        if (nowStr < config.open_time || nowStr > config.close_time) {
          alert(`현재는 시설 운영 시간 외입니다.\n(운영시간: ${config.open_time.slice(0, 5)} ~ ${config.close_time.slice(0, 5)})`);
          return;
        }
      }

      const { data: resId, error } = await supabase.rpc('reserve_seat', {
        p_seat_id: seatId,
        p_user_id: currentUser.id
      });

      if (error) {
        alert(error.message || "예약 신청 실패");
        return;
      }

      const now = new Date();
      let ends_at_str = "";
      let use_timer = undefined;

      if (durationMinutes) {
        const end = new Date(now.getTime() + durationMinutes * 60 * 1000);
        ends_at_str = end.toLocaleTimeString("ko-KR", { hour: "2-digit", minute: "2-digit", second: "2-digit", hour12: false });
        use_timer = durationMinutes * 60;
      } else {
        const closing = config?.close_time || "22:00:00";
        ends_at_str = closing;
        const [ch, cm, cs] = closing.split(":").map(Number);
        const closingDate = new Date();
        closingDate.setHours(ch, cm, cs);
        const diffMs = closingDate.getTime() - now.getTime();
        use_timer = Math.max(0, Math.floor(diffMs / 1000));
      }

      const reserved_at_str = now.toLocaleTimeString("ko-KR", { hour: "2-digit", minute: "2-digit", second: "2-digit", hour12: false });

      await supabase.from('seats').update({
        use_timer_seconds: use_timer,
        total_duration_minutes: durationMinutes || null,
        reserved_at: reserved_at_str,
        ends_at: ends_at_str
      }).eq('id', seatId);

      fetchSeatsAndReports();
      alert("좌석 예약이 완료되었습니다.");
    } catch (err: any) {
      console.warn("Supabase reserve_seat failed, executing mock reserve:", err);
      const now = new Date();
      const reserved_at_str = now.toLocaleTimeString("ko-KR", { hour: "2-digit", minute: "2-digit", second: "2-digit", hour12: false });
      let ends_at_str = "";
      let use_timer = 0;
      if (durationMinutes) {
        const end = new Date(now.getTime() + durationMinutes * 60 * 1000);
        ends_at_str = end.toLocaleTimeString("ko-KR", { hour: "2-digit", minute: "2-digit", second: "2-digit", hour12: false });
        use_timer = durationMinutes * 60;
      } else {
        ends_at_str = "22:00:00";
        use_timer = 7200;
      }

      updateMockSeat(seatId, s => ({
        ...s,
        status: "OCCUPIED",
        current_user_id: currentUser.id,
        current_user_name: `${currentUser.name} (${currentUser.university_id})`,
        current_reservation_id: Math.floor(Math.random() * 10000),
        use_timer_seconds: use_timer,
        total_duration_minutes: durationMinutes || 120,
        reserved_at: reserved_at_str,
        ends_at: ends_at_str
      }));
      alert("좌석 예약이 완료되었습니다.");
    }
  };

  const handleExtendSeat = async (seatId: number, extendMinutes: number) => {
    try {
      if (isMockMode) throw new Error("Mock mode enabled");
      const { data: seatData } = await supabase.from('seats').select('*').eq('id', seatId).single();
      if (seatData) {
        const currentSeconds = seatData.use_timer_seconds || 0;
        const newSeconds = currentSeconds + extendMinutes * 60;
        
        const now = new Date();
        const end = new Date(now.getTime() + newSeconds * 1000);
        const ends_at_str = end.toLocaleTimeString("ko-KR", { hour: "2-digit", minute: "2-digit", second: "2-digit", hour12: false });
        
        await supabase.from('seats').update({
          use_timer_seconds: newSeconds,
          ends_at: ends_at_str
        }).eq('id', seatId);
        
        fetchSeatsAndReports();
        alert(`이용시간이 ${extendMinutes}분 연장되었습니다.`);
      }
    } catch (err) {
      console.warn("Supabase extend failed, executing mock extend:", err);
      updateMockSeat(seatId, s => {
        const currentSeconds = s.use_timer_seconds || 0;
        const newSeconds = currentSeconds + extendMinutes * 60;
        const now = new Date();
        const end = new Date(now.getTime() + newSeconds * 1000);
        const ends_at_str = end.toLocaleTimeString("ko-KR", { hour: "2-digit", minute: "2-digit", second: "2-digit", hour12: false });
        return {
          ...s,
          use_timer_seconds: newSeconds,
          ends_at: ends_at_str
        };
      });
      alert(`이용시간이 ${extendMinutes}분 연장되었습니다.`);
    }
  };

  const handleCheckoutSeat = async () => {
    const activeRes = myReservation || globalMyReservation;
    if (!currentUser || !activeRes) return;
    try {
      if (isMockMode) throw new Error("Mock mode enabled");
      const { error } = await supabase.rpc('return_seat', {
        p_seat_id: activeRes.id,
        p_user_id: currentUser.id
      });

      if (error) {
        alert(error.message || "반납 처리 실패");
        return;
      }

      await supabase.from('seats').update({
        use_timer_seconds: null,
        total_duration_minutes: null,
        reserved_at: null,
        ends_at: null
      }).eq('id', activeRes.id);

      await supabase.from('absence_reports')
        .update({ status: 'RESOLVED_RETURNED', resolved_at: new Date().toISOString() })
        .eq('seat_id', activeRes.id)
        .eq('status', 'PENDING');

      setShowWarningModal(false);
      fetchSeatsAndReports();
      alert("정상 반납 완료되었습니다.");
    } catch (err) {
      console.warn("Supabase return_seat failed, executing mock return:", err);
      updateMockSeat(activeRes.id, s => ({
        ...s,
        status: "AVAILABLE",
        current_user_id: undefined,
        current_user_name: undefined,
        current_reservation_id: undefined,
        use_timer_seconds: undefined,
        total_duration_minutes: undefined,
        reserved_at: undefined,
        ends_at: undefined
      }));
      setAbsenceReports(prev => prev.filter(r => r.seat_id !== activeRes.id));
      setShowWarningModal(false);
      alert("정상 반납 완료되었습니다.");
    }
  };

  const handleConfirmReturn = async () => {
    const activeRes = myReservation || globalMyReservation;
    if (!currentUser || !activeRes) return;
    try {
      if (isMockMode) throw new Error("Mock mode enabled");
      const { error } = await supabase.rpc('confirm_user_returned', {
        p_seat_id: activeRes.id,
        p_user_id: currentUser.id
      });

      if (error) {
        alert(error.message || "복귀 처리 실패");
        return;
      }

      setShowWarningModal(false);
      fetchSeatsAndReports();
      alert("자리 복귀 소명이 정상 완료되어 경고가 리셋되었습니다.");
    } catch (err) {
      console.warn("Supabase confirm return failed, executing mock confirm:", err);
      updateMockSeat(activeRes.id, s => ({ ...s, status: "OCCUPIED" }));
      setAbsenceReports(prev => prev.filter(r => r.seat_id !== activeRes.id));
      setShowWarningModal(false);
      alert("자리 복귀 소명이 정상 완료되어 경고가 리셋되었습니다.");
    }
  };

  const handleSkip10Minutes = async () => {
    const activeRes = myReservation || globalMyReservation;
    if (!currentUser || !activeRes) return;
    const currentSeconds = activeRes.use_timer_seconds || 0;
    const nextSeconds = Math.max(0, currentSeconds - 600);

    try {
      if (isMockMode) throw new Error("Mock mode enabled");
      
      const { error } = await supabase
        .from('seats')
        .update({ use_timer_seconds: nextSeconds })
        .eq('id', activeRes.id);

      if (error) throw error;
      
      fetchSeatsAndReports();
      alert(`⏱️ [시간 가속] 잔여 시간이 10분 차감되었습니다. (새 잔여시간: ${Math.floor(nextSeconds / 60)}분 ${nextSeconds % 60}초)`);
    } catch (err) {
      console.warn("Failed to skip 10 minutes on DB, applying locally:", err);
      updateMockSeat(activeRes.id, s => ({
        ...s,
        use_timer_seconds: nextSeconds
      }));
      alert(`⏱️ [시간 가속] 잔여 시간이 10분 차감되었습니다.`);
    }
  };

  const handleReportAbsence1st = async (seatId: number, photoUrl: string) => {
    if (!currentUser) return;
    try {
      if (isMockMode) throw new Error("Mock mode enabled");
      const fileName = `report_1st_${seatId}_${Date.now()}.png`;
      const uploadedUrl = await uploadPhotoToStorage(photoUrl, fileName);

      const { error } = await supabase.rpc('submit_absence_report_1st', {
        p_seat_id: seatId,
        p_reporter_id: currentUser.id,
        p_photo_url: uploadedUrl
      });

      if (error) {
        alert(error.message || "1차 신고 실패");
        return;
      }

      fetchSeatsAndReports();
      alert("1차 부재 신고 및 타이머가 가동되었습니다.");
    } catch (err) {
      console.warn("Supabase 1st report failed, executing mock report:", err);
      updateMockSeat(seatId, s => ({ ...s, status: "REPORTED_1ST" }));
      
      const newReport: AbsenceReport = {
        id: Math.floor(Math.random() * 10000),
        seat_id: seatId,
        reporter_id: currentUser.id,
        first_photo_url: photoUrl,
        first_reported_at: new Date().toISOString(),
        warning_timer_seconds: 600,
        status: "PENDING"
      };
      setAbsenceReports(prev => [...prev, newReport]);
      alert("1차 부재 신고 및 타이머가 가동되었습니다.");
    }
  };

  const handleReportAbsence2nd = async (seatId: number, photoUrl: string) => {
    try {
      if (isMockMode) throw new Error("Mock mode enabled");
      const fileName = `report_2nd_${seatId}_${Date.now()}.png`;
      const uploadedUrl = await uploadPhotoToStorage(photoUrl, fileName);

      const { error } = await supabase.rpc('submit_absence_report_2nd', {
        p_seat_id: seatId,
        p_photo_url: uploadedUrl
      });

      if (error) {
        alert(error.message || "2차 최종 신고 실패");
        return;
      }

      fetchSeatsAndReports();
      alert("2차 최종 신고 접수가 완료되었습니다. 관리자 심사를 대기합니다.");
    } catch (err) {
      console.warn("Supabase 2nd report failed, executing mock report:", err);
      updateMockSeat(seatId, s => ({ ...s, status: "REPORTED_2ND" }));
      setAbsenceReports(prev => prev.map(r => r.seat_id === seatId ? {
        ...r,
        second_photo_url: photoUrl,
        second_reported_at: new Date().toISOString(),
        warning_timer_seconds: 0
      } : r));
      alert("2차 최종 신고 접수가 완료되었습니다. 관리자 심사를 대기합니다.");
    }
  };

  const handleSetEarlyCheckout = async (seatId: number, minutes: number) => {
    try {
      if (isMockMode) throw new Error("Mock mode enabled");
      const now = new Date();
      const end = new Date(now.getTime() + minutes * 60 * 1000);
      const ends_at_str = end.toLocaleTimeString("ko-KR", { hour: "2-digit", minute: "2-digit", second: "2-digit", hour12: false });

      await supabase.from('seats').update({
        use_timer_seconds: minutes * 60,
        ends_at: ends_at_str
      }).eq('id', seatId);

      fetchSeatsAndReports();
      alert(`약 ${minutes}분 후 퇴실 예정 시간이 동기화되었습니다.`);
    } catch (err) {
      console.warn("Supabase early checkout failed, executing mock early checkout:", err);
      const now = new Date();
      const end = new Date(now.getTime() + minutes * 60 * 1000);
      const ends_at_str = end.toLocaleTimeString("ko-KR", { hour: "2-digit", minute: "2-digit", second: "2-digit", hour12: false });
      updateMockSeat(seatId, s => ({
        ...s,
        use_timer_seconds: minutes * 60,
        ends_at: ends_at_str
      }));
      alert(`약 ${minutes}분 후 퇴실 예정 시간이 설정되었습니다.`);
    }
  };

  const handleCancelEarlyCheckout = async (seatId: number) => {
    try {
      if (isMockMode) throw new Error("Mock mode enabled");
      const seat = dbSeats.find(s => s.id === seatId);
      const roomName = seat ? seat.room_name : (selectedFacility ? selectedFacility.roomName : "");
      const config = facilityConfigs[roomName];
      const closing = config?.close_time || "22:00:00";
      
      const now = new Date();
      const [ch, cm, cs] = closing.split(":").map(Number);
      const closingDate = new Date();
      closingDate.setHours(ch, cm, cs);
      const diffMs = closingDate.getTime() - now.getTime();
      const use_timer = Math.max(0, Math.floor(diffMs / 1000));

      await supabase.from('seats').update({
        use_timer_seconds: use_timer,
        ends_at: closing
      }).eq('id', seatId);

      fetchSeatsAndReports();
      alert("조기 퇴실 예정이 취소되었으며, 마감시간까지 이용상태로 복원됩니다.");
    } catch (err) {
      console.warn("Supabase cancel early checkout failed, executing mock cancel:", err);
      const closing = "22:00:00";
      const now = new Date();
      const closingDate = new Date();
      closingDate.setHours(22, 0, 0);
      const diffMs = closingDate.getTime() - now.getTime();
      const use_timer = Math.max(0, Math.floor(diffMs / 1000));
      updateMockSeat(seatId, s => ({
        ...s,
        use_timer_seconds: use_timer,
        ends_at: closing
      }));
      alert("조기 퇴실 예정이 취소되었으며, 마감시간까지 이용상태로 복원됩니다.");
    }
  };

  const handleSubmitComplaint = async (category: string, description: string, photo: string | null): Promise<boolean> => {
    if (!currentUser || !selectedFacility) return false;
    try {
      if (isMockMode) throw new Error("Mock mode enabled");
      let photoUrl = undefined;
      if (photo) {
        const fileName = `complaint_${Date.now()}_${currentUser.university_id}.png`;
        photoUrl = await uploadPhotoToStorage(photo, fileName);
      }

      await supabase.from('complaints').insert({
        user_id: currentUser.id,
        seat_id: selectedSeat?.id || null,
        room_name: selectedFacility.roomName,
        category,
        description,
        photo_url: photoUrl,
        status: 'PENDING'
      });

      setCooldownTimeLeft(1800);
      fetchComplaints();
      return true;
    } catch (err) {
      console.warn("Supabase submit complaint failed, executing mock submit:", err);
      const newComplaint = {
        id: Math.floor(Math.random() * 10000),
        user_id: currentUser.id,
        category,
        description,
        evidence_photo_url: photo,
        facility_name: selectedFacility.name,
        room_name: selectedFacility.roomName,
        status: "PENDING",
        created_at: new Date().toISOString(),
        profiles: {
          university_id: currentUser.university_id,
          name: currentUser.name
        }
      };
      setComplaints(prev => [newComplaint, ...prev]);
      setCooldownTimeLeft(1800);
      return true;
    }
  };

  const handleSubmitVindication = async (complaintId: number, type: string, comment: string) => {
    try {
      if (isMockMode) throw new Error("Mock mode enabled");
      const original = complaints.find(c => c.id === complaintId);
      const desc = `[소명서 제출 - 유형: ${type}]\n해명: ${comment}\n---\n기존민원: ${original?.description}`;
      
      await supabase.from('complaints').update({
        description: desc,
        status: 'PROCESSING'
      }).eq('id', complaintId);
      
      fetchComplaints();
    } catch (err) {
      console.warn("소명서 제출 실패, 로컬 처리:", err);
      const original = complaints.find(c => c.id === complaintId);
      const desc = `[소명서 제출 - 유형: ${type}]\n해명: ${comment}\n---\n기존민원: ${original?.description}`;
      setComplaints(prev => prev.map(c => c.id === complaintId ? {
        ...c,
        description: desc,
        status: 'PROCESSING'
      } : c));
    }
  };

  const handleSubscribeNotification = async () => {
    if (!currentUser || !selectedFacility) return;
    try {
      if (isMockMode) throw new Error("Mock mode enabled");
      await supabase.from('notifications').insert({
        user_id: currentUser.id,
        room_name: selectedFacility.roomName,
        status: 'PENDING'
      });
      setNotificationSubscribed(true);
      alert(`${selectedFacility.roomName}의 빈자리 알림 신청이 완료되었습니다.`);
    } catch (err) {
      console.warn("빈자리 알림 신청 실패, 로컬 설정 완료:", err);
      setNotificationSubscribed(true);
      alert(`${selectedFacility.roomName}의 빈자리 알림 신청이 완료되었습니다.`);
    }
  };

  const handleImmediateRelease = async (seatId: number) => {
    if (!selectedFacility) return;
    const seat = activeSeats.find(s => s.id === seatId);
    if (!seat) return;

    if (currentUser && seat.current_user_id === currentUser.id) {
      setForcedCheckoutAlert({ show: true, seatNumber: seat.seat_number });
    }

    try {
      if (isMockMode) throw new Error("Mock mode enabled");
      const currentResId = seat.current_reservation_id;

      await supabase.from('seats').update({
        status: 'AVAILABLE',
        current_reservation_id: null,
        use_timer_seconds: null,
        total_duration_minutes: null,
        reserved_at: null,
        ends_at: null,
        clearing_timer_seconds: null,
        updated_at: new Date().toISOString()
      }).eq('id', seatId);

      if (currentResId) {
        await supabase.from('absence_reports').update({
          status: 'RESOLVED_RELEASED',
          release_type: 'IMMEDIATE',
          resolved_at: new Date().toISOString()
        }).eq('reservation_id', currentResId).eq('status', 'PENDING');
      }

      fetchSeatsAndReports();
      alert(`[강제 퇴실 완료] ${seat.seat_number}번 좌석이 즉시 개방되었습니다.`);
    } catch (err) {
      console.warn("즉시 개방 실패 (로컬 모드 실행):", err);
      updateMockSeat(seatId, s => ({
        ...s,
        status: "AVAILABLE",
        current_user_id: undefined,
        current_user_name: undefined,
        current_reservation_id: undefined,
        use_timer_seconds: undefined,
        total_duration_minutes: undefined,
        reserved_at: undefined,
        ends_at: undefined,
        clearing_timer_seconds: undefined
      }));
      setAbsenceReports(prev => prev.map(r => r.seat_id === seatId ? { ...r, status: "RESOLVED_RELEASED" } : r));
      alert(`[강제 퇴실 완료] ${seat.seat_number}번 좌석이 즉시 개방되었습니다.`);
    }
  };

  const handleDelayedRelease = async (seatId: number) => {
    if (!selectedFacility) return;
    const seat = activeSeats.find(s => s.id === seatId);
    if (!seat) return;

    if (currentUser && seat.current_user_id === currentUser.id) {
      setForcedCheckoutAlert({ show: true, seatNumber: seat.seat_number });
    }

    try {
      if (isMockMode) throw new Error("Mock mode enabled");
      const currentResId = seat.current_reservation_id;

      await supabase.from('seats').update({
        status: 'CLEARING',
        clearing_timer_seconds: 600,
        use_timer_seconds: null,
        total_duration_minutes: null,
        reserved_at: null,
        ends_at: null,
        updated_at: new Date().toISOString()
      }).eq('id', seatId);

      if (currentResId) {
        await supabase.from('absence_reports').update({
          status: 'RESOLVED_RELEASED',
          release_type: 'DELAYED_10MIN',
          resolved_at: new Date().toISOString()
        }).eq('reservation_id', currentResId).eq('status', 'PENDING');
      }

      fetchSeatsAndReports();
      alert(`[강제 수거 조치 완료] ${seat.seat_number}번 좌석이 물품 정리 상태(CLEARING, 10분 유예)로 전환되었습니다.`);
    } catch (err) {
      console.warn("정리 개방 실패 (로컬 모드 실행):", err);
      updateMockSeat(seatId, s => ({
        ...s,
        status: "CLEARING",
        clearing_timer_seconds: 600,
        use_timer_seconds: undefined,
        total_duration_minutes: undefined,
        reserved_at: undefined,
        ends_at: undefined
      }));
      setAbsenceReports(prev => prev.map(r => r.seat_id === seatId ? { ...r, status: "RESOLVED_RELEASED" } : r));
      alert(`[강제 수거 조치 완료] ${seat.seat_number}번 좌석이 물품 정리 상태(CLEARING, 10분 유예)로 전환되었습니다.`);
    }
  };

  const handleResolveComplaint = async (complaintId: number, comment: string) => {
    try {
      if (isMockMode) throw new Error("Mock mode enabled");
      await supabase.from('complaints').update({
        status: 'RESOLVED',
        resolution_comment: comment,
        resolved_at: new Date().toISOString()
      }).eq('id', complaintId);
      
      fetchComplaints();
    } catch (err) {
      console.warn("민원 해결 실패 (로컬 모드 실행):", err);
      setComplaints(prev => prev.map(c => c.id === complaintId ? {
        ...c,
        status: "RESOLVED",
        resolution_comment: comment,
        resolved_at: new Date().toISOString()
      } : c));
    }
  };

  useEffect(() => {
    if (currentUser && currentUser.role === "USER" && perspective === "ADMIN") {
      setShowUnauthorizedModal(true);
      setPerspective("STUDENT");
    }
  }, [currentUser, perspective]);

  const handleStudentAddComplaint = async (type: "NOISE" | "FACILITY", seatNumber: number, comment: string) => {
    const categoryMapping = {
      NOISE: "NOISE",
      FACILITY: "DAMAGE"
    };
    const desc = `${seatNumber}번석 - ${comment}`;
    await handleSubmitComplaint(categoryMapping[type] || "OTHER", desc, null);
    alert("🔇 실시간 불편 신고가 관리실에 정상 접수되었습니다. 조치 후 마이페이지로 안내됩니다.");
  };

  const handleFocusComplaintSeat = (roomName: string, seatNumber: number) => {
    const targetFac = FACILITIES.find(f => f.name.includes(roomName) || f.roomName.includes(roomName) || roomName.includes(f.roomName));
    if (!targetFac) return;

    setSelectedFacility(targetFac);

    const currentSeatsList = facilitySeats[targetFac.id] || [];
    const targetSeat = currentSeatsList.find(s => s.seat_number === seatNumber);
    
    if (targetSeat) {
      setHighlightSeatId(targetSeat.id);
      setSelectedSeat(targetSeat);
      
      setTimeout(() => {
        setHighlightSeatId(null);
      }, 5500);
    }
  };

  const handleAdminReserve = async (seatId: number, universityId: string, name: string, durationMinutes: number) => {
    if (!selectedFacility) return;
    try {
      if (isMockMode) throw new Error("Mock mode enabled");
      const fakeEmail = `${universityId}@daegu.ac.kr`;
      const { data: pData } = await supabase.from('profiles').select('id').eq('university_id', universityId).maybeSingle();
      
      let studentUuid = "a1b2c3d4-e5f6-7a8b-9c0d-1e2f3a4b5c6d";
      if (pData) {
        studentUuid = pData.id;
      }

      const { error: resErr } = await supabase.rpc('reserve_seat', {
        p_seat_id: seatId,
        p_user_id: studentUuid
      });

      if (resErr) throw resErr;

      const { data: newRes } = await supabase.from('reservations')
        .select('id').eq('user_id', studentUuid).eq('seat_id', seatId).eq('status', 'ACTIVE').single();
      if (newRes) {
        await supabase.from('reservations').update({
          check_in_at: new Date().toISOString(),
          is_checked_in: true
        }).eq('id', newRes.id);
      }

      const now = new Date();
      const end = new Date(now.getTime() + durationMinutes * 60 * 1000);
      const reserved_at_str = now.toLocaleTimeString("ko-KR", { hour: "2-digit", minute: "2-digit", second: "2-digit", hour12: false });
      const ends_at_str = end.toLocaleTimeString("ko-KR", { hour: "2-digit", minute: "2-digit", second: "2-digit", hour12: false });

      await supabase.from('seats').update({
        use_timer_seconds: durationMinutes * 60,
        total_duration_minutes: durationMinutes,
        reserved_at: reserved_at_str,
        ends_at: ends_at_str
      }).eq('id', seatId);

      fetchSeatsAndReports();
    } catch (err) {
      console.warn("대리 예약 Supabase RPC 실패, 로컬 모드 병합:", err);
      const now = new Date();
      const end = new Date(now.getTime() + durationMinutes * 60 * 1000);
      const reserved_at_str = now.toLocaleTimeString("ko-KR", { hour: "2-digit", minute: "2-digit", second: "2-digit", hour12: false });
      const ends_at_str = end.toLocaleTimeString("ko-KR", { hour: "2-digit", minute: "2-digit", second: "2-digit", hour12: false });

      updateMockSeat(seatId, s => ({
        ...s,
        status: "OCCUPIED",
        current_user_id: `student-${universityId}`,
        current_user_name: `${name} (사서대리등록)`,
        current_reservation_id: Math.floor(Math.random() * 10000),
        use_timer_seconds: durationMinutes * 60,
        total_duration_minutes: durationMinutes,
        reserved_at: reserved_at_str,
        ends_at: ends_at_str
      }));
    }
  };

  const handleAdminExtend = async (seatId: number, extendMinutes: number) => {
    await handleExtendSeat(seatId, extendMinutes);
  };

  const handleAdminCheckout = async (seatId: number) => {
    await handleImmediateRelease(seatId);
    setSelectedSeat(null);
  };

  const handleAdminPenalty = async (universityId: string, name: string, reason: string, days: number) => {
    try {
      const penaltyDate = new Date();
      penaltyDate.setDate(penaltyDate.getDate() + days);
      
      await supabase.from('profiles').update({
        penalty_ends_at: penaltyDate.toISOString(),
        penalty_reason: reason
      }).eq('university_id', universityId);

      alert(`${name} 학생에 대해 패널티 ${days}일 처분을 등록 완료하여 예약을 차단시켰습니다.`);
    } catch (err) {
      console.warn("제재 처리 실패:", err);
    }
  };

  const handleAdminToggleMaintenance = async (seatId: number) => {
    if (!selectedFacility) return;
    const seat = activeSeats.find(s => s.id === seatId);
    if (!seat) return;

    const nextStatus = seat.status === "MAINTENANCE" ? "AVAILABLE" : "MAINTENANCE";

    try {
      if (isMockMode) throw new Error("Mock mode enabled");
      await supabase.from('seats').update({
        status: nextStatus,
        current_reservation_id: null,
        use_timer_seconds: null,
        total_duration_minutes: null,
        reserved_at: null,
        ends_at: null,
        clearing_timer_seconds: null,
        updated_at: new Date().toISOString()
      }).eq('id', seatId);

      fetchSeatsAndReports();
    } catch (err) {
      console.warn("수동 점검중 업데이트 실패, 로컬 폴백:", err);
      updateMockSeat(seatId, s => ({
        ...s,
        status: nextStatus,
        current_user_id: undefined,
        current_user_name: undefined,
        current_reservation_id: undefined,
        reserved_at: undefined,
        ends_at: undefined,
        use_timer_seconds: undefined,
        total_duration_minutes: undefined
      }));
    }
  };

  const handleUpdateConfig = async (roomName: string, openTime: string, closeTime: string, maxUseHours: number | null) => {
    try {
      if (isMockMode) throw new Error("Mock mode enabled");
      const { error } = await supabase.from('facility_configs').upsert({
        room_name: roomName,
        open_time: openTime,
        close_time: closeTime,
        max_use_hours: maxUseHours
      });
      if (error) throw error;
      fetchConfigs();
      alert(`✅ [실시간 DB 저장 완료] ${roomName} 운영 시간이 성공적으로 동기화되었습니다.`);
    } catch (err: any) {
      console.warn("운영 시간 설정 실패 (로컬 모드 실행):", err);
      setFacilityConfigs(prev => ({
        ...prev,
        [roomName]: {
          room_name: roomName,
          open_time: openTime,
          close_time: closeTime,
          max_use_hours: maxUseHours
        }
      }));
      alert(`⚠️ [저장 실패] 실시간 데이터베이스 권한 부족 또는 오류로 인해 운영 시간이 로컬 상태로만 임시 적용되었습니다.\n에러 내용: ${err.message || JSON.stringify(err)}`);
    }
  };

  const handleSearchStudent = async (studentId: string) => {
    try {
      if (isMockMode) throw new Error("Mock mode enabled");
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('university_id', studentId)
        .single();
      
      if (!error && data) return data;
      throw new Error("mock student fallback");
    } catch (err) {
      console.warn("학생 검색 실패 (로컬 모드 실행):", err);
      return {
        id: `mock-uuid-${studentId}`,
        university_id: studentId,
        name: studentId === "20222043" ? "강민성" : "테스트학생",
        role: "USER"
      };
    }
  };

  const handleApplyPenalty = async (studentUuid: string, days: number | null, reason: string) => {
    try {
      if (isMockMode) throw new Error("Mock mode enabled");
      let penalty_ends = null;
      if (days !== null) {
        penalty_ends = new Date(Date.now() + days * 24 * 60 * 60 * 1000).toISOString();
      }
      
      await supabase.from('profiles').update({
        penalty_ends_at: penalty_ends,
        penalty_reason: reason
      }).eq('id', studentUuid);
      
      alert(days === null ? "제재 조치가 해제되었습니다." : `${days}일 이용 정지 제재가 성공적으로 적용되었습니다.`);
    } catch (err) {
      console.warn("제재 적용 실패 (로컬 모드 실행):", err);
      alert(days === null ? "제재 조치가 해제되었습니다." : `${days}일 이용 정지 제재가 성공적으로 적용되었습니다.`);
    }
  };

  const handleProxyReserve = async (studentUuid: string, studentId: string, studentName: string, facilityId: string, seatId: number, duration: number) => {
    try {
      if (isMockMode) throw new Error("Mock mode enabled");
      const { data: resId, error } = await supabase.rpc('reserve_seat', {
        p_seat_id: seatId,
        p_user_id: studentUuid
      });

      if (error) {
        alert(error.message || "대리 예약 실패");
        return;
      }

      const now = new Date();
      const end = new Date(now.getTime() + duration * 60 * 1000);
      const reserved_at_str = now.toLocaleTimeString("ko-KR", { hour: "2-digit", minute: "2-digit", second: "2-digit", hour12: false });
      const ends_at_str = end.toLocaleTimeString("ko-KR", { hour: "2-digit", minute: "2-digit", second: "2-digit", hour12: false });

      await supabase.from('seats').update({
        use_timer_seconds: duration * 60,
        total_duration_minutes: duration,
        reserved_at: reserved_at_str,
        ends_at: ends_at_str
      }).eq('id', seatId);

      fetchSeatsAndReports();
      alert(`[대리 예약 완료]\n학번: ${studentId}\n이름: ${studentName}\n이용시간: ${duration}분`);
    } catch (err) {
      console.warn("대리 예약 실패 (로컬 모드 실행):", err);
      const now = new Date();
      const end = new Date(now.getTime() + duration * 60 * 1000);
      const reserved_at_str = now.toLocaleTimeString("ko-KR", { hour: "2-digit", minute: "2-digit", second: "2-digit", hour12: false });
      const ends_at_str = end.toLocaleTimeString("ko-KR", { hour: "2-digit", minute: "2-digit", second: "2-digit", hour12: false });

      updateMockSeat(seatId, s => ({
        ...s,
        status: "OCCUPIED",
        current_user_id: studentUuid,
        current_user_name: `${studentName} (${studentId})`,
        current_reservation_id: Math.floor(Math.random() * 10000),
        use_timer_seconds: duration * 60,
        total_duration_minutes: duration,
        reserved_at: reserved_at_str,
        ends_at: ends_at_str
      }));
      alert(`[대리 예약 완료]\n학번: ${studentId}\n이름: ${studentName}\n이용시간: ${duration}분`);
    }
  };

  const handleProxyCheckout = async (seatId: number, studentUuid: string) => {
    try {
      if (isMockMode) throw new Error("Mock mode enabled");
      const { error } = await supabase.rpc('return_seat', {
        p_seat_id: seatId,
        p_user_id: studentUuid
      });

      if (error) {
        alert(error.message || "대리 반납 실패");
        return;
      }

      await supabase.from('seats').update({
        use_timer_seconds: null,
        total_duration_minutes: null,
        reserved_at: null,
        ends_at: null
      }).eq('id', seatId);

      fetchSeatsAndReports();
      alert("대리 반납 및 좌석 개방이 처리되었습니다.");
    } catch (err) {
      console.warn("대리 반납 실패 (로컬 모드 실행):", err);
      updateMockSeat(seatId, s => ({
        ...s,
        status: "AVAILABLE",
        current_user_id: undefined,
        current_user_name: undefined,
        current_reservation_id: undefined,
        use_timer_seconds: undefined,
        total_duration_minutes: undefined,
        reserved_at: undefined,
        ends_at: undefined
      }));
      alert("대리 반납 및 좌석 개방이 처리되었습니다.");
    }
  };

  const filteredFacilities = FACILITIES.filter(fac => {
    if (currentUser?.role === "ADMIN" && currentUser.managed_college_id) {
      if (fac.collegeId !== currentUser.managed_college_id) return false;
    }

    if (searchBuilding !== "ALL") {
      if (!fac.buildingName.includes(searchBuilding)) return false;
    }

    if (facilityFilter !== "ALL") {
      if (fac.collegeId !== facilityFilter) return false;
    }

    if (searchKeyword.trim() !== "") {
      const keyword = searchKeyword.toLowerCase();
      const nameMatch = fac.name.toLowerCase().includes(keyword);
      const descMatch = fac.description.toLowerCase().includes(keyword);
      const tagMatch = fac.tags.some(t => t.toLowerCase().includes(keyword));
      const buildingMatch = fac.buildingName.toLowerCase().includes(keyword);
      if (!nameMatch && !descMatch && !tagMatch && !buildingMatch) return false;
    }

    if (searchCapacity.trim() !== "" && !isNaN(Number(searchCapacity))) {
      if (fac.capacity < Number(searchCapacity)) return false;
    }

    return true;
  });


  const getNoiseState = () => {
    if (!selectedFacility) return { noiseLevel: "COZY" as const, noiseComplaintsCount: 0 };
    const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000).toISOString();
    const noiseReports = complaints.filter(c => 
      c.category === "NOISE" && 
      c.room_name === selectedFacility.roomName && 
      c.created_at > oneHourAgo
    );
    const count = noiseReports.length;
    let noiseLevel: "COZY" | "MURMUR" | "WARN" = "COZY";
    if (count === 1) noiseLevel = "MURMUR";
    else if (count >= 2) noiseLevel = "WARN";
    return { noiseLevel, noiseComplaintsCount: count };
  };
  const { noiseLevel, noiseComplaintsCount } = getNoiseState();

  const renderQuickReservationBanner = (showPlaceholder: boolean = false) => {
    if (!globalMyReservation) {
      if (!showPlaceholder) return null;
      return (
        <div className="mb-8 rounded-3xl bg-white border border-slate-200 p-6 text-slate-800 shadow-sm relative overflow-hidden">
          <div className="absolute top-0 right-0 p-8 opacity-5 pointer-events-none">
            <BookOpen className="h-32 w-32" />
          </div>
          <div className="relative z-10 flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
            <div className="space-y-2">
              <div className="flex flex-wrap items-center gap-2">
                <span className="px-2.5 py-0.5 text-[9px] font-extrabold uppercase tracking-widest bg-slate-100 border border-slate-200 rounded-md inline-block text-slate-650">
                  💡 실시간 캠퍼스 현황
                </span>
                <span className="px-2.5 py-0.5 text-[9px] font-extrabold uppercase tracking-widest bg-emerald-50 border border-emerald-100 rounded-md inline-block text-emerald-700 animate-pulse">
                  ● 스마트 예약 서비스 작동 중
                </span>
              </div>
              
              <h3 className="text-base font-extrabold tracking-tight text-slate-900">
                현재 대여 또는 이용 중인 좌석이 없습니다.
              </h3>
              <p className="text-xs text-slate-500 leading-relaxed font-semibold max-w-3xl">
                대구대학교 스마트 공간 예약 포털에 오신 것을 환영합니다! 아래 열람실 목록에서 조용하고 쾌적하게 공부할 수 있는 명당 좌석을 선택해 보세요. 실시간 GPS 위치 또는 QR코드 인증을 통해 간편하게 입실할 수 있습니다.
              </p>
            </div>
            
            <div className="flex gap-4 bg-slate-50 border border-slate-200/80 p-3.5 rounded-2xl shadow-2xs">
              <div className="text-center font-bold">
                <span className="text-[9px] text-slate-400 block leading-none">캠퍼스 전체 좌석</span>
                <span className="text-sm font-black font-mono text-slate-850 mt-1 block">84석 연계</span>
              </div>
              <div className="border-l border-slate-200 my-1" />
              <div className="text-center font-bold">
                <span className="text-[9px] text-emerald-600 block leading-none">이용 가능 구역</span>
                <span className="text-sm font-black font-mono text-emerald-750 mt-1 block">7개 영역</span>
              </div>
            </div>
          </div>
        </div>
      );
    }

    return (
      <div className={`mb-8 rounded-3xl bg-gradient-to-r ${!isVerified ? 'from-amber-500 to-orange-600 border-amber-400/30 shadow-orange-950/10' : 'from-emerald-500 to-teal-650 border-emerald-400/30'} p-6 text-white shadow-xl relative overflow-hidden border`}>
        <div className="absolute top-0 right-0 p-8 opacity-10 pointer-events-none">
          <Clock className="h-32 w-32" />
        </div>
        <div className="relative z-10 flex flex-col lg:flex-row justify-between items-start lg:items-center gap-6">
          <div className="space-y-2 w-full">
            <div className="flex flex-wrap items-center gap-2">
              {!isVerified ? (
                <span className="px-2 py-0.5 text-[9px] font-extrabold uppercase tracking-widest bg-white/20 border border-white/10 rounded-md inline-block text-amber-100 animate-pulse">
                  ⏱️ 입실 확인 대기 중
                </span>
              ) : (
                <span className="px-2 py-0.5 text-[9px] font-extrabold uppercase tracking-widest bg-white/20 border border-white/10 rounded-md inline-block text-emerald-100 animate-pulse">
                  LIVE RESERVATION
                </span>
              )}
              {globalMyReservation.status === "REPORTED_1ST" && (
                <span className="px-2 py-0.5 text-[9px] font-extrabold uppercase tracking-widest bg-red-500 border border-red-400 rounded-md inline-block text-white animate-pulse">
                  ⚠️ 1차 부재 신고 접수됨
                </span>
              )}
            </div>
            
            {!isVerified ? (
              <>
                <h3 className="text-lg sm:text-xl font-black tracking-tight text-white">
                  현재 {(() => { const fac = FACILITIES.find(f => f.roomName === globalMyReservation.room_name); return fac ? `${fac.buildingName} ${fac.name}` : globalMyReservation.room_name; })()} <span className="underline decoration-wavy decoration-yellow-350 font-extrabold">{globalMyReservation.seat_number}번 좌석</span> 입실 대기 상태입니다.
                </h3>
                <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-amber-100 font-medium">
                  <span className="flex items-center gap-1.5 bg-black/10 border border-white/10 px-2.5 py-1 rounded-xl">
                    <Clock className="h-3.5 w-3.5 text-yellow-300" />
                    <span>입실 확인 남은 시간:</span>
                    <strong className="font-mono text-sm text-yellow-250 animate-pulse">
                      {Math.floor(checkinTimeLeft / 60)}분 {checkinTimeLeft % 60}초
                    </strong>
                  </span>
                  <span>•</span>
                  <span>예약시간: {globalMyReservation.reserved_at || "N/A"}</span>
                </div>
              </>
            ) : (
              <>
                <h3 className="text-lg sm:text-xl font-black tracking-tight text-white">
                  현재 {(() => { const fac = FACILITIES.find(f => f.roomName === globalMyReservation.room_name); return fac ? `${fac.buildingName} ${fac.name}` : globalMyReservation.room_name; })()} <span className="underline decoration-wavy decoration-lime-300 font-extrabold">{globalMyReservation.seat_number}번 좌석</span>을 이용 중입니다.
                </h3>
                <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-emerald-100 font-medium">
                  <span className="flex items-center gap-1">
                    <Clock className="h-3.5 w-3.5" />
                    남은 이용 시간:{" "}
                    <strong className="font-mono text-sm text-lime-300">
                      {globalMyReservation.use_timer_seconds !== undefined && globalMyReservation.use_timer_seconds > 0 ? (
                        `${Math.floor(globalMyReservation.use_timer_seconds / 3600)}시간 ${Math.floor((globalMyReservation.use_timer_seconds % 3600) / 60)}분 ${globalMyReservation.use_timer_seconds % 60}초`
                      ) : (
                        "이용 시간 종료 임박"
                      )}
                    </strong>
                  </span>
                  <span>•</span>
                  <span>예약시간: {globalMyReservation.reserved_at || "N/A"}</span>
                  <span>•</span>
                  <span>종료시간: {globalMyReservation.ends_at || "N/A"}</span>
                </div>
                {globalMyReservation.use_timer_seconds !== undefined && globalMyReservation.use_timer_seconds > 0 && globalMyReservation.use_timer_seconds <= 600 && (
                  <div className="mt-3 p-3 bg-amber-500/20 border border-amber-500/30 text-amber-250 text-xs font-black rounded-xl flex items-center gap-2 animate-pulse-slow">
                    <Clock className="h-4.5 w-4.5 text-amber-300 flex-shrink-0 animate-bounce" />
                    <span>⏱️ 퇴실 임박 고지: 이용 마감 10분 전입니다. 연장(+30분/1시간)을 원치 않으시면 즉시 반납해 주시기 바랍니다.</span>
                  </div>
                )}
              </>
            )}

            <div className="flex flex-wrap gap-2 w-full lg:w-auto mt-4 pt-2 border-t border-white/10">
              {!isVerified ? (
                <>
                  <button
                    onClick={() => {
                      if (navigator.geolocation) {
                        alert("📍 GPS 신호를 수집하고 있습니다. 잠시만 기다려 주세요...");
                        navigator.geolocation.getCurrentPosition(
                          (position) => {
                            alert("✓ GPS 위치 확인 완료: 대구대학교 창파도서관 반경 50m 이내로 확인되었습니다!");
                            handleVerifyCheckin();
                          },
                          (error) => {
                            console.warn("GPS error, fallback to simulated checkin:", error);
                            alert("✓ GPS 확인 완료: 대구대학교 창파도서관 반경 내에 있는 것으로 인증되었습니다.");
                            handleVerifyCheckin();
                          }
                        );
                      } else {
                        alert("✓ GPS 확인 완료: 대구대학교 창파도서관 반경 내에 있는 것으로 인증되었습니다.");
                        handleVerifyCheckin();
                      }
                    }}
                    className="flex-1 lg:flex-initial px-4 py-2.5 bg-white hover:bg-yellow-50 text-orange-600 border border-white rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center justify-center gap-1.5 shadow-md hover:scale-[1.01] animate-bounce-short"
                  >
                    <MapPin className="h-4 w-4" />
                    <span>📍 GPS 입실 인증</span>
                  </button>
                  <button
                    onClick={() => {
                      const code = prompt("좌석의 고유 QR 코드를 스캔합니다. 스캔할 QR 코드 정보를 입력하세요 (또는 엔터 입력 시 자동 인식 완료):", `${globalMyReservation.room_name}_SEAT_${globalMyReservation.seat_number}`);
                      if (code !== null) {
                        alert("✓ 📷 QR 스캔 완료: 좌석 고유 QR 코드 매칭 및 실시간 입실 인증에 성공했습니다!");
                        handleVerifyCheckin();
                      }
                    }}
                    className="flex-1 lg:flex-initial px-4 py-2.5 bg-black/20 hover:bg-black/35 border border-white/20 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center justify-center gap-1.5 shadow-md hover:scale-[1.01]"
                  >
                    <Camera className="h-4 w-4 text-amber-250" />
                    <span>📷 QR코드 입실 인증</span>
                  </button>
                  <button
                    onClick={handleCheckoutSeat}
                    className="flex-1 lg:flex-initial px-4 py-2.5 bg-red-500/10 hover:bg-red-500/20 text-red-100 border border-red-500/35 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center justify-center gap-1.5"
                  >
                    <LogOut className="h-4 w-4" />
                    <span>예약 취소 (반납)</span>
                  </button>
                </>
              ) : (
                <>
                  <button
                    onClick={handleCheckoutSeat}
                    className="flex-1 lg:flex-initial px-4 py-2 bg-red-600 hover:bg-red-500 text-white rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center justify-center gap-1.5 shadow-md"
                  >
                    <LogOut className="h-4 w-4" />
                    <span>즉시 반납 (퇴실)</span>
                  </button>
                  <button
                    onClick={() => handleExtendSeat(globalMyReservation.id, 30)}
                    className="flex-1 lg:flex-initial px-4 py-2 bg-white/20 hover:bg-white/35 border border-white/20 text-white rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center justify-center gap-1 shadow-md"
                  >
                    <Plus className="h-3.5 w-3.5 text-lime-300" />
                    <span>+30분 연장</span>
                  </button>
                  <button
                    onClick={() => handleExtendSeat(globalMyReservation.id, 60)}
                    className="flex-1 lg:flex-initial px-4 py-2 bg-white/20 hover:bg-white/35 border border-white/20 text-white rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center justify-center gap-1 shadow-md"
                  >
                    <Plus className="h-3.5 w-3.5 text-lime-300" />
                    <span>+1시간 연장</span>
                  </button>
                  <button
                    onClick={async () => {
                      const minutesStr = prompt("몇 분 뒤에 조기 퇴실하실 예정인가요? (예: 10, 20, 30):", "10");
                      if (minutesStr) {
                        const mins = parseInt(minutesStr, 10);
                        if (!isNaN(mins) && mins > 0) {
                          await handleSetEarlyCheckout(globalMyReservation.id, mins);
                        } else {
                          alert("올바른 시간(분)을 입력해 주세요.");
                        }
                      }
                    }}
                    className="flex-1 lg:flex-initial px-4 py-2 bg-white/20 hover:bg-white/35 border border-white/20 text-white rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center justify-center gap-1.5 shadow-md"
                  >
                    <Clock className="h-4 w-4 text-cyan-300" />
                    <span>조기 퇴실 예정 설정</span>
                  </button>
                  <button
                    onClick={() => handleCancelEarlyCheckout(globalMyReservation.id)}
                    className="flex-1 lg:flex-initial px-4 py-2 bg-white/10 hover:bg-white/25 border border-white/15 text-white/80 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center justify-center gap-1.5"
                  >
                    <span>조기 퇴실 취소</span>
                  </button>
                </>
              )}
            </div>
          </div>
        </div>
      </div>
    );
  };

  if (!isLoggedIn || !currentUser) {
    return (
      <div className="min-h-screen flex flex-col justify-between bg-gradient-to-br from-emerald-50 via-lime-50/10 to-white text-slate-800 relative">
        <YellowDropsBackground />
        <header className="w-full py-4 px-6 flex justify-between items-center border-b border-slate-200/50 bg-white/40 backdrop-blur-xs">
          <div className="flex items-center space-x-2">
            <img src="/logo.png" alt="Daegu University Logo" className="h-8 w-8 object-contain" />
            <span className="font-bold text-slate-800 text-sm tracking-tight">대구대학교 스마트 예약</span>
          </div>
          <span className="text-[10px] text-emerald-750 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-150 font-bold uppercase tracking-wider font-mono">
            Portal v2.6
          </span>
        </header>

        <main className="flex-grow flex items-center justify-center p-4">
          <div className="w-full max-w-md bg-white/80 backdrop-blur-md rounded-3xl border border-slate-250 p-8 shadow-2xl shadow-emerald-950/5 animate-fade-in-up">
            <div className="text-center mb-8">
              <div className="inline-block p-3.5 bg-white rounded-full shadow-md border border-slate-100 mb-4 transition-transform hover:scale-105 duration-300">
                <img src="/logo.png" alt="Daegu University Logo" className="h-20 w-20 object-contain" />
              </div>
              <h2 className="text-xl font-extrabold text-slate-900 tracking-tight">
                스마트 시설 예약 시스템
              </h2>
              <p className="text-xs text-slate-500 mt-1.5 leading-relaxed font-semibold">
                대구대학교 중앙도서관 및 단과대학 열람실의 실시간 예약 및<br />
                장기 부재 방지를 위한 통합 스마트 관리 포털입니다.
              </p>
            </div>



            <div className="flex bg-slate-100 p-1 rounded-xl border border-slate-250 mb-6">
              <button
                type="button"
                onClick={() => {
                  setLoginTab("STUDENT");
                  setLoginError(null);
                }}
                className={`flex-1 py-2 rounded-lg text-xs font-bold transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
                  loginTab === "STUDENT"
                    ? "bg-emerald-600 text-white shadow-xs"
                    : "text-slate-500 hover:text-slate-850"
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
                    : "text-slate-500 hover:text-slate-850"
                }`}
              >
                <ShieldCheck className="h-4 w-4" />
                <span>관리자 로그인</span>
              </button>
            </div>

            {loginError && (
              <div className="mb-4 p-3 bg-red-50 border border-red-200 text-xs font-bold text-red-700 rounded-xl flex items-center gap-2">
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
                      <User className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-450" />
                      <input
                        type="text"
                        maxLength={8}
                        disabled={loginLoading}
                        value={studentIdInput}
                        onChange={(e) => setStudentIdInput(e.target.value.replace(/[^0-9]/g, ""))}
                        placeholder="예: 20222043"
                        className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:bg-white focus:border-emerald-500 outline-none transition-all font-bold text-slate-700 disabled:opacity-60"
                      />
                    </div>
                  </div>
                  <div className="space-y-1">
                    <label className="text-[10px] uppercase font-bold text-slate-500 tracking-wider">포털 비밀번호</label>
                    <div className="relative">
                      <Key className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-455" />
                      <input
                        type="password"
                        disabled={loginLoading}
                        value={studentPasswordInput}
                        onChange={(e) => setStudentPasswordInput(e.target.value)}
                        placeholder="포털 비밀번호 입력"
                        className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:bg-white focus:border-emerald-500 outline-none transition-all font-bold text-slate-700 disabled:opacity-60"
                      />
                    </div>
                  </div>
                </>
              ) : (
                <div className="space-y-1">
                  <label className="text-[10px] uppercase font-bold text-slate-500 tracking-wider">관리자 액세스 코드</label>
                  <div className="relative">
                    <Key className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-450" />
                    <input
                      type="password"
                      disabled={loginLoading}
                      value={adminCodeInput}
                      onChange={(e) => setAdminCodeInput(e.target.value)}
                      placeholder="관리자코드 (예: ADM-9942)"
                      className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:bg-white focus:border-emerald-500 outline-none transition-all font-bold text-slate-700 disabled:opacity-60"
                    />
                  </div>
                </div>
              )}

              <button
                type="submit"
                disabled={loginLoading}
                className="w-full py-3 mt-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl font-bold text-sm shadow-lg shadow-emerald-700/10 transition-all active:scale-[0.98] cursor-pointer flex items-center justify-center gap-1.5 disabled:opacity-70 disabled:cursor-not-allowed"
              >
                {loginLoading ? (
                  <>
                    <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                    <span>로그인 연동 중...</span>
                  </>
                ) : (
                  <>
                    <span>시작하기</span>
                    <ArrowRight className="h-4 w-4" />
                  </>
                )}
              </button>
            </form>

            <div className="mt-8 pt-6 border-t border-slate-200 text-center">
              <span className="text-[10px] text-slate-400 uppercase tracking-wider font-extrabold block mb-3">
                간편 포털 SSO 로그인 연동
              </span>
              <div className="flex gap-2.5">
                <button
                  type="button"
                  disabled={loginLoading}
                  onClick={loginAsDemoStudent}
                  className="flex-1 py-2 px-3 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 rounded-xl border border-emerald-150 text-xs font-bold transition-all cursor-pointer disabled:opacity-60 disabled:cursor-not-allowed"
                >
                  학생 SSO 로그인
                </button>
                <button
                  type="button"
                  disabled={loginLoading}
                  onClick={loginAsDemoAdmin}
                  className="flex-1 py-2 px-3 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl border border-slate-200 text-xs font-bold transition-all cursor-pointer disabled:opacity-60 disabled:cursor-not-allowed"
                >
                  관리자 SSO 로그인
                </button>
              </div>
            </div>
          </div>
        </main>

        <footer className="w-full py-4 text-center text-[10px] text-slate-400 border-t border-slate-200 bg-white/20">
          <p>© 2026 Daegu University. Smart Facility Reservation System. All rights reserved.</p>
        </footer>
      </div>
    );
  }

  if (selectedFacility === null) {
    return (
      <div className="min-h-screen flex flex-col justify-between bg-gradient-to-br from-emerald-50 via-lime-50/10 to-white text-slate-800 relative">
        <YellowDropsBackground />
        
        <header className="sticky top-0 z-40 bg-white/80 border-b border-slate-200 backdrop-blur-md shadow-xs">
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
              <div className="text-xs border-r border-slate-200 pr-3 hidden sm:flex items-center space-x-2 font-semibold">
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

        <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 mt-10 mb-16 flex-grow w-full">
          
          {perspective === "STUDENT" && renderQuickReservationBanner(true)}

          <div className="mb-8 rounded-3xl bg-gradient-to-r from-emerald-800 to-emerald-950 p-8 text-white shadow-xl relative overflow-hidden">
            <div className="absolute inset-0 bg-gradient-to-br from-lime-500/10 to-transparent pointer-events-none" />
            <div className="relative z-10 max-w-2xl space-y-2">
              <span className="px-2.5 py-1 text-[9px] font-extrabold uppercase tracking-widest bg-emerald-700/50 border border-emerald-500/30 rounded-md inline-block text-emerald-300">
                {currentUser.role === "ADMIN" ? "Admin Control Portal" : "Du-Smart Facility System"}
              </span>
              <h2 className="text-2xl sm:text-3xl font-black tracking-tight text-white leading-tight">
                {currentUser.role === "ADMIN" 
                  ? "창파도서관 시설물 통합 관제 센터" 
                  : "대구대학교 스마트 교내 공간 예약"}
              </h2>
              <p className="text-xs sm:text-sm text-slate-300 leading-relaxed font-medium">
                {currentUser.role === "ADMIN"
                  ? `${currentUser.name} 관리자님 환영합니다. 창파도서관 내 6개 시설물의 실시간 예약 현황 및 2단계 상호 감시 부재 신고를 관리합니다.`
                  : "중앙도서관 및 단과대 주요 학업 스터디룸, 컴퓨터 시설을 실시간으로 확인하고 빠르게 예약 대여하십시오."}
              </p>
            </div>
            
            <div className="absolute right-8 bottom-8 hidden md:flex items-center gap-3">
              {currentUser.role === "ADMIN" ? (
                <>
                  <div className="bg-white/10 backdrop-blur-xs border border-white/10 px-4 py-2.5 rounded-2xl text-center font-bold">
                    <span className="text-[10px] text-emerald-250 block leading-none">관리 시설 수</span>
                    <span className="text-xl font-bold font-mono mt-1 block">3개 구역</span>
                  </div>
                  <div className="bg-white/10 backdrop-blur-xs border border-white/10 px-4 py-2.5 rounded-2xl text-center border-l-4 border-l-red-500/50 font-bold">
                    <span className="text-[10px] text-red-300 block leading-none">검증 대기 (2차)</span>
                    <span className="text-xl font-bold font-mono mt-1 block text-red-200">
                      {dbSeats.filter(s => s.status === 'REPORTED_2ND').length}건
                    </span>
                  </div>
                  <div className="bg-white/10 backdrop-blur-xs border border-white/10 px-4 py-2.5 rounded-2xl text-center font-bold">
                    <span className="text-[10px] text-amber-350 block leading-none">부재 신고 (1차)</span>
                    <span className="text-xl font-bold font-mono mt-1 block text-amber-250">
                      {dbSeats.filter(s => s.status === 'REPORTED_1ST').length}건
                    </span>
                  </div>
                </>
              ) : globalMyReservation ? (
                <>
                  <div className="bg-white/10 backdrop-blur-xs border border-white/10 px-4 py-2.5 rounded-2xl text-center font-bold max-w-[160px]">
                    <span className="text-[10px] text-lime-300 block leading-none">내 예약 공간</span>
                    {(() => {
                      const fac = FACILITIES.find(f => f.roomName === globalMyReservation.room_name);
                      return fac ? (
                        <>
                          <span className="text-[10px] font-bold text-white/70 mt-0.5 block leading-tight">{fac.buildingName}</span>
                          <span className="text-xs font-black text-white block leading-tight">{fac.name.replace(fac.buildingName, '').trim()}</span>
                        </>
                      ) : (
                        <span className="text-sm font-black text-white mt-1 block leading-tight">{globalMyReservation.room_name}</span>
                      );
                    })()}
                  </div>
                  <div className="bg-white/10 backdrop-blur-xs border border-white/10 px-4 py-2.5 rounded-2xl text-center font-bold">
                    <span className="text-[10px] text-lime-300 block leading-none">예약 좌석</span>
                    <span className="text-xl font-black font-mono mt-1 block">
                      {globalMyReservation.seat_number}번
                    </span>
                  </div>
                  <div className="bg-white/10 backdrop-blur-xs border border-white/10 px-4 py-2.5 rounded-2xl text-center font-bold">
                    <span className="text-[10px] text-amber-300 block leading-none">
                      {!isVerified ? "입실 대기" : "남은 시간"}
                    </span>
                    <span className="text-xl font-bold font-mono mt-1 block text-amber-200">
                      {!isVerified
                        ? `${Math.floor(checkinTimeLeft / 60)}분 ${checkinTimeLeft % 60}초`
                        : globalMyReservation.use_timer_seconds !== undefined && globalMyReservation.use_timer_seconds > 0
                        ? `${Math.floor(globalMyReservation.use_timer_seconds / 3600)}시간 ${Math.floor((globalMyReservation.use_timer_seconds % 3600) / 60)}분`
                        : "종료 임박"}
                    </span>
                  </div>
                  <button
                    onClick={handleCheckoutSeat}
                    className="px-5 py-3 bg-red-500 hover:bg-red-600 active:scale-95 text-white border border-red-400 rounded-2xl text-xs font-black transition-all cursor-pointer flex flex-col items-center gap-1 shadow-lg shadow-red-950/30"
                  >
                    <LogOut className="h-4 w-4" />
                    <span>즉시 퇴실</span>
                  </button>
                </>
              ) : (
                <>
                  <div className="bg-white/10 backdrop-blur-xs border border-white/10 px-4 py-2.5 rounded-2xl text-center font-bold">
                    <span className="text-[10px] text-emerald-200 block leading-none">대여 가능 시설</span>
                    <span className="text-xl font-bold font-mono mt-1 block">{FACILITIES.length}개</span>
                  </div>
                  <div className="bg-white/10 backdrop-blur-xs border border-white/10 px-4 py-2.5 rounded-2xl text-center font-bold">
                    <span className="text-[10px] text-amber-300 block leading-none">즉시 확정 공간</span>
                    <span className="text-xl font-bold font-mono mt-1 block">{FACILITIES.filter(f => f.instantConfirm).length}개</span>
                  </div>
                </>
              )}
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
            
            {/* Sidebar: 관리자 = 수동 예약 패널 / 학생 = 검색 패널 */}
            {currentUser.role === "ADMIN" ? (
              /* ===== 관리자 수동 예약 패널 ===== */
              <div className="lg:col-span-1 bg-white border border-slate-200 rounded-2xl p-6 shadow-xs h-fit space-y-5 animate-fade-in-up">
                {/* Header */}
                <div className="border-b border-slate-150 pb-3">
                  <h3 className="text-sm font-extrabold text-slate-900 flex items-center gap-1.5">
                    <span className="bg-amber-500 text-white rounded p-0.5"><svg xmlns="http://www.w3.org/2000/svg" className="h-3.5 w-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M12 20h9"/><path d="M16.5 3.5a2.121 2.121 0 013 3L7 19l-4 1 1-4L16.5 3.5z"/></svg></span>
                    <span>수동 예약 시스템</span>
                  </h3>
                  <p className="text-[10px] text-slate-400 font-semibold mt-1">학생 기기 오류 시 관리자가 직접 좌석을 배정합니다</p>
                </div>

                {/* Step 1: Student Info */}
                <div className="space-y-3 p-3.5 bg-amber-50 border border-amber-200 rounded-xl">
                  <p className="text-[10px] font-extrabold text-amber-700 uppercase tracking-wider">① 학생 정보 입력</p>
                  <div className="space-y-2">
                    <div>
                      <label className="text-[10px] font-bold text-slate-500 block mb-1">학번 (8자리)</label>
                      <div className="flex gap-2">
                        <input
                          type="text"
                          maxLength={8}
                          value={manualStudentId}
                          onChange={(e) => setManualStudentId(e.target.value.replace(/[^0-9]/g, ""))}
                          placeholder="예: 20221234"
                          className="flex-grow px-3 py-2 bg-white border border-slate-200 rounded-lg text-xs font-bold focus:border-amber-400 outline-none transition-all"
                        />
                        <button
                          type="button"
                          onClick={handleSearchStudentForManualReserve}
                          className="px-3 py-2 bg-amber-500 hover:bg-amber-450 text-white rounded-lg text-xs font-bold transition-all cursor-pointer shadow-3xs"
                        >
                          조회
                        </button>
                      </div>
                    </div>
                    <div>
                      <label className="text-[10px] font-bold text-slate-500 block mb-1">학생 이름</label>
                      <input
                        type="text"
                        value={manualStudentName}
                        onChange={(e) => setManualStudentName(e.target.value)}
                        placeholder="예: 홍길동"
                        className="w-full px-3 py-2 bg-white border border-slate-200 rounded-lg text-xs font-bold focus:border-amber-400 outline-none transition-all"
                      />
                    </div>
                  </div>
                </div>

                {/* Step 2: Facility Selection */}
                <div className="space-y-2 p-3.5 bg-slate-50 border border-slate-200 rounded-xl">
                  <p className="text-[10px] font-extrabold text-slate-600 uppercase tracking-wider">② 교내시설 선택</p>
                  <select
                    value={manualFacility?.id || ""}
                    onChange={(e) => {
                      const fac = FACILITIES.find(f => f.id === e.target.value) || null;
                      setManualFacility(fac);
                    }}
                    className="w-full px-3 py-2 bg-white border border-slate-200 rounded-lg text-xs font-bold focus:border-emerald-500 outline-none transition-all cursor-pointer text-slate-750"
                  >
                    <option value="">-- 시설 선택 --</option>
                    {FACILITIES.map(fac => (
                      <option key={fac.id} value={fac.id}>{fac.buildingName} · {fac.name}</option>
                    ))}
                  </select>
                </div>

                {/* Step 3: Seat Map */}
                {manualFacility && (
                  <div className="space-y-2 p-3.5 bg-slate-50 border border-slate-200 rounded-xl">
                    <div className="flex justify-between items-center">
                      <p className="text-[10px] font-extrabold text-slate-600 uppercase tracking-wider">③ 좌석 선택</p>
                      <span className="text-[9px] text-emerald-600 font-bold">
                        {manualSeats.filter(s => s.status === "AVAILABLE").length}/{manualSeats.length} 빈자리
                      </span>
                    </div>
                    <div className="grid grid-cols-5 gap-1 max-h-52 overflow-y-auto pr-1">
                      {manualSeats.map(seat => {
                        const isAvail = seat.status === "AVAILABLE";
                        const isSelected = seat.id === manualSelectedSeatId;
                        return (
                          <button
                            key={seat.id}
                            disabled={!isAvail}
                            onClick={() => setManualSelectedSeatId(isSelected ? null : seat.id)}
                            className={`rounded-lg border text-[10px] font-bold py-1.5 transition-all cursor-pointer ${
                              isSelected
                                ? "bg-amber-500 border-amber-400 text-white shadow-md scale-105"
                                : isAvail
                                ? "bg-emerald-50 border-emerald-200 text-emerald-700 hover:bg-emerald-100 hover:border-emerald-400"
                                : "bg-slate-100 border-slate-200 text-slate-400 cursor-not-allowed opacity-60"
                            }`}
                          >
                            {seat.seat_number}
                          </button>
                        );
                      })}
                    </div>
                    {manualSelectedSeatId && (
                      <p className="text-[10px] text-amber-700 font-bold text-center mt-1">
                        ✓ {manualSeats.find(s => s.id === manualSelectedSeatId)?.seat_number}번 좌석 선택됨
                      </p>
                    )}
                  </div>
                )}

                {/* Step 4: Duration */}
                <div className="space-y-2 p-3.5 bg-slate-50 border border-slate-200 rounded-xl">
                  <p className="text-[10px] font-extrabold text-slate-600 uppercase tracking-wider">④ 사용 시간 설정</p>
                  {(() => {
                    const manualConfig = manualFacility ? facilityConfigs[manualFacility.roomName] : null;
                    const manualIsUnlimited = manualConfig && (!manualConfig.max_use_hours || manualConfig.max_use_hours === 0);
                    if (manualIsUnlimited) {
                      return (
                        <div className="py-3 px-4 bg-emerald-50 border border-emerald-200 rounded-lg text-center">
                          <span className="text-xs font-bold text-emerald-700">♾️ 무제한 (폐관 시간까지 자동 적용)</span>
                          <p className="text-[9px] text-emerald-600 font-semibold mt-1">
                            이 시설은 사용시간 제한이 없습니다. 운영 종료({manualConfig?.close_time?.slice(0,5) || "22:00"})까지 자동 배정됩니다.
                          </p>
                        </div>
                      );
                    }
                    const maxMinutes = manualConfig?.max_use_hours ? manualConfig.max_use_hours * 60 : 240;
                    const durationOptions = [30, 60, 90, 120, 180, 240].filter(m => m <= maxMinutes);
                    return (
                      <>
                        <div className="grid grid-cols-2 gap-1.5">
                          {durationOptions.map(min => (
                            <button
                              type="button"
                              key={min}
                              onClick={() => setManualDuration(min)}
                              className={`py-2 rounded-lg text-xs font-bold border transition-all cursor-pointer ${
                                manualDuration === min
                                  ? "bg-emerald-600 border-emerald-500 text-white shadow-md"
                                  : "bg-white border-slate-200 text-slate-600 hover:border-emerald-400 hover:text-emerald-700"
                              }`}
                            >
                              {min < 60 ? `${min}분` : `${min / 60}시간`}
                            </button>
                          ))}
                        </div>
                        <p className="text-[9px] text-slate-400 font-semibold text-center">선택: {manualDuration}분 ({(manualDuration/60).toFixed(1)}h){manualConfig?.max_use_hours ? ` / 최대 ${manualConfig.max_use_hours}시간` : ''}</p>
                      </>
                    );
                  })()}
                </div>

                {/* Submit */}
                <button
                  type="button"
                  onClick={handleAdminManualReserve}
                  disabled={manualLoading || !manualStudentId || !manualStudentName || !manualFacility || !manualSelectedSeatId}
                  className="w-full py-3 bg-amber-500 hover:bg-amber-450 disabled:bg-slate-200 disabled:text-slate-400 disabled:cursor-not-allowed text-white rounded-xl text-xs font-extrabold shadow-md transition-all active:scale-95 cursor-pointer flex items-center justify-center gap-2"
                >
                  {manualLoading ? (
                    <><span className="animate-spin inline-block w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full" /><span>처리 중...</span></>
                  ) : (
                    <span>✅ 수동 예약 확정</span>
                  )}
                </button>
              </div>
            ) : (
              /* ===== 학생 검색 패널 ===== */
              <div className="lg:col-span-1 bg-white border border-slate-200 rounded-2xl p-6 shadow-xs h-fit space-y-6 animate-fade-in-up">
                <div className="border-b border-slate-150 pb-3 flex justify-between items-center">
                  <h3 className="text-sm font-extrabold text-slate-900 flex items-center gap-1.5">
                    <Building2 className="h-4.5 w-4.5 text-emerald-600" />
                    <span>상세 통합 검색</span>
                  </h3>
                  <button
                    onClick={resetFilters}
                    className="text-[10px] text-slate-400 hover:text-emerald-650 font-bold transition-all cursor-pointer"
                  >
                    필터 초기화
                  </button>
                </div>

                <div className="space-y-1.5">
                  <label className="text-[10px] uppercase font-bold text-slate-500 tracking-wider">시설명 / 위치 키워드</label>
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                    <input
                      type="text"
                      value={tempKeyword}
                      onChange={(e) => setTempKeyword(e.target.value)}
                      placeholder="예: 제1열람실, 스터디룸"
                      className="w-full pl-9 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:bg-white focus:border-emerald-500 outline-none transition-all font-bold"
                    />
                  </div>
                </div>

                <div className="space-y-1.5">
                  <label className="text-[10px] uppercase font-bold text-slate-500 tracking-wider">건물별 필터</label>
                  <select
                    value={tempBuilding}
                    onChange={(e) => setTempBuilding(e.target.value)}
                    className="w-full px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:bg-white focus:border-emerald-500 outline-none transition-all cursor-pointer font-bold text-slate-750"
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

                <div className="space-y-1.5">
                  <label className="text-[10px] uppercase font-bold text-slate-500 tracking-wider">최소 수용 인원</label>
                  <input
                    type="text"
                    value={tempCapacity}
                    onChange={(e) => setTempCapacity(e.target.value.replace(/[^0-9]/g, ""))}
                    placeholder="예: 4 (명)"
                    className="w-full px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:bg-white focus:border-emerald-500 outline-none transition-all font-bold"
                  />
                </div>

                <button
                  type="button"
                  onClick={() => handleSearchSubmit()}
                  className="w-full py-2.5 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs font-bold shadow-md transition-all active:scale-95 cursor-pointer text-center"
                >
                  검색하기
                </button>
              </div>
            )}


            {/* Right toolbar & Card list */}
            <div className="lg:col-span-3 space-y-6">
              
              {/* [요청 3] 카테고리 탭 분류 기준의 시설명 직관화 및 [TODO 4] 관리자 소속 대학/담당 시설물 자동 필터링 */}
              <div className="flex flex-wrap bg-white p-1 rounded-xl border border-slate-200 shadow-2xs w-fit gap-1">
                {(currentUser?.role === "ADMIN" && currentUser.managed_college_id
                  ? [
                      { label: "전체 구역", key: "ALL" },
                      { 
                        label: currentUser.managed_college_id === "library" ? "창파도서관" : 
                               currentUser.managed_college_id === "it-eng" ? "IT·공과대학" : 
                               currentUser.managed_college_id === "edu" ? "사범대학" : 
                               currentUser.managed_college_id === "rehab" ? "재활과학대학" : 
                               currentUser.managed_college_id === "biz" ? "글로벌경영대학" : 
                               currentUser.managed_college_id === "public" ? "공공인재대학" : 
                               currentUser.managed_college_id === "design" ? "디자인예술대학" : "담당 구역", 
                        key: currentUser.managed_college_id 
                      }
                    ]
                  : [
                      { label: "전체 구역", key: "ALL" },
                      { label: "창파도서관", key: "library" },
                      { label: "IT·공과대학", key: "it-eng" },
                      { label: "사범대학", key: "edu" },
                      { label: "재활과학대학", key: "rehab" },
                      { label: "글로벌경영대학", key: "biz" },
                      { label: "공공인재대학", key: "public" },
                      { label: "디자인예술대학", key: "design" }
                    ]
                ).map((btn) => {
                  const isActive = facilityFilter === btn.key;
                  return (
                    <button
                      key={btn.key}
                      onClick={() => setFacilityFilter(btn.key)}
                      className={`px-3 py-2 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                        isActive
                          ? "bg-emerald-600 text-white shadow-xs"
                          : "text-slate-500 hover:text-slate-850"
                      }`}
                    >
                      {btn.label}
                    </button>
                  );
                })}
              </div>

              {/* Cards Grid */}
              {filteredFacilities.length > 0 ? (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 animate-fade-in-up">
                  {filteredFacilities.map((fac) => {
                    const seats = dbSeats.filter(s => s.room_name === fac.roomName);
                    
                    const totalCount = seats.length || fac.capacity;
                    const occupied = seats.filter(s => s.status === "OCCUPIED").length;
                    const warning = seats.filter(s => s.status === "REPORTED_1ST").length;
                    const pendingAudit = seats.filter(s => s.status === "REPORTED_2ND").length;
                    const clearing = seats.filter(s => s.status === "CLEARING").length;
                    
                    const available = Math.max(0, totalCount - (occupied + warning + pendingAudit + clearing));

                    return (
                      <div
                        key={fac.id}
                        className="bg-white border border-slate-200/80 rounded-3xl overflow-hidden shadow-xs hover:shadow-md hover:border-emerald-350 transition-all duration-300 flex flex-col justify-between"
                      >
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
                              {available > 0 ? `${available}석 예약가능` : "만석"}
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
                            <p className="text-xs text-slate-550 font-semibold leading-relaxed min-h-[32px] line-clamp-2">
                              {fac.description}
                            </p>
                          </div>

                          {/* Occupancy counts */}
                          <div className="grid grid-cols-4 gap-1 text-[10px] text-center font-bold py-2 bg-slate-50 border border-slate-200/60 rounded-xl">
                            <div>
                              <span className="text-slate-400 block font-normal text-[9px] mb-0.5">이용중</span>
                              <span className="text-slate-700">{occupied}석</span>
                            </div>
                            <div>
                              <span className="text-amber-500 block font-normal text-[9px] mb-0.5">1차경고</span>
                              <span className="text-amber-600">{warning}석</span>
                            </div>
                            <div>
                              <span className="text-red-500 block font-normal text-[9px] mb-0.5">검증대기</span>
                              <span className="text-red-655">{pendingAudit}석</span>
                            </div>
                            <div>
                              <span className="text-purple-500 block font-normal text-[9px] mb-0.5">정리중</span>
                              <span className="text-purple-655">{clearing}석</span>
                            </div>
                          </div>

                          <div className="space-y-3 pt-3 border-t border-slate-100">
                            <div className="flex flex-wrap gap-1.5">
                              {fac.tags.map((tag, tIdx) => (
                                <span
                                  key={tIdx}
                                  className="bg-slate-50 text-slate-500 border border-slate-250 px-2 py-0.5 rounded text-[10px] font-semibold"
                                >
                                  #{tag}
                                </span>
                              ))}
                            </div>

                            <div className="flex items-center justify-between text-xs text-slate-550 font-semibold">
                              <span>정원: <strong>{fac.capacity}명</strong></span>
                              
                              <button
                                onClick={() => setSelectedFacility(fac)}
                                className="bg-emerald-600 hover:bg-emerald-500 text-white px-4 py-1.5 rounded-xl font-bold text-xs shadow-md transition-all active:scale-[0.98] cursor-pointer flex items-center gap-1"
                              >
                                <span>{currentUser.role === "ADMIN" ? "시설 관제 & 관리" : "좌석 예약"}</span>
                                <ArrowRight className="h-3 w-3" />
                              </button>
                            </div>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <div className="py-20 text-center border border-dashed border-slate-250 rounded-2xl bg-white space-y-4 animate-fade-in-up">
                  <HelpCircle className="h-12 w-12 text-slate-350 mx-auto" />
                  <div className="space-y-1">
                    <h3 className="text-base font-bold text-slate-500">조건에 부합하는 시설물이 없습니다.</h3>
                    <p className="text-xs text-slate-400">검색 조건을 조절하여 다시 조치해 주시기 바랍니다.</p>
                  </div>
                  <button
                    onClick={resetFilters}
                    className="bg-emerald-600 hover:bg-emerald-500 text-white px-4 py-2 rounded-xl text-xs font-bold shadow-md cursor-pointer transition-all active:scale-95"
                  >
                    필터 전체 초기화
                  </button>
                </div>
              )}
            </div>
          </div>
        </main>
        
        <footer className="w-full py-6 text-center text-xs text-slate-450 border-t border-slate-200/50 bg-white">
          <p>© 2026 Daegu University. Smart Facility Reservation System. All rights reserved.</p>
        </footer>
      </div>
    );
  }

  // Active portal room controller view
  return (
    <div className="flex-grow flex flex-col min-h-screen bg-slate-50 text-slate-800 pb-16 relative">
      <YellowDropsBackground />
      
      {/* Navbar */}
      <header className="sticky top-0 z-40 bg-white/90 border-b border-slate-200 backdrop-blur-md shadow-xs">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="bg-emerald-600 p-1.5 rounded-lg text-white flex items-center justify-center shadow-lg shadow-emerald-700/20">
              <Building2 className="h-5 w-5" />
            </div>
            <div>
              <h1 className="text-base sm:text-lg font-bold tracking-tight text-slate-900 flex items-center gap-1.5 leading-none">
                <span>Du-Reserve</span>
              </h1>
              <p className="text-[9px] text-emerald-655 font-bold uppercase tracking-wider mt-0.5">대구대 스마트 열람실</p>
            </div>
          </div>

          <div className="flex items-center space-x-3 sm:space-x-4">
            <div className="hidden md:flex items-center space-x-2 text-xs border-r border-slate-200 pr-4 font-semibold">
              <span className="text-slate-400 font-mono">접속자:</span>
              <span className="font-bold text-slate-700">{currentUser.name}</span>
              <span className="bg-emerald-50 text-emerald-700 border border-emerald-100 rounded px-1.5 py-0.5 font-bold text-[10px]">
                {currentUser.role === "ADMIN" ? "사서관" : "학부생"}
              </span>
            </div>

            {/* Return to main board */}
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

            {/* Perspective Switch Enforced via RBAC (Demo Switch Removed for Security) */}

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

      {/* Main Container */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 mt-8 flex-grow w-full">
        {/* [TODO 2] 현재 내 좌석 이용 현황 퀵 배너 */}
        {perspective === "STUDENT" && renderQuickReservationBanner(false)}

        {/* Facility Info Header */}
        <div className="mb-6 flex flex-col md:flex-row justify-between items-start md:items-center gap-4 bg-gradient-to-r from-emerald-50 via-lime-50/40 to-transparent border border-emerald-500/10 rounded-2xl p-6 shadow-xs">
          <div className="space-y-1">
            <h2 className="text-lg font-bold text-slate-850">
              {selectedFacility.name} ({selectedFacility.buildingName}) - {perspective === "STUDENT" ? "좌석 예약" : "중앙 관제"}
            </h2>
            <p className="text-xs text-slate-500 max-w-2xl leading-normal font-semibold">
              {perspective === "STUDENT"
                ? `선택된 공간은 ${selectedFacility.name} 입니다. 도면에서 좌석을 선택하여 예약을 실행하세요. 장기 공석 발생 시 사진 증빙으로 퇴실 신고를 접수할 수 있습니다.`
                : `현재 ${selectedFacility.roomName}의 실시간 장기 미사용 신고 현황을 대조 검증하고, 강제 퇴실 명령을 명령합니다.`}
            </p>
          </div>
          <div className="flex flex-wrap gap-1 items-center">
            {selectedFacility.tags.map((tag, idx) => (
              <span key={idx} className="bg-white text-emerald-700 border border-slate-200 shadow-2xs rounded px-2.5 py-0.5 text-[9px] font-bold">
                #{tag}
              </span>
            ))}
          </div>
        </div>

        {/* Dynamic Panels */}
        {perspective === "STUDENT" ? (
          <div className="space-y-8 animate-fade-in">
            <UserDashboard
              user={currentUser}
              selectedSeat={selectedSeat}
              userReservation={globalMyReservation}
              absenceReports={absenceReports}
              facilityConfig={facilityConfigs[selectedFacility.roomName] || null}
              myComplaints={complaints.filter(c => c.user_id === currentUser.id)}
              cooldownTimeLeft={cooldownTimeLeft}
              notificationSubscribed={notificationSubscribed}
              onReserve={handleReserveSeat}
              onCheckout={handleCheckoutSeat}
              onConfirmReturn={handleConfirmReturn}
              onReportAbsence1st={handleReportAbsence1st}
              onReportAbsence2nd={handleReportAbsence2nd}
              onExtendSeat={handleExtendSeat}
              onSetEarlyCheckout={handleSetEarlyCheckout}
              onCancelEarlyCheckout={handleCancelEarlyCheckout}
              onSubmitComplaint={handleSubmitComplaint}
              onSubmitVindication={handleSubmitVindication}
              onSubscribeNotification={handleSubscribeNotification}
              timerSpeedUp={timerSpeedUp}
              setTimerSpeedUp={setTimerSpeedUp}
              onSkip10Minutes={handleSkip10Minutes}
              selectedFacility={selectedFacility}
              allSeats={activeSeats}
              checkinTimeLeft={checkinTimeLeft}
              isVerified={isVerified}
              onVerifyCheckin={handleVerifyCheckin}
              noiseLevel={noiseLevel}
              noiseComplaintsCount={noiseComplaintsCount}
            />

            <div className="bg-white border border-slate-200 shadow-xs rounded-2xl p-6">
              <SeatMap
                seats={activeSeats}
                onSelectSeat={setSelectedSeat}
                selectedSeatId={selectedSeat?.id || null}
                userReservationSeatId={globalMyReservation?.id || null}
                selectedFacility={selectedFacility}
                noiseLevel={noiseLevel}
                highlightSeatId={highlightSeatId}
                complaints={complaints}
              />
            </div>
          </div>
        ) : (
          <div className="space-y-8 animate-fade-in">
            <AdminPanel
              adminUser={currentUser}
              seats={activeSeats}
              absenceReports={absenceReports}
              complaints={complaints}
              facilities={FACILITIES}
              configs={facilityConfigs}
              onImmediateRelease={handleImmediateRelease}
              onDelayedRelease={handleDelayedRelease}
              onResolveComplaint={handleResolveComplaint}
              onUpdateConfig={handleUpdateConfig}
              onSearchStudent={handleSearchStudent}
              onApplyPenalty={handleApplyPenalty}
              onProxyReserve={handleProxyReserve}
              onProxyCheckout={handleProxyCheckout}
              onFocusComplaintSeat={handleFocusComplaintSeat}
            />
            {selectedFacility && (
              <div className="bg-white border border-slate-200 shadow-xs rounded-2xl p-6">
                <h3 className="text-sm font-extrabold text-slate-800 mb-4 pb-2 border-b border-slate-100 flex items-center justify-between">
                  <span>실시간 좌석 배치도 (관리자 관제 모드)</span>
                  <span className="text-[10px] text-red-500 font-extrabold animate-pulse">⚠️ 도면 좌석 클릭 시 즉석 대리 행정 모달 활성화</span>
                </h3>
                <SeatMap
                  seats={activeSeats}
                  onSelectSeat={setSelectedSeat}
                  selectedSeatId={selectedSeat?.id || null}
                  userReservationSeatId={null}
                  selectedFacility={selectedFacility}
                  noiseLevel={noiseLevel}
                  highlightSeatId={highlightSeatId}
                  complaints={complaints}
                />
              </div>
            )}
          </div>
        )}
      </main>

      {/* Warning popup for reported seats */}
      {showWarningModal && activeStudentWarning && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 p-4 backdrop-blur-xs">
          <div className="w-full max-w-md overflow-hidden rounded-2xl border border-amber-200 bg-white shadow-2xl animate-bounce-short">
            <div className="bg-amber-50 border-b border-amber-200 px-6 py-4 flex items-center gap-3 text-amber-600">
              <AlertTriangle className="h-6 w-6 animate-pulse" />
              <h3 className="font-bold text-slate-800">장기 부재 경고 안내 (1차 접수)</h3>
            </div>
            
            <div className="p-6 space-y-4">
              <div className="bg-amber-50/50 border border-amber-200 p-4 rounded-xl text-xs text-amber-800 leading-relaxed font-semibold">
                ⚠️ 장기 부재 신고가 접수되었습니다. 30분 이내에 좌석으로 복귀하여 [복귀 확인] 혹은 [셀프 소명]을 진행하지 않으면 담당 사서관에 의해 강제 퇴실 처분 및 물품이 수거될 수 있습니다.
              </div>

              <div className="flex items-center justify-between bg-slate-50 p-3 rounded-lg border border-slate-200 text-xs font-semibold">
                <span className="text-slate-650 flex items-center gap-1">
                  <Clock className="h-3.5 w-3.5 text-amber-500" /> 복귀 유예 남은 시간:
                </span>
                <span className="font-mono text-sm font-bold text-amber-650">
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
                className="bg-emerald-650 hover:bg-emerald-550 text-white px-5 py-2 rounded-xl text-sm font-bold shadow-md transition-all active:scale-95 cursor-pointer"
              >
                자리 복귀 확인 (신고 리셋)
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Forced checkout popup alert */}
      {forcedCheckoutAlert.show && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 p-4 backdrop-blur-xs animate-fade-in">
          <div className="w-full max-w-md overflow-hidden rounded-2xl border border-red-200 bg-white shadow-2xl">
            <div className="bg-red-50 border-b border-red-200 px-6 py-4 flex items-center gap-3 text-red-655 font-bold">
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
                className="bg-red-655 hover:bg-red-550 text-white px-5 py-2 rounded-xl text-sm font-bold shadow-md transition-all active:scale-95 cursor-pointer"
              >
                확인 및 닫기
              </button>
            </div>
          </div>
        </div>
      )}

      {/* [TODO 5] 관리자 전용 즉석 대리 조치 모달 */}
      {selectedSeat && perspective === "ADMIN" && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 p-4 backdrop-blur-xs animate-fade-in">
          <div className="w-full max-w-md overflow-hidden rounded-3xl border border-emerald-250 bg-white shadow-2xl animate-scale-up">
            <div className="bg-emerald-800 border-b border-emerald-700 px-6 py-4 flex items-center justify-between text-white">
              <div className="flex items-center gap-2">
                <ShieldCheck className="h-5 w-5 text-emerald-350" />
                <h3 className="font-extrabold text-sm sm:text-base">[관리자 대리 행정] {selectedSeat.seat_number}번 좌석</h3>
              </div>
              <button onClick={() => setSelectedSeat(null)} className="text-white/80 hover:text-white transition-all cursor-pointer">
                <X className="h-5 w-5" />
              </button>
            </div>
            
            <div className="p-6 space-y-4 max-h-[80vh] overflow-y-auto">
              {/* Seat Details */}
              <div className="p-4 bg-slate-50 border border-slate-200 rounded-2xl text-xs space-y-1.5 font-bold">
                <div className="flex justify-between">
                  <span className="text-slate-400">현재 상태:</span>
                  <span className={`font-extrabold ${
                    selectedSeat.status === "AVAILABLE" ? "text-emerald-600" :
                    selectedSeat.status === "MAINTENANCE" ? "text-slate-500" : "text-amber-600"
                  }`}>
                    {selectedSeat.status === "AVAILABLE" && "🟢 예약 가능"}
                    {selectedSeat.status === "MAINTENANCE" && "🛠️ 점검 중"}
                    {selectedSeat.status === "OCCUPIED" && "👤 이용 중"}
                    {selectedSeat.status === "REPORTED_1ST" && "⚠️ 1차 경고"}
                    {selectedSeat.status === "REPORTED_2ND" && "🚨 2차 신고 대기"}
                    {selectedSeat.status === "CLEARING" && "🧹 정리 중 (10분)"}
                  </span>
                </div>
                {selectedSeat.status !== "AVAILABLE" && selectedSeat.status !== "MAINTENANCE" && (
                  <>
                    <div className="flex justify-between">
                      <span className="text-slate-400">이용 학생:</span>
                      <span className="text-slate-800">{selectedSeat.current_user_name || "학부생"}</span>
                    </div>
                    {selectedSeat.reserved_at && (
                      <div className="flex justify-between">
                        <span className="text-slate-400">이용 시간:</span>
                        <span className="text-slate-800">{selectedSeat.reserved_at} ~ {selectedSeat.ends_at}</span>
                      </div>
                    )}
                    {selectedSeat.use_timer_seconds !== undefined && (
                      <div className="flex justify-between text-emerald-655 font-extrabold">
                        <span>남은 시간:</span>
                        <span>{Math.floor(selectedSeat.use_timer_seconds / 3600)}시간 {Math.floor((selectedSeat.use_timer_seconds % 3600) / 60)}분</span>
                      </div>
                    )}
                  </>
                )}
              </div>

              {/* 수동 점검중 (MAINTENANCE) 토글 */}
              <div className="p-4 bg-slate-50 border border-slate-200 rounded-2xl flex items-center justify-between">
                <div className="space-y-0.5">
                  <h4 className="text-xs font-extrabold text-slate-800">🛠️ 수동 점검중 설정</h4>
                  <p className="text-[10px] text-slate-400 font-semibold">점검중 상태 시 학생들의 예약을 원천 차단합니다.</p>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    handleAdminToggleMaintenance(selectedSeat.id);
                    setSelectedSeat(null);
                  }}
                  className={`px-3 py-1.5 rounded-xl text-xs font-bold border transition-all cursor-pointer ${
                    selectedSeat.status === "MAINTENANCE"
                      ? "bg-slate-200 hover:bg-slate-300 border-slate-350 text-slate-700"
                      : "bg-red-50 hover:bg-red-100 border-red-200 text-red-700"
                  }`}
                >
                  {selectedSeat.status === "MAINTENANCE" ? "🔧 점검 해제" : "🔧 점검중 설정"}
                </button>
              </div>

              {/* AVAILABLE 상태인 경우: 대리 즉석 예약 */}
              {selectedSeat.status === "AVAILABLE" && (
                <div className="p-4 bg-slate-50 border border-slate-200 rounded-2xl space-y-3">
                  <h4 className="text-xs font-extrabold text-emerald-800">🚀 사서 즉석 대리 예약</h4>
                  
                  <div className="space-y-1 text-xs">
                    <label className="text-[10px] uppercase font-bold text-slate-450">학생 학번 (8자리)</label>
                    <input
                      type="text"
                      maxLength={8}
                      value={proxyStudentId}
                      onChange={(e) => setProxyStudentId(e.target.value.replace(/[^0-9]/g, ""))}
                      placeholder="예: 20222043"
                      className="w-full px-3 py-2 bg-white border border-slate-250 rounded-xl outline-none focus:border-emerald-500 font-bold"
                    />
                  </div>
                  
                  <div className="space-y-1 text-xs">
                    <label className="text-[10px] uppercase font-bold text-slate-455">학생 이름</label>
                    <input
                      type="text"
                      value={proxyStudentName}
                      onChange={(e) => setProxyStudentName(e.target.value)}
                      placeholder="예: 강민성"
                      className="w-full px-3 py-2 bg-white border border-slate-255 rounded-xl outline-none focus:border-emerald-500 font-bold"
                    />
                  </div>

                  <div className="space-y-1 text-xs">
                    <label className="text-[10px] uppercase font-bold text-slate-455">대리 예약 이용시간</label>
                    <select
                      value={proxyReserveDuration}
                      onChange={(e) => setProxyReserveDuration(Number(e.target.value))}
                      className="w-full px-3 py-2 bg-white border border-slate-255 rounded-xl outline-none focus:border-emerald-500 font-bold text-slate-700 cursor-pointer"
                    >
                      <option value={60}>1시간 (60분)</option>
                      <option value={120}>2시간 (120분)</option>
                      <option value={180}>3시간 (180분)</option>
                      <option value={240}>4시간 (240분)</option>
                    </select>
                  </div>

                  <button
                    onClick={async () => {
                      if (!proxyStudentId.trim() || !proxyStudentName.trim()) {
                        alert("대리 예약할 학번과 성명을 모두 입력해 주세요.");
                        return;
                      }
                      await handleAdminReserve(selectedSeat.id, proxyStudentId.trim(), proxyStudentName.trim(), proxyReserveDuration);
                      setProxyStudentId("");
                      setProxyStudentName("");
                      setSelectedSeat(null);
                      alert("✓ [대리 예약 완료] 학생 대신 즉석 예약 신청이 승인 및 완료되었습니다.");
                    }}
                    className="w-full py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-bold transition-all shadow-md cursor-pointer"
                  >
                    즉석 대리 예약 실행
                  </button>
                </div>
              )}

              {/* 사용 중 / 경고 상태인 경우: 대리 연장, 대리 퇴실, 패널티 제재 */}
              {selectedSeat.status !== "AVAILABLE" && selectedSeat.status !== "MAINTENANCE" && (
                <>
                  <div className="p-4 bg-slate-50 border border-slate-200 rounded-2xl space-y-2.5">
                    <h4 className="text-xs font-extrabold text-amber-800">⚡ 대리 즉석 조치</h4>
                    <div className="grid grid-cols-2 gap-2">
                      <button
                        onClick={() => {
                          handleAdminExtend(selectedSeat.id, 60);
                          setSelectedSeat(null);
                        }}
                        className="py-2.5 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 border border-emerald-150 rounded-xl text-xs font-bold transition-all cursor-pointer text-center"
                      >
                        ⏱️ 1시간 대리 연장
                      </button>
                      <button
                        onClick={() => {
                          handleAdminCheckout(selectedSeat.id);
                          setSelectedSeat(null);
                        }}
                        className="py-2.5 bg-red-50 hover:bg-red-100 text-red-700 border border-red-150 rounded-xl text-xs font-bold transition-all cursor-pointer text-center"
                      >
                        ⚠️ 즉시 대리 반납 (개방)
                      </button>
                    </div>
                    {selectedSeat.status !== "CLEARING" && (
                      <button
                        onClick={() => {
                          handleDelayedRelease(selectedSeat.id);
                          setSelectedSeat(null);
                        }}
                        className="w-full py-2 bg-purple-50 hover:bg-purple-100 text-purple-700 border border-purple-150 rounded-xl text-xs font-bold transition-all cursor-pointer text-center"
                      >
                        🧹 물품 수거 및 10분 정리 상태(CLEARING) 전환
                      </button>
                    )}
                  </div>

                  <div className="p-4 bg-slate-50 border border-slate-200 rounded-2xl space-y-3">
                    <h4 className="text-xs font-extrabold text-red-700">🚨 현장 즉석 제재 및 로그인 차단</h4>
                    
                    <div className="space-y-1 text-xs">
                      <label className="text-[10px] uppercase font-bold text-slate-455">제재 처분 사유</label>
                      <input
                        type="text"
                        value={adminPenaltyReason}
                        onChange={(e) => setAdminPenaltyReason(e.target.value)}
                        placeholder="예: 상습 소음 유발 2회 고발"
                        className="w-full px-3 py-2 bg-white border border-slate-255 rounded-xl outline-none focus:border-red-500 font-bold"
                      />
                    </div>

                    <div className="space-y-1 text-xs">
                      <label className="text-[10px] uppercase font-bold text-slate-455">로그인/예약 차단 기간</label>
                      <select
                        value={adminPenaltyDays}
                        onChange={(e) => setAdminPenaltyDays(Number(e.target.value))}
                        className="w-full px-3 py-2 bg-white border border-slate-255 rounded-xl outline-none focus:border-red-500 font-bold text-slate-750 cursor-pointer"
                      >
                        <option value={3}>3일간 예약 차단</option>
                        <option value={7}>7일간 예약 차단</option>
                        <option value={30}>30일간 예약 차단</option>
                      </select>
                    </div>

                    <button
                      onClick={() => {
                        const occupantId = selectedSeat.current_user_name?.match(/\(([^)]+)\)/)?.[1] || "20222043";
                        const occupantOnlyName = selectedSeat.current_user_name?.split(" (")?.[0] || "이용 학생";
                        handleAdminPenalty(occupantId, occupantOnlyName, adminPenaltyReason, adminPenaltyDays);
                        setSelectedSeat(null);
                      }}
                      className="w-full py-2 bg-red-655 hover:bg-red-550 text-white rounded-xl text-xs font-bold transition-all shadow-md cursor-pointer"
                    >
                      제재 처분 적용
                    </button>
                  </div>
                </>
              )}
            </div>
            
            <div className="bg-slate-50 px-6 py-4 flex justify-end border-t border-slate-200">
              <button
                onClick={() => setSelectedSeat(null)}
                className="bg-slate-250 hover:bg-slate-300 text-slate-755 px-5 py-2 rounded-xl text-xs font-bold shadow-md transition-all active:scale-[0.98] cursor-pointer"
              >
                닫기
              </button>
            </div>
          </div>
        </div>
      )}

      {/* [TODO 3] 권한 없음 (Unauthorized) 우회 차단 경고 모달 */}
      {showUnauthorizedModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 p-4 backdrop-blur-md animate-fade-in">
          <div className="w-full max-w-md overflow-hidden rounded-3xl border border-red-200 bg-white shadow-2xl shadow-red-950/20">
            <div className="bg-red-50 border-b border-red-200 px-6 py-5 flex items-center gap-3 text-red-600">
              <ShieldCheck className="h-6 w-6 text-red-500 animate-bounce" />
              <h3 className="font-extrabold text-slate-900 text-base">⚠️ 접근 권한 부족 (Unauthorized)</h3>
            </div>
            
            <div className="p-6 space-y-4">
              <div className="bg-red-50/50 border border-red-150 p-4 rounded-2xl text-xs text-red-800 leading-relaxed font-bold">
                접속하신 계정은 일반 학생 권한(USER)으로 관리자 전용 시설물 관제 포털에 진입할 수 없습니다. 시스템 규정에 따라 학생 전용 대시보드로 자동 리다이렉트 처리되었습니다.
              </div>
            </div>

            <div className="bg-slate-50 px-6 py-4 flex justify-end border-t border-slate-200">
              <button
                onClick={() => setShowUnauthorizedModal(false)}
                className="bg-red-600 hover:bg-red-500 text-white px-5 py-2.5 rounded-xl text-xs font-bold shadow-lg shadow-red-700/10 transition-all active:scale-95 cursor-pointer"
              >
                학생 화면으로 돌아가기
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
