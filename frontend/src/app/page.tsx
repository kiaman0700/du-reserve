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
  Sliders
} from "lucide-react";
import SeatMap from "@/components/SeatMap";
import UserDashboard from "@/components/UserDashboard";
import AdminPanel from "@/components/AdminPanel";
import { supabase } from "@/supabaseClient";

// Models & Types
export type SeatStatus = "AVAILABLE" | "OCCUPIED" | "REPORTED_1ST" | "REPORTED_2ND" | "CLEARING";

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

export default function Page() {
  // Authentication & Session States
  const [isLoggedIn, setIsLoggedIn] = useState<boolean>(false);
  const [currentUser, setCurrentUser] = useState<Profile | null>(null);
  const [loginTab, setLoginTab] = useState<"STUDENT" | "ADMIN">("STUDENT");
  const [loginError, setLoginError] = useState<string | null>(null);
  const [studentIdInput, setStudentIdInput] = useState<string>("");
  const [studentNameInput, setStudentNameInput] = useState<string>("");
  const [adminCodeInput, setAdminCodeInput] = useState<string>("");

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
  const [dbSeats, setDbSeats] = useState<Seat[]>([]);
  const [facilitySeats, setFacilitySeats] = useState<Record<string, Seat[]>>({});
  const [absenceReports, setAbsenceReports] = useState<AbsenceReport[]>([]);
  const [complaints, setComplaints] = useState<any[]>([]);
  const [facilityConfigs, setFacilityConfigs] = useState<Record<string, any>>({});
  const [notificationSubscribed, setNotificationSubscribed] = useState<boolean>(false);
  const [cooldownTimeLeft, setCooldownTimeLeft] = useState<number>(0);
  
  // Navigation & perspective
  const [perspective, setPerspective] = useState<"STUDENT" | "ADMIN">("STUDENT");
  const [selectedSeat, setSelectedSeat] = useState<Seat | null>(null);
  const [timerSpeedUp, setTimerSpeedUp] = useState<boolean>(true);

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
      const { data, error } = await supabase.from('seats').select('*');
      if (!error && data) {
        setDbSeats(data);
      }
    } catch (err) {
      console.error('All db seats fetch error:', err);
    }
  };

  // Fetch real seats and reports for the active facility (room)
  const fetchSeatsAndReports = async () => {
    if (!selectedFacility) return;
    
    const isLibrary = selectedFacility.collegeId === 'library';
    if (isLibrary) {
      try {
        const { data: seatsData, error: seatsErr } = await supabase
          .from('seats')
          .select('*')
          .eq('room_name', selectedFacility.roomName)
          .order('seat_number', { ascending: true });

        if (seatsErr) throw seatsErr;

        const { data: resData, error: resErr } = await supabase
          .from('reservations')
          .select(`
            id,
            seat_id,
            user_id,
            status,
            profiles (
              university_id,
              name
            )
          `)
          .eq('status', 'ACTIVE');

        if (resErr) throw resErr;

        const { data: reportsData, error: reportsErr } = await supabase
          .from('absence_reports')
          .select('*')
          .eq('status', 'PENDING');

        if (reportsErr) throw reportsErr;

        const mappedSeats = (seatsData || []).map((seat: any) => {
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
          const warningTimerSeconds = Math.max(0, 1800 - elapsed);

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
          const { data: sub } = await supabase
            .from('notifications')
            .select('*')
            .eq('user_id', currentUser.id)
            .eq('room_name', selectedFacility.roomName)
            .eq('status', 'PENDING');
          setNotificationSubscribed(!!(sub && sub.length > 0));
        }
      } catch (err) {
        console.error('실시간 데이터 조회 실패, 로컬 mock 데이터 사용:', err);
        if (!facilitySeats[selectedFacility.id]) {
          const roomCapacity = selectedFacility.capacity || 24;
          const mockSeats = Array.from({ length: roomCapacity }, (_, i) => {
            const seatNumber = i + 1;
            const hash = selectedFacility.id.charCodeAt(0) + selectedFacility.id.charCodeAt(1) + i;
            if (hash % 5 === 0) {
              return {
                id: seatNumber,
                seat_number: seatNumber,
                room_name: selectedFacility.roomName,
                status: "OCCUPIED" as SeatStatus,
                current_user_id: `mock-user-${hash}`,
                current_user_name: `임의학생 (학부생)`,
                current_reservation_id: 1000 + hash,
                use_timer_seconds: 7200,
                total_duration_minutes: 120,
                reserved_at: "18:00:00",
                ends_at: "20:00:00"
              };
            }
            return {
              id: seatNumber,
              seat_number: seatNumber,
              room_name: selectedFacility.roomName,
              status: "AVAILABLE" as SeatStatus
            };
          });
          setFacilitySeats(prev => ({
            ...prev,
            [selectedFacility.id]: mockSeats
          }));
        }
      }
    } else {
      // Fallback for mock rooms
      if (!facilitySeats[selectedFacility.id]) {
        const mockSeats = INITIAL_SEATS.map((seat, idx) => {
          const hash = selectedFacility.id.charCodeAt(0) + selectedFacility.id.charCodeAt(1) + idx;
          if (hash % 7 === 0) {
            return {
              ...seat,
              status: "OCCUPIED" as SeatStatus,
              current_user_id: `mock-user-${hash}`,
              current_user_name: `임의학생 (학부생)`,
              current_reservation_id: 1000 + hash,
              use_timer_seconds: 7200,
              total_duration_minutes: 120,
              reserved_at: "18:00:00",
              ends_at: "20:00:00"
            };
          }
          return { ...seat };
        });
        setFacilitySeats(prev => ({
          ...prev,
          [selectedFacility.id]: mockSeats
        }));
      }
    }
  };

  // Base configurations and Auth listener
  useEffect(() => {
    const initSession = async () => {
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
            setCurrentUser({
              id: profile.id,
              university_id: profile.university_id,
              name: profile.name,
              role: profile.role as "USER" | "ADMIN",
              managed_college_id: profile.managed_college_id
            });
            setPerspective(profile.role === 'ADMIN' ? 'ADMIN' : 'STUDENT');
          }
        }
      } catch (err) {
        console.warn("Failed to initialize session profile", err);
      }
    };
    initSession();

    let subscription: any = null;
    try {
      const authListener = supabase.auth.onAuthStateChange(async (_event, session) => {
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
              setCurrentUser({
                id: profile.id,
                university_id: profile.university_id,
                name: profile.name,
                role: profile.role as "USER" | "ADMIN",
                managed_college_id: profile.managed_college_id
              });
              setPerspective(profile.role === 'ADMIN' ? 'ADMIN' : 'STUDENT');
            }
          } catch (profileErr) {
            console.warn("Failed to fetch auth change profile", profileErr);
          }
        } else {
          setIsLoggedIn(false);
          setCurrentUser(null);
        }
      });
      subscription = authListener.data?.subscription;
    } catch (authErr) {
      console.warn("Failed to set auth state listener", authErr);
    }

    return () => {
      if (subscription) {
        try {
          subscription.unsubscribe();
        } catch (unsubErr) {
          console.warn("Failed to unsubscribe", unsubErr);
        }
      }
    };
  }, []);

  // Global Realtime WebSockets configurations
  useEffect(() => {
    fetchConfigs();
    fetchComplaints();
    fetchAllDbSeats();

    let dbChannel: any = null;
    try {
      dbChannel = supabase.channel('global-db-updates')
        .on('postgres_changes', { event: '*', schema: 'public', table: 'seats' }, (payload) => {
          fetchAllDbSeats();
          if (selectedFacility) fetchSeatsAndReports();

          // [요청 5] 빈자리 실시간 반납 알림
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

  // Logged-in user's active seat reservation
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

  const [showWarningModal, setShowWarningModal] = useState<boolean>(false);

  useEffect(() => {
    if (myReservation && myReservation.status === "REPORTED_1ST") {
      setShowWarningModal(true);
    } else {
      setShowWarningModal(false);
    }
  }, [myReservation?.status]);

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

      // 2. Tick Seat countdowns
      setFacilitySeats((prevMap) => {
        const nextMap = { ...prevMap };
        Object.keys(nextMap).forEach(facId => {
          nextMap[facId] = nextMap[facId].map((seat) => {
            if (seat.status === "CLEARING" && seat.clearing_timer_seconds !== undefined) {
              const newSeconds = Math.max(0, seat.clearing_timer_seconds - decrement);
              if (newSeconds === 0) {
                // Auto AVAILABLE release
                supabase.from('seats').update({
                  status: 'AVAILABLE',
                  current_reservation_id: null,
                  clearing_timer_seconds: null,
                  updated_at: new Date().toISOString()
                }).eq('id', seat.id).then(() => fetchSeatsAndReports());
              }
              return { ...seat, clearing_timer_seconds: newSeconds };
            }

            if ((seat.status === "OCCUPIED" || seat.status === "REPORTED_1ST") && seat.use_timer_seconds !== undefined) {
              const newSeconds = Math.max(0, seat.use_timer_seconds - decrement);
              if (newSeconds === 0) {
                // Auto checkout
                supabase.from('seats').update({
                  status: 'AVAILABLE',
                  current_reservation_id: null,
                  use_timer_seconds: null,
                  total_duration_minutes: null,
                  reserved_at: null,
                  ends_at: null,
                  updated_at: new Date().toISOString()
                }).eq('id', seat.id).then(() => fetchSeatsAndReports());
              }
              return { ...seat, use_timer_seconds: newSeconds };
            }
            return seat;
          });
        });
        return nextMap;
      });

      // 3. [요청 4.1] 시설 마감 시간 자동 일괄 반납 처리
      Object.keys(facilityConfigs).forEach(roomName => {
        const config = facilityConfigs[roomName];
        if (config) {
          const nowStr = new Date().toTimeString().slice(0, 8);
          if (nowStr >= config.close_time) {
            // Find all active occupied seats for this facility room
            const closingSeats = dbSeats.filter(s => s.room_name === roomName && s.status !== 'AVAILABLE');
            closingSeats.forEach(async (seat) => {
              await supabase.from('seats').update({
                status: 'AVAILABLE',
                current_reservation_id: null,
                use_timer_seconds: null,
                total_duration_minutes: null,
                reserved_at: null,
                ends_at: null,
                updated_at: new Date().toISOString()
              }).eq('id', seat.id);
            });
            fetchAllDbSeats();
          }
        }
      });

    }, 1000);

    return () => clearInterval(interval);
  }, [timerSpeedUp, facilityConfigs, dbSeats]);

  // Sync selected seat details when facility updates
  useEffect(() => {
    if (selectedSeat && selectedFacility) {
      const currentList = facilitySeats[selectedFacility.id] || [];
      const updated = currentList.find(s => s.id === selectedSeat.id);
      if (updated) setSelectedSeat(updated);
    }
  }, [facilitySeats, selectedFacility]);

  // Check and trigger empty seat subscription push
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
          // Calculate remaining minutes from endsAt time
          alert(`📢 [빈자리 알림]\n신청하신 ${roomName}에 약 ${endsAt ? endsAt.slice(0, 5) : ""} 경에 빈자리가 발생할 예정입니다! 미리 준비해 보세요.`);
        }
        // Update subscription
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

  // [요청 1] 명시적인 검색 처리 및 카테고리 스마트 동기화
  const handleSearchSubmit = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    setSearchKeyword(tempKeyword);
    setSearchBuilding(tempBuilding);
    setSearchCapacity(tempCapacity);

    // 건물별 필터에 따라 카테고리 탭 자동 전환
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

  // Sign in / Sign up wrapper
  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoginError(null);

    if (loginTab === "STUDENT") {
      if (!studentIdInput.trim() || !studentNameInput.trim()) {
        setLoginError("학번과 성명을 입력해 주세요.");
        return;
      }
      if (studentIdInput.trim().length !== 8) {
        setLoginError("학번은 8자리 숫자로 입력해야 합니다.");
        return;
      }

      const email = `${studentIdInput.trim()}@daegu.ac.kr`;
      const password = `${studentIdInput.trim()}__daegu!`;

      try {
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) {
          // Sign up if not exist
          const { error: signUpErr } = await supabase.auth.signUp({
            email,
            password,
            options: {
              data: {
                university_id: studentIdInput.trim(),
                name: `${studentNameInput.trim()} (IT융합학과)`,
                role: 'USER'
              }
            }
          });
          if (signUpErr) {
            throw signUpErr;
          }
          const { error: signIn2Err } = await supabase.auth.signInWithPassword({ email, password });
          if (signIn2Err) throw signIn2Err;
        }
      } catch (err: any) {
        console.warn("Supabase auth login failed, using local mock fallback:", err);
        // Fallback login
        setIsLoggedIn(true);
        setCurrentUser({
          id: `mock-student-${studentIdInput.trim()}`,
          university_id: studentIdInput.trim(),
          name: `${studentNameInput.trim()} (IT융합학과)`,
          role: "USER"
        });
        setPerspective("STUDENT");
      }
    } else {
      if (!adminCodeInput.trim()) {
        setLoginError("관리자 코드를 입력해 주세요.");
        return;
      }

      const email = `${adminCodeInput.trim()}@daegu.ac.kr`;
      const password = `admin_daegu_2026!`;

      try {
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) {
          const { error: signUpErr } = await supabase.auth.signUp({
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
          });
          if (signUpErr) throw signUpErr;
          const { error: signIn2Err } = await supabase.auth.signInWithPassword({ email, password });
          if (signIn2Err) throw signIn2Err;
        }
      } catch (err: any) {
        console.warn("Supabase auth admin login failed, using local mock fallback:", err);
        setIsLoggedIn(true);
        setCurrentUser({
          id: `mock-admin-${adminCodeInput.trim()}`,
          university_id: adminCodeInput.trim(),
          name: "이영희 사서관",
          role: "ADMIN",
          managed_college_id: "library"
        });
        setPerspective("ADMIN");
      }
    }
  };

  // Direct login helpers for easy testing
  const loginAsDemoStudent = async () => {
    setStudentIdInput("20222043");
    setStudentNameInput("강민성");
    const email = "20222043@daegu.ac.kr";
    const password = "20222043__daegu!";
    try {
      const { error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) {
        const { error: signUpErr } = await supabase.auth.signUp({
          email,
          password,
          options: {
            data: {
              university_id: "20222043",
              name: "강민성 (컴퓨터공학과)",
              role: 'USER'
            }
          }
        });
        if (signUpErr) throw signUpErr;
        const { error: signIn2Err } = await supabase.auth.signInWithPassword({ email, password });
        if (signIn2Err) throw signIn2Err;
      }
    } catch (err) {
      console.warn("Supabase auth failed, logging in with demo mock session:", err);
      // Fallback login
      setIsLoggedIn(true);
      setCurrentUser({
        id: "a1b2c3d4-e5f6-7a8b-9c0d-1e2f3a4b5c6d", // 실제 DB와 일치하는 UUID로 매핑하여 타입 오류 예방
        university_id: "20222043",
        name: "강민성 (컴퓨터공학과)",
        role: "USER"
      });
      setPerspective("STUDENT");
    }
  };

  const loginAsDemoAdmin = async () => {
    setAdminCodeInput("ADM-9942");
    const email = "ADM-9942@daegu.ac.kr";
    const password = "admin_daegu_2026!";
    try {
      const { error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) {
        const { error: signUpErr } = await supabase.auth.signUp({
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
        });
        if (signUpErr) throw signUpErr;
        const { error: signIn2Err } = await supabase.auth.signInWithPassword({ email, password });
        if (signIn2Err) throw signIn2Err;
      }
    } catch (err) {
      console.warn("Supabase auth failed, logging in with demo mock session:", err);
      // Fallback login
      setIsLoggedIn(true);
      setCurrentUser({
        id: "f9e8d7c6-b5a4-3f2e-1d0c-9b8a7f6e5d4c", // 실제 DB와 일치하는 UUID로 매핑하여 타입 오류 예방
        university_id: "ADM-9942",
        name: "이영희 사서관",
        role: "ADMIN",
        managed_college_id: "library"
      });
      setPerspective("ADMIN");
    }
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
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
    setTempKeyword("");
    setTempBuilding("ALL");
    setTempCapacity("");
    setSearchKeyword("");
    setSearchBuilding("ALL");
    setSearchCapacity("");
    setFacilityFilter("ALL");
  };

  // Student DB reservations
  const handleReserveSeat = async (seatId: number, durationMinutes: number | null) => {
    if (!currentUser || !selectedFacility) return;
    try {
      // Check operating hours config
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
        // Unspecified time - goes to closing hour
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

      setSeats(prev => prev.map(s => s.id === seatId ? {
        ...s,
        status: "OCCUPIED",
        current_user_id: currentUser.id,
        current_user_name: `${currentUser.name} (${currentUser.university_id})`,
        current_reservation_id: Math.floor(Math.random() * 10000),
        use_timer_seconds: use_timer,
        total_duration_minutes: durationMinutes || 120,
        reserved_at: reserved_at_str,
        ends_at: ends_at_str
      } : s));
      alert("좌석 예약이 완료되었습니다. (로컬 데모 모드)");
    }
  };

  const handleExtendSeat = async (seatId: number, extendMinutes: number) => {
    try {
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
      setSeats(prev => prev.map(s => {
        if (s.id === seatId) {
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
        }
        return s;
      }));
      alert(`이용시간이 ${extendMinutes}분 연장되었습니다. (로컬 데모 모드)`);
    }
  };

  const handleCheckoutSeat = async () => {
    if (!currentUser || !myReservation) return;
    try {
      const { error } = await supabase.rpc('return_seat', {
        p_seat_id: myReservation.id,
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
      }).eq('id', myReservation.id);

      await supabase.from('absence_reports')
        .update({ status: 'RESOLVED_RETURNED', resolved_at: new Date().toISOString() })
        .eq('seat_id', myReservation.id)
        .eq('status', 'PENDING');

      setShowWarningModal(false);
      fetchSeatsAndReports();
      alert("정상 반납 완료되었습니다.");
    } catch (err) {
      console.warn("Supabase return_seat failed, executing mock return:", err);
      setSeats(prev => prev.map(s => s.id === myReservation.id ? {
        ...s,
        status: "AVAILABLE",
        current_user_id: undefined,
        current_user_name: undefined,
        current_reservation_id: undefined,
        use_timer_seconds: undefined,
        total_duration_minutes: undefined,
        reserved_at: undefined,
        ends_at: undefined
      } : s));
      setAbsenceReports(prev => prev.filter(r => r.seat_id !== myReservation.id));
      setShowWarningModal(false);
      alert("정상 반납 완료되었습니다. (로컬 데모 모드)");
    }
  };

  const handleConfirmReturn = async () => {
    if (!currentUser || !myReservation) return;
    try {
      const { error } = await supabase.rpc('confirm_user_returned', {
        p_seat_id: myReservation.id,
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
      setSeats(prev => prev.map(s => s.id === myReservation.id ? { ...s, status: "OCCUPIED" } : s));
      setAbsenceReports(prev => prev.filter(r => r.seat_id !== myReservation.id));
      setShowWarningModal(false);
      alert("자리 복귀 소명이 정상 완료되어 경고가 리셋되었습니다. (로컬 데모 모드)");
    }
  };

  // 1차 부재 신고 등록
  const handleReportAbsence1st = async (seatId: number, photoUrl: string) => {
    if (!currentUser) return;
    try {
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
      setSeats(prev => prev.map(s => s.id === seatId ? { ...s, status: "REPORTED_1ST" } : s));
      
      const newReport: AbsenceReport = {
        id: Math.floor(Math.random() * 10000),
        seat_id: seatId,
        reporter_id: currentUser.id,
        first_photo_url: photoUrl,
        first_reported_at: new Date().toISOString(),
        warning_timer_seconds: 1800,
        status: "PENDING"
      };
      setAbsenceReports(prev => [...prev, newReport]);
      alert("1차 부재 신고 및 타이머가 가동되었습니다. (로컬 데모 모드)");
    }
  };

  // 2차 최종 부재 신고 등록
  const handleReportAbsence2nd = async (seatId: number, photoUrl: string) => {
    try {
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
      setSeats(prev => prev.map(s => s.id === seatId ? { ...s, status: "REPORTED_2ND" } : s));
      setAbsenceReports(prev => prev.map(r => r.seat_id === seatId ? {
        ...r,
        second_photo_url: photoUrl,
        second_reported_at: new Date().toISOString(),
        warning_timer_seconds: 0
      } : r));
      alert("2차 최종 신고 접수가 완료되었습니다. 관리자 심사를 대기합니다. (로컬 데모 모드)");
    }
  };

  // 조기 퇴실 예정 설정
  const handleSetEarlyCheckout = async (seatId: number, minutes: number) => {
    try {
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
      setSeats(prev => prev.map(s => s.id === seatId ? {
        ...s,
        use_timer_seconds: minutes * 60,
        ends_at: ends_at_str
      } : s));
      alert(`약 ${minutes}분 후 퇴실 예정 시간이 설정되었습니다. (로컬 데모 모드)`);
    }
  };

  // 조기 퇴실 취소
  const handleCancelEarlyCheckout = async (seatId: number) => {
    if (!selectedFacility) return;
    try {
      const config = facilityConfigs[selectedFacility.roomName];
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
      setSeats(prev => prev.map(s => s.id === seatId ? {
        ...s,
        use_timer_seconds: use_timer,
        ends_at: closing
      } : s));
      alert("조기 퇴실 예정이 취소되었으며, 마감시간까지 이용상태로 복원됩니다. (로컬 데모 모드)");
    }
  };

  // 민원 신고 등록
  const handleSubmitComplaint = async (category: string, description: string, photo: string | null): Promise<boolean> => {
    if (!currentUser || !selectedFacility) return false;
    try {
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

      setCooldownTimeLeft(1800); // 30분 쿨타임
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

  // 소명서 서면 제출
  const handleSubmitVindication = async (complaintId: number, type: string, comment: string) => {
    try {
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

  // 빈자리 알림 받기 신청
  const handleSubscribeNotification = async () => {
    if (!currentUser || !selectedFacility) return;
    try {
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
      alert(`${selectedFacility.roomName}의 빈자리 알림 신청이 완료되었습니다. (로컬 데모 모드)`);
    }
  };

  // Admin Actions: Immediate release (즉시 개방)
  const handleImmediateRelease = async (seatId: number) => {
    if (!selectedFacility) return;
    const seat = activeSeats.find(s => s.id === seatId);
    if (!seat) return;

    if (currentUser && seat.current_user_id === currentUser.id) {
      setForcedCheckoutAlert({ show: true, seatNumber: seat.seat_number });
    }

    try {
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
      setSeats(prev => prev.map(s => s.id === seatId ? {
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
      } : s));
      setAbsenceReports(prev => prev.map(r => r.seat_id === seatId ? { ...r, status: "RESOLVED_RELEASED" } : r));
      alert(`[강제 퇴실 완료] ${seat.seat_number}번 좌석이 즉시 개방되었습니다. (로컬 데모 모드)`);
    }
  };

  // Admin Actions: Delayed release (10분 물품 정리 상태 개방)
  const handleDelayedRelease = async (seatId: number) => {
    if (!selectedFacility) return;
    const seat = activeSeats.find(s => s.id === seatId);
    if (!seat) return;

    if (currentUser && seat.current_user_id === currentUser.id) {
      setForcedCheckoutAlert({ show: true, seatNumber: seat.seat_number });
    }

    try {
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
      setSeats(prev => prev.map(s => s.id === seatId ? {
        ...s,
        status: "CLEARING",
        clearing_timer_seconds: 600,
        use_timer_seconds: undefined,
        total_duration_minutes: undefined,
        reserved_at: undefined,
        ends_at: undefined
      } : s));
      setAbsenceReports(prev => prev.map(r => r.seat_id === seatId ? { ...r, status: "RESOLVED_RELEASED" } : r));
      alert(`[강제 수거 조치 완료] ${seat.seat_number}번 좌석이 물품 정리 상태(CLEARING, 10분 유예)로 전환되었습니다. (로컬 데모 모드)`);
    }
  };

  // Admin Actions: Resolve custom complaints
  const handleResolveComplaint = async (complaintId: number, comment: string) => {
    try {
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

  // Admin Actions: Operating config updates
  const handleUpdateConfig = async (roomName: string, openTime: string, closeTime: string, maxUseHours: number | null) => {
    try {
      await supabase.from('facility_configs').upsert({
        room_name: roomName,
        open_time: openTime,
        close_time: closeTime,
        max_use_hours: maxUseHours
      });
      fetchConfigs();
    } catch (err) {
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
    }
  };

  // Admin Actions: Look up student information
  const handleSearchStudent = async (studentId: string) => {
    try {
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

  // Admin Actions: Apply penalty to user
  const handleApplyPenalty = async (studentUuid: string, days: number | null, reason: string) => {
    try {
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
      alert(days === null ? "제재 조치가 해제되었습니다. (로컬 데모 모드)" : `${days}일 이용 정지 제재가 성공적으로 적용되었습니다. (로컬 데모 모드)`);
    }
  };

  // Admin Actions: Proxy reservation on behalf of student
  const handleProxyReserve = async (studentUuid: string, studentId: string, studentName: string, facilityId: string, seatId: number, duration: number) => {
    try {
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

      setSeats(prev => prev.map(s => s.id === seatId ? {
        ...s,
        status: "OCCUPIED",
        current_user_id: studentUuid,
        current_user_name: `${studentName} (${studentId})`,
        current_reservation_id: Math.floor(Math.random() * 10000),
        use_timer_seconds: duration * 60,
        total_duration_minutes: duration,
        reserved_at: reserved_at_str,
        ends_at: ends_at_str
      } : s));
      alert(`[대리 예약 완료]\n학번: ${studentId}\n이름: ${studentName}\n이용시간: ${duration}분 (로컬 데모 모드)`);
    }
  };

  // Admin Actions: Proxy checkouts
  const handleProxyCheckout = async (seatId: number, studentUuid: string) => {
    try {
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
      setSeats(prev => prev.map(s => s.id === seatId ? {
        ...s,
        status: "AVAILABLE",
        current_user_id: undefined,
        current_user_name: undefined,
        current_reservation_id: undefined,
        use_timer_seconds: undefined,
        total_duration_minutes: undefined,
        reserved_at: undefined,
        ends_at: undefined
      } : s));
      alert("대리 반납 및 좌석 개방이 처리되었습니다. (로컬 데모 모드)");
    }
  };

  // Filters calculation
  const filteredFacilities = FACILITIES.filter(fac => {
    if (currentUser?.role === "ADMIN" && currentUser.managed_college_id) {
      if (fac.collegeId !== currentUser.managed_college_id) return false;
    }

    if (searchBuilding !== "ALL") {
      if (!fac.buildingName.includes(searchBuilding)) return false;
    }

    // [요청 3] 카테고리 필터 매핑
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

  // Login view if not logged in
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
                        value={studentIdInput}
                        onChange={(e) => setStudentIdInput(e.target.value.replace(/[^0-9]/g, ""))}
                        placeholder="예: 20222043"
                        className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:bg-white focus:border-emerald-500 outline-none transition-all font-bold text-slate-700"
                      />
                    </div>
                  </div>
                  <div className="space-y-1">
                    <label className="text-[10px] uppercase font-bold text-slate-500 tracking-wider">성명</label>
                    <div className="relative">
                      <Sparkles className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-450" />
                      <input
                        type="text"
                        value={studentNameInput}
                        onChange={(e) => setStudentNameInput(e.target.value)}
                        placeholder="성함 입력"
                        className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:bg-white focus:border-emerald-500 outline-none transition-all font-bold text-slate-700"
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
                      value={adminCodeInput}
                      onChange={(e) => setAdminCodeInput(e.target.value)}
                      placeholder="관리자코드 (예: ADM-9942)"
                      className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:bg-white focus:border-emerald-500 outline-none transition-all font-bold text-slate-700"
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

            <div className="mt-8 pt-6 border-t border-slate-200 text-center">
              <span className="text-[10px] text-slate-400 uppercase tracking-wider font-extrabold block mb-3">
                편리한 테스트를 위한 원클릭 계정
              </span>
              <div className="flex gap-2.5">
                <button
                  type="button"
                  onClick={loginAsDemoStudent}
                  className="flex-1 py-2 px-3 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 rounded-xl border border-emerald-150 text-xs font-bold transition-all cursor-pointer"
                >
                  학생 데모 로그인
                </button>
                <button
                  type="button"
                  onClick={loginAsDemoAdmin}
                  className="flex-1 py-2 px-3 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl border border-slate-200 text-xs font-bold transition-all cursor-pointer"
                >
                  관리자 데모 로그인
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

  // Facility List Main Page View
  if (selectedFacility === null) {
    return (
      <div className="min-h-screen flex flex-col justify-between bg-gradient-to-br from-emerald-50 via-lime-50/10 to-white text-slate-800 relative">
        <YellowDropsBackground />
        
        {/* Navbar */}
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

        {/* Main portal grid */}
        <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 mt-10 mb-16 flex-grow w-full">
          
          {/* Main Info Banner */}
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
            
            {/* Quick stats on banner */}
            <div className="absolute right-8 bottom-8 hidden md:flex items-center gap-4">
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
            
            {/* Sidebar Search section */}
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

              {/* 1. Keyword Input */}
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

              {/* 2. Building selection */}
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

              {/* 3. Capacity selection */}
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

              {/* [요청 1] 명시적인 검색하기 버튼 */}
              <button
                type="button"
                onClick={() => handleSearchSubmit()}
                className="w-full py-2.5 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs font-bold shadow-md transition-all active:scale-95 cursor-pointer text-center"
              >
                검색하기
              </button>
            </div>

            {/* Right toolbar & Card list */}
            <div className="lg:col-span-3 space-y-6">
              
              {/* [요청 3] 카테고리 탭 분류 기준의 시설명 직관화 */}
              <div className="flex flex-wrap bg-white p-1 rounded-xl border border-slate-200 shadow-2xs w-fit gap-1">
                {[
                  { label: "전체 구역", key: "ALL" },
                  { label: "창파도서관", key: "library" },
                  { label: "IT·공과대학", key: "it-eng" },
                  { label: "사범대학", key: "edu" },
                  { label: "재활과학대학", key: "rehab" },
                  { label: "글로벌경영대학", key: "biz" },
                  { label: "공공인재대학", key: "public" },
                  { label: "디자인예술대학", key: "design" }
                ].map((btn) => {
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
                    const isLibraryRoom = fac.collegeId === 'library';
                    
                    // If db backed, query from dbSeats, otherwise fallback to local/mock count
                    const seats = isLibraryRoom 
                      ? dbSeats.filter(s => s.room_name === fac.roomName)
                      : (facilitySeats[fac.id] || []);
                    
                    const totalCount = seats.length || fac.capacity;
                    const occupied = seats.filter(s => s.status === "OCCUPIED").length;
                    const warning = seats.filter(s => s.status === "REPORTED_1ST").length;
                    const pendingAudit = seats.filter(s => s.status === "REPORTED_2ND").length;
                    const clearing = seats.filter(s => s.status === "CLEARING").length;
                    
                    const available = totalCount - (occupied + warning + pendingAudit + clearing);

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

            {/* Quick perspective switch for demo */}
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
              userReservation={myReservation}
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
              selectedFacility={selectedFacility}
              allSeats={activeSeats}
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
            />
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
    </div>
  );
}
