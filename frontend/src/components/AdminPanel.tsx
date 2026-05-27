"use client";

import React, { useState } from "react";
import { Seat, Profile, AbsenceReport } from "@/app/page";
import { 
  Shield, 
  AlertOctagon, 
  Trash2, 
  Clock, 
  CheckCircle,
  HelpCircle,
  Sparkles,
  RefreshCw,
  AlertCircle,
  Camera,
  Search,
  UserCheck,
  UserX,
  Sliders,
  Bell,
  X,
  VolumeX,
  Wrench,
  ChevronRight,
  Send,
  Loader2
} from "lucide-react";

interface Facility {
  id: string;
  collegeId: string;
  name: string;
  roomName: string;
  category: "STUDY" | "SEMINAR" | "PC" | "LIBRARY" | "SPORTS";
  tags: string[];
  capacity: number;
  buildingName: string;
  description: string;
}

interface FacilityConfig {
  room_name: string;
  open_time: string;
  close_time: string;
  max_use_hours: number | null;
}

interface Complaint {
  id: number;
  user_id: string;
  seat_id: number | null;
  room_name: string;
  category: "NOISE" | "DAMAGE" | "CLEANLINESS" | "ABSENCE" | "OTHER";
  description: string;
  photo_url?: string;
  status: "PENDING" | "PROCESSING" | "RESOLVED";
  resolution_comment?: string;
  created_at: string;
  profiles?: {
    university_id: string;
    name: string;
  };
}

interface AdminPanelProps {
  adminUser: Profile;
  seats: Seat[];
  absenceReports: AbsenceReport[];
  complaints: Complaint[];
  facilities: Facility[];
  configs: Record<string, FacilityConfig>;
  onImmediateRelease: (seatId: number) => void;
  onDelayedRelease: (seatId: number) => void;
  onResolveComplaint: (complaintId: number, comment: string) => void;
  onUpdateConfig: (roomName: string, openTime: string, closeTime: string, maxUseHours: number | null) => void;
  onSearchStudent: (studentId: string) => Promise<any | null>;
  onApplyPenalty: (studentUuid: string, days: number | null, reason: string) => void;
  onProxyReserve: (studentUuid: string, studentId: string, studentName: string, facilityId: string, seatId: number, duration: number) => void;
  onProxyCheckout: (seatId: number, studentUuid: string) => void;
  onFocusComplaintSeat?: (roomName: string, seatNumber: number) => void;
}

export default function AdminPanel({
  adminUser,
  seats,
  absenceReports,
  complaints,
  facilities,
  configs,
  onImmediateRelease,
  onDelayedRelease,
  onResolveComplaint,
  onUpdateConfig,
  onSearchStudent,
  onApplyPenalty,
  onProxyReserve,
  onProxyCheckout,
  onFocusComplaintSeat
}: AdminPanelProps) {
  // Config state
  const [selectedConfigRoom, setSelectedConfigRoom] = useState<string>("제1열람실");
  const [configOpenTime, setConfigOpenTime] = useState<string>("09:00");
  const [configCloseTime, setConfigCloseTime] = useState<string>("22:00");
  const [hasMaxLimit, setHasMaxLimit] = useState<boolean>(true);
  const [configMaxHours, setConfigMaxHours] = useState<number>(3);

  // Student search/action states
  const [searchStudentId, setSearchStudentId] = useState<string>("");
  const [searchedStudent, setSearchedStudent] = useState<any | null>(null);
  const [searchLoading, setSearchLoading] = useState<boolean>(false);
  const [penaltyReason, setPenaltyReason] = useState<string>("상습 소음 유발");

  // Proxy reserve states
  const [proxyFacilityId, setProxyFacilityId] = useState<string>("");
  const [proxySeatId, setProxySeatId] = useState<number | null>(null);
  const [proxyDuration, setProxyDuration] = useState<number>(120);

  // Custom comments
  const [customComments, setCustomComments] = useState<Record<number, string>>({});

  // 1. Filter complaints for admin's managed area (e.g. 창파도서관 room names: 제1열람실, 2층 열람실, 5층 열람실)
  const managedRooms = ["제1열람실", "2층 열람실", "5층 열람실"];
  const activeComplaints = complaints.filter(c => managedRooms.includes(c.room_name));

  // Statistics
  const totalSeats = seats.length;
  const availableSeats = seats.filter(s => s.status === "AVAILABLE").length;
  const occupiedSeats = seats.filter(s => s.status === "OCCUPIED").length;
  const warningSeats = seats.filter(s => s.status === "REPORTED_1ST").length;
  const pendingAuditSeats = seats.filter(s => s.status === "REPORTED_2ND").length;
  const clearingSeats = seats.filter(s => s.status === "CLEARING").length;

  // Active reports that are PENDING audit (REPORTED_2ND stage)
  const auditList = seats
    .filter(s => s.status === "REPORTED_2ND")
    .map(seat => {
      const report = absenceReports.find(r => r.seat_id === seat.id && r.status === "PENDING");
      return { seat, report };
    })
    .filter(item => item.report !== undefined);

  // Load configuration details for selected room name
  const handleLoadConfig = (roomName: string) => {
    setSelectedConfigRoom(roomName);
    const cfg = configs[roomName];
    if (cfg) {
      setConfigOpenTime(cfg.open_time.slice(0, 5));
      setConfigCloseTime(cfg.close_time.slice(0, 5));
      setHasMaxLimit(cfg.max_use_hours !== null);
      if (cfg.max_use_hours) setConfigMaxHours(cfg.max_use_hours);
    }
  };

  // Save config
  const handleSaveConfig = () => {
    onUpdateConfig(
      selectedConfigRoom,
      configOpenTime + ":00",
      configCloseTime + ":00",
      hasMaxLimit ? configMaxHours : null
    );
    alert(`[설정 저장 완료]\n시설: ${selectedConfigRoom}\n운영시간: ${configOpenTime} ~ ${configCloseTime}\n제한시간: ${hasMaxLimit ? `${configMaxHours}시간` : "제한 없음"}`);
  };

  // Perform Student search
  const handleStudentSearch = async () => {
    if (!searchStudentId.trim()) {
      alert("검색할 학번을 입력해 주세요.");
      return;
    }
    setSearchLoading(true);
    const result = await onSearchStudent(searchStudentId.trim());
    setSearchLoading(false);
    if (result) {
      setSearchedStudent(result);
      // Default set proxy facility if they don't have reservation
      const managedFacs = facilities.filter(f => f.collegeId === adminUser.managed_college_id);
      if (managedFacs.length > 0) {
        setProxyFacilityId(managedFacs[0].id);
      }
    } else {
      setSearchedStudent(null);
      alert("해당 학번의 학생 정보를 찾을 수 없습니다.");
    }
  };

  // Quick reply action for complaints
  const handleResolveWithTemplate = (complaintId: number, templateText: string) => {
    onResolveComplaint(complaintId, templateText);
  };

  return (
    <div className="space-y-6">
      
      {/* Admin Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 rounded-2xl bg-white border border-slate-200 p-6 shadow-xs animate-fade-in">
        <div className="flex items-center space-x-4">
          <div className="rounded-full bg-emerald-50 p-3 text-emerald-600 border border-emerald-100 shadow-3xs">
            <Shield className="h-6 w-6" />
          </div>
          <div>
            <div className="flex items-center space-x-2">
              <h2 className="text-lg font-extrabold text-slate-800">{adminUser.name}</h2>
              <span className="rounded bg-emerald-55 text-[10px] font-extrabold px-2.5 py-0.5 text-emerald-800 border border-emerald-150 uppercase font-mono tracking-wider">
                도서관 관리실 (ADMIN)
              </span>
            </div>
            <p className="text-xs text-slate-500 font-semibold mt-0.5">운영자 ID: {adminUser.university_id} | 담당구역: 창파도서관 전체 구역</p>
          </div>
        </div>

        <div className="text-xs text-slate-500 bg-slate-50 px-4 py-3 rounded-xl border border-slate-200 flex items-center gap-2 max-w-md font-semibold leading-relaxed">
          <AlertCircle className="h-4 w-4 text-emerald-600 flex-shrink-0" />
          <span>신고 2차 증빙이 들어온 열람석은 1/2차 현장 사진 대조 후 퇴실 정리(보관) 혹은 즉시 개방을 명령해 주십시오.</span>
        </div>
      </div>

      {/* Stats Cards Row */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
        <div className="bg-white border border-slate-200 p-4 rounded-xl text-center shadow-xs font-semibold">
          <p className="text-xs text-slate-400 font-normal">관제 구역 전체</p>
          <p className="text-2xl font-bold text-slate-850 mt-1 font-mono">{totalSeats}</p>
        </div>
        <div className="bg-white border border-slate-200 p-4 rounded-xl text-center shadow-xs font-semibold">
          <p className="text-xs text-emerald-650 font-normal">예약 가능</p>
          <p className="text-2xl font-bold text-emerald-650 mt-1 font-mono">{availableSeats}</p>
        </div>
        <div className="bg-white border border-slate-200 p-4 rounded-xl text-center shadow-xs font-semibold">
          <p className="text-xs text-slate-500 font-normal">이용 중</p>
          <p className="text-2xl font-bold text-slate-700 mt-1 font-mono">{occupiedSeats}</p>
        </div>
        <div className="bg-white border border-slate-200 p-4 rounded-xl text-center shadow-xs border-l-4 border-l-red-500 font-semibold">
          <p className="text-xs text-red-500 font-normal">2차 대기(검증)</p>
          <p className="text-2xl font-bold text-red-500 mt-1 font-mono animate-pulse">{pendingAuditSeats}</p>
        </div>
        <div className="bg-white border border-slate-200 p-4 rounded-xl text-center shadow-xs font-semibold">
          <p className="text-xs text-purple-650 font-normal">보관/정리 중</p>
          <p className="text-2xl font-bold text-purple-655 mt-1 font-mono">{clearingSeats}</p>
        </div>
      </div>

      {/* Main Grid Columns */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Left Column: Complaints & Audits (통합 민원 피드) */}
        <div className="lg:col-span-2 space-y-6">
          
          {/* [요청 2.1] 실시간 신고 모니터링 및 알림 (통합 민원 피드) */}
          <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-xs space-y-6">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h3 className="text-base font-extrabold text-slate-800 flex items-center gap-2">
                <AlertOctagon className="h-5 w-5 text-red-550 animate-pulse" />
                <span>통합 민원 신고 피드 ({activeComplaints.filter(c => c.status !== "RESOLVED").length}건 대기)</span>
              </h3>
              <span className="text-[10px] bg-red-50 text-red-650 px-2 py-0.5 rounded border border-red-200 font-bold font-mono tracking-wider">
                COMPLAINTS FEED
              </span>
            </div>

            {activeComplaints.length > 0 ? (
              <div className="space-y-6 divide-y divide-slate-100">
                {activeComplaints.map((comp) => (
                  <div 
                    key={comp.id} 
                    onClick={() => {
                      if (onFocusComplaintSeat && comp.seat_id) {
                        onFocusComplaintSeat(comp.room_name, comp.seat_id);
                      }
                    }}
                    className={`pt-6 first:pt-0 space-y-3 font-semibold text-slate-700 transition-all duration-300 ${
                      comp.seat_id && onFocusComplaintSeat 
                        ? "cursor-pointer hover:bg-slate-50/70 p-3.5 rounded-2xl border border-dashed border-transparent hover:border-emerald-300 hover:shadow-xs" 
                        : ""
                    }`}
                    title={comp.seat_id ? "클릭 시 해당 도면 구역으로 이동 및 좌석을 포커싱합니다." : ""}
                  >
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-extrabold text-slate-850">
                          {comp.room_name} {comp.seat_id ? `${comp.seat_id}번석` : ""}
                        </span>
                        <span className={`px-2 py-0.5 rounded-md text-[9px] font-bold ${
                          comp.category === "NOISE" ? "bg-amber-50 text-amber-700 border border-amber-200" :
                          comp.category === "DAMAGE" ? "bg-red-50 text-red-700 border border-red-200" :
                          comp.category === "CLEANLINESS" ? "bg-blue-50 text-blue-700 border border-blue-200" :
                          "bg-purple-50 text-purple-700 border border-purple-200"
                        }`}>
                          {comp.category === "NOISE" && "소음/소란"}
                          {comp.category === "DAMAGE" && "시설 파손"}
                          {comp.category === "CLEANLINESS" && "청결 불량"}
                          {comp.category === "ABSENCE" && "부재 고발"}
                          {comp.category === "OTHER" && "기타 민원"}
                        </span>
                      </div>
                      
                      <div className="text-[10px] text-slate-400 font-mono">
                        신고자: {comp.profiles?.name || "학부생"} ({comp.profiles?.university_id || "202*****"}) | {new Date(comp.created_at).toLocaleString("ko-KR")}
                      </div>
                    </div>

                    <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-600 leading-relaxed font-semibold">
                      {comp.description}
                    </div>

                    {/* Image display if attached */}
                    {comp.photo_url && (
                      <div className="max-w-[200px] border border-slate-200 rounded-lg overflow-hidden bg-slate-100">
                        <img src={comp.photo_url} alt="Evidence" className="w-full h-auto object-cover" />
                      </div>
                    )}

                    {/* Resolution comments and actions */}
                    {comp.status === "RESOLVED" ? (
                      <div className="bg-emerald-50 border border-emerald-200/80 p-3 rounded-xl text-xs text-emerald-800 flex items-center justify-between">
                        <span>✅ 조치 내용: <strong>{comp.resolution_comment}</strong></span>
                        <span className="text-[10px] text-emerald-600 font-mono">완료됨</span>
                      </div>
                    ) : (
                      <div className="space-y-3 pt-2">
                        {/* [요청 9.2] 원클릭 상용 조치 템플릿 회신 */}
                        <div className="flex flex-wrap gap-2 text-[10px]">
                          {comp.category === "NOISE" && (
                            <button
                              onClick={() => handleResolveWithTemplate(comp.id, "현장에 즉시 방문하여 소음 유발 인원에 대해 경고 및 지도 조치를 완료했습니다.")}
                              className="px-2.5 py-1.5 bg-amber-50 hover:bg-amber-100 text-amber-700 border border-amber-250 rounded-lg transition-all cursor-pointer font-bold"
                            >
                              소음 경고 조치 템플릿 회신
                            </button>
                          )}
                          {comp.category === "DAMAGE" && (
                            <button
                              onClick={() => handleResolveWithTemplate(comp.id, "접수해 주신 파손 건은 학교 시설팀에 긴급 수리 접수 처리되었습니다. 이용에 불편을 드려 죄송합니다.")}
                              className="px-2.5 py-1.5 bg-red-50 hover:bg-red-100 text-red-700 border border-red-250 rounded-lg transition-all cursor-pointer font-bold"
                            >
                              시설 긴급 수리 회신
                            </button>
                          )}
                          <button
                            onClick={() => handleResolveWithTemplate(comp.id, "민원 현장을 즉각 확인하여 시정 조치를 완료하였습니다. 쾌적한 학습 환경을 위해 최선을 다하겠습니다.")}
                            className="px-2.5 py-1.5 bg-slate-50 hover:bg-slate-100 text-slate-700 border border-slate-200 rounded-lg transition-all cursor-pointer font-bold"
                          >
                            일반 조치 완료 회신
                          </button>
                        </div>

                        {/* Custom Reply form */}
                        <div className="flex gap-2">
                          <input
                            type="text"
                            placeholder="직접 조치 내용 입력..."
                            value={customComments[comp.id] || ""}
                            onChange={(e) => setCustomComments({...customComments, [comp.id]: e.target.value})}
                            className="flex-1 px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs outline-none focus:bg-white focus:border-emerald-500 font-semibold"
                          />
                          <button
                            onClick={() => {
                              const text = customComments[comp.id];
                              if (!text || !text.trim()) return;
                              onResolveComplaint(comp.id, text.trim());
                              setCustomComments({...customComments, [comp.id]: ""});
                            }}
                            className="px-4 py-2 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-1 shadow-sm"
                          >
                            <Send className="h-3 w-3" />
                            <span>완료</span>
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            ) : (
              <div className="py-10 text-center border border-dashed border-slate-200 rounded-xl bg-slate-50/50">
                <CheckCircle className="h-10 w-10 text-slate-350 mx-auto mb-2" />
                <p className="text-sm font-bold text-slate-500">대기 중인 불편 민원 신고가 없습니다.</p>
                <p className="text-xs text-slate-400 mt-1">학생들의 민원이 접수되면 피드에 실시간으로 출력됩니다.</p>
              </div>
            )}
          </div>

          {/* 2차 증빙 현장 대조 심사 (Absence Auditing) */}
          <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-xs space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h3 className="text-base font-extrabold text-slate-800 flex items-center gap-2">
                <AlertOctagon className="h-5 w-5 text-red-550 animate-pulse" />
                <span>장기 부재 2차 증빙 대조 심사 ({auditList.length}건)</span>
              </h3>
            </div>

            {auditList.length > 0 ? (
              <div className="space-y-6 divide-y divide-slate-100">
                {auditList.map(({ seat, report }) => {
                  if (!report) return null;
                  return (
                    <div key={seat.id} className="pt-6 first:pt-0 space-y-4 font-semibold text-slate-700">
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                        <div>
                          <span className="text-sm font-extrabold text-slate-800">
                            {seat.room_name} {seat.seat_number}번 좌석
                          </span>
                          <span className="ml-2 text-xs text-slate-500">
                            이용자: {seat.current_user_name}
                          </span>
                        </div>
                        <span className="text-[10px] text-slate-400 font-mono">
                          1차 신고: {new Date(report.first_reported_at).toLocaleTimeString("ko-KR")}
                        </span>
                      </div>

                      {/* Photo comparison */}
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <div className="space-y-1">
                          <span className="text-[10px] font-bold text-amber-600">1차 부재 신고 촬영</span>
                          <div className="aspect-video rounded-lg overflow-hidden border border-slate-200 bg-slate-100">
                            <img src={report.first_photo_url} alt="1st report" className="w-full h-full object-cover" />
                          </div>
                        </div>
                        <div className="space-y-1">
                          <span className="text-[10px] font-bold text-red-650">2차 최종 신고 촬영 (30분 후)</span>
                          <div className="aspect-video rounded-lg overflow-hidden border border-slate-200 bg-slate-100">
                            <img src={report.second_photo_url} alt="2nd report" className="w-full h-full object-cover" />
                          </div>
                        </div>
                      </div>

                      {/* Action buttons */}
                      <div className="flex flex-col sm:flex-row items-center gap-3 bg-slate-50 p-4 rounded-xl border border-slate-200 justify-between">
                        <div className="text-[10px] text-slate-500 text-center sm:text-left leading-normal font-semibold">
                          💡 현장에 사재기 방치 물품이 남겨져 있다면 <strong>[물품 수거 및 정리(10분 지연)]</strong>를, <br />
                          이미 깨끗이 비었거나 빈자리라면 <strong>[즉시 빈자리 전환]</strong>을 하십시오.
                        </div>
                        <div className="flex gap-2 w-full sm:w-auto">
                          <button
                            onClick={() => onDelayedRelease(seat.id)}
                            className="flex-1 sm:flex-none flex items-center justify-center gap-1 bg-purple-600 hover:bg-purple-500 text-white px-3 py-2 rounded-lg font-bold text-xs transition-all shadow-xs cursor-pointer"
                          >
                            <Clock className="h-3.5 w-3.5" />
                            <span>물품 정리 대기</span>
                          </button>
                          <button
                            onClick={() => onImmediateRelease(seat.id)}
                            className="flex-1 sm:flex-none flex items-center justify-center gap-1 bg-emerald-650 hover:bg-emerald-500 text-white px-3 py-2 rounded-lg font-bold text-xs transition-all shadow-xs cursor-pointer"
                          >
                            <CheckCircle className="h-3.5 w-3.5" />
                            <span>즉시 빈자리 전환</span>
                          </button>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="py-8 text-center text-slate-400 text-xs italic font-medium">
                검증 대기 중인 2차 부재 경고 좌석이 없습니다.
              </div>
            )}
          </div>
        </div>

        {/* Right Column: Configs & Penalty Control Tools */}
        <div className="space-y-6">
          
          {/* [요청 2.2] 학번 조회를 통한 대리 행정 기능 */}
          <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-xs space-y-4">
            <h3 className="text-sm font-extrabold text-slate-800 uppercase tracking-wider pb-2 border-b border-slate-100 flex items-center gap-1.5">
              <Search className="h-4.5 w-4.5 text-emerald-600" />
              <span>학번 조회 대리 행정 & 제재</span>
            </h3>

            <div className="flex gap-2">
              <input
                type="text"
                maxLength={8}
                placeholder="학번 입력 (예: 20222043)"
                value={searchStudentId}
                onChange={(e) => setSearchStudentId(e.target.value.replace(/[^0-9]/g, ""))}
                className="flex-1 px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs outline-none focus:bg-white focus:border-emerald-500 font-bold"
              />
              <button
                onClick={handleStudentSearch}
                disabled={searchLoading}
                className="px-3.5 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-bold transition-all flex items-center justify-center cursor-pointer shadow-sm active:scale-95"
              >
                {searchLoading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <span>조회</span>}
              </button>
            </div>

            {searchedStudent && (
              <div className="pt-3 border-t border-slate-100 space-y-4 font-semibold text-slate-700">
                {/* Profile Card */}
                <div className="p-3.5 bg-slate-50 border border-slate-200 rounded-xl text-xs space-y-1.5 font-bold">
                  <div className="flex justify-between items-center border-b border-slate-200 pb-1.5 mb-1.5">
                    <span className="text-slate-800 text-sm">{searchedStudent.name}</span>
                    <span className="text-slate-400 font-mono">{searchedStudent.university_id}</span>
                  </div>
                  
                  {searchedStudent.penalty_ends_at && new Date(searchedStudent.penalty_ends_at) > new Date() ? (
                    <div className="p-2 bg-red-50 border border-red-200 rounded-lg text-red-750 text-[10px]">
                      🚨 <strong>제재 중:</strong> {new Date(searchedStudent.penalty_ends_at).toLocaleString("ko-KR")}까지 로그인 차단<br />
                      사유: {searchedStudent.penalty_reason || "미지정"}
                    </div>
                  ) : (
                    <div className="text-[10px] text-emerald-650">🟢 현재 로그인 및 예약 활성화 상태 (정상 이용 유저)</div>
                  )}

                  {/* Active Reservation */}
                  {(() => {
                    const studentRes = seats.find(s => s.current_user_id === searchedStudent.id);
                    if (studentRes) {
                      return (
                        <div className="pt-1.5 mt-1.5 border-t border-slate-200/60 space-y-1 text-[11px] text-slate-600">
                          <p>📍 현재 이용: {studentRes.room_name} {studentRes.seat_number}번석</p>
                          <p>🕒 예약시간: {studentRes.reserved_at} ~ {studentRes.ends_at}</p>
                          <button
                            onClick={() => onProxyCheckout(studentRes.id, searchedStudent.id)}
                            className="w-full mt-2 py-1.5 bg-red-50 hover:bg-red-100 text-red-650 border border-red-200 rounded-lg text-[10px] font-bold cursor-pointer transition-all"
                          >
                            대리 반납 처리 (강제 강등)
                          </button>
                        </div>
                      );
                    } else {
                      return (
                        <div className="pt-2 mt-2 border-t border-slate-200/60 space-y-3 text-[11px]">
                          <p className="text-slate-400 font-normal">현재 활성화된 이용 좌석이 없습니다.</p>
                          <div className="space-y-2 bg-white p-3 rounded-lg border border-slate-200/80">
                            <h4 className="text-[10px] font-extrabold text-emerald-700 tracking-wider">대리 예약 신청 폼</h4>
                            
                            {/* Facility dropdown */}
                            <div className="space-y-1">
                              <label className="text-[9px] uppercase text-slate-400">대상 시설</label>
                              <select
                                value={proxyFacilityId}
                                onChange={(e) => {
                                  setProxyFacilityId(e.target.value);
                                  setProxySeatId(null);
                                }}
                                className="w-full px-2 py-1 bg-slate-50 border border-slate-200 rounded-md text-[10px] focus:bg-white outline-none cursor-pointer text-slate-700"
                              >
                                {facilities.filter(f => f.collegeId === adminUser.managed_college_id).map((fac) => (
                                  <option key={fac.id} value={fac.id}>{fac.roomName} ({fac.buildingName.split(" ")[0]})</option>
                                ))}
                              </select>
                            </div>

                            {/* Seat input */}
                            <div className="space-y-1">
                              <label className="text-[9px] uppercase text-slate-400">좌석 번호 선택</label>
                              <select
                                value={proxySeatId || ""}
                                onChange={(e) => setProxySeatId(Number(e.target.value))}
                                className="w-full px-2 py-1 bg-slate-50 border border-slate-200 rounded-md text-[10px] focus:bg-white outline-none cursor-pointer text-slate-700"
                              >
                                <option value="">좌석 선택...</option>
                                {(() => {
                                  const fac = facilities.find(f => f.id === proxyFacilityId);
                                  if (!fac) return null;
                                  // Find seats of this room
                                  const facSeats = seats.filter(s => s.room_name === fac.roomName);
                                  return facSeats.map(s => (
                                    <option key={s.id} value={s.id} disabled={s.status !== "AVAILABLE"}>
                                      {s.seat_number}번 {s.status !== "AVAILABLE" ? " (이용중)" : ""}
                                    </option>
                                  ));
                                })()}
                              </select>
                            </div>

                            {/* Duration */}
                            <div className="space-y-1">
                              <label className="text-[9px] uppercase text-slate-400">이용 기간</label>
                              <select
                                value={proxyDuration}
                                onChange={(e) => setProxyDuration(Number(e.target.value))}
                                className="w-full px-2 py-1 bg-slate-50 border border-slate-200 rounded-md text-[10px] focus:bg-white outline-none cursor-pointer text-slate-700"
                              >
                                <option value={60}>1시간 (60분)</option>
                                <option value={120}>2시간 (120분)</option>
                                <option value={180}>3시간 (180분)</option>
                                <option value={240}>4시간 (240분)</option>
                              </select>
                            </div>

                            <button
                              onClick={() => {
                                if (!proxySeatId) {
                                  alert("예약할 좌석 번호를 선택해 주세요.");
                                  return;
                                }
                                onProxyReserve(
                                  searchedStudent.id,
                                  searchedStudent.university_id,
                                  searchedStudent.name,
                                  proxyFacilityId,
                                  proxySeatId,
                                  proxyDuration
                                );
                                setSearchedStudent(null);
                                setProxySeatId(null);
                              }}
                              className="w-full py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg font-bold text-[10px] cursor-pointer shadow-sm text-center"
                            >
                              대리 예약 승인 실행
                            </button>
                          </div>
                        </div>
                      );
                    }
                  })()}
                </div>

                {/* [요청 2.4] 패널티 및 블랙리스트 유저 관리 */}
                <div className="space-y-2 bg-slate-50 p-4 border border-slate-200 rounded-xl">
                  <h4 className="text-[10px] font-extrabold text-red-650 tracking-wider">유저 패널티 / 블랙리스트 제재 </h4>
                  
                  <div className="space-y-1.5 text-xs">
                    <label className="text-[9px] uppercase text-slate-400 block">제재 사유</label>
                    <input
                      type="text"
                      placeholder="사유 기입 (예: 상습 부재 2회 누적)"
                      value={penaltyReason}
                      onChange={(e) => setPenaltyReason(e.target.value)}
                      className="w-full px-2 py-1.5 bg-white border border-slate-200 rounded-md outline-none focus:border-red-500 text-[11px]"
                    />
                  </div>

                  <div className="grid grid-cols-3 gap-1.5 pt-1">
                    <button
                      onClick={() => {
                        onApplyPenalty(searchedStudent.id, 3, penaltyReason);
                        setSearchedStudent(null);
                      }}
                      className="py-1.5 bg-red-600 hover:bg-red-500 text-white rounded-lg text-[9px] font-bold cursor-pointer transition-all active:scale-95"
                    >
                      3일 정지
                    </button>
                    <button
                      onClick={() => {
                        onApplyPenalty(searchedStudent.id, 7, penaltyReason);
                        setSearchedStudent(null);
                      }}
                      className="py-1.5 bg-red-750 hover:bg-red-650 text-white rounded-lg text-[9px] font-bold cursor-pointer transition-all active:scale-95"
                    >
                      7일 정지
                    </button>
                    <button
                      onClick={() => {
                        onApplyPenalty(searchedStudent.id, null, "");
                        setSearchedStudent(null);
                      }}
                      className="py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-650 border border-slate-200 rounded-lg text-[9px] font-bold cursor-pointer transition-all active:scale-95"
                    >
                      제재 해제
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* [요청 2.3] 시설별 운영 시간 및 최대 이용 시간 제어 설정 */}
          <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-xs space-y-4">
            <h3 className="text-sm font-extrabold text-slate-800 uppercase tracking-wider pb-2 border-b border-slate-100 flex items-center gap-1.5">
              <Sliders className="h-4.5 w-4.5 text-emerald-600" />
              <span>열람실 운영 제어 설정</span>
            </h3>

            {/* Room selector */}
            <div className="space-y-1">
              <label className="text-[10px] uppercase font-bold text-slate-500 tracking-wider">대상 시설 구역</label>
              <select
                value={selectedConfigRoom}
                onChange={(e) => handleLoadConfig(e.target.value)}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:bg-white outline-none cursor-pointer font-bold text-slate-700"
              >
                <option value="제1열람실">창파도서관 제1열람실</option>
                <option value="2층 열람실">창파도서관 2층 열람실</option>
                <option value="5층 열람실">창파도서관 5층 열람실</option>
              </select>
            </div>

            {/* Config inputs */}
            <div className="space-y-3 pt-2">
              <div className="grid grid-cols-2 gap-2 text-xs font-bold text-slate-700">
                <div className="space-y-1">
                  <label className="text-[9px] uppercase text-slate-400">오픈 시작 시간</label>
                  <input
                    type="time"
                    value={configOpenTime}
                    onChange={(e) => setConfigOpenTime(e.target.value)}
                    className="w-full px-2 py-1.5 bg-slate-50 border border-slate-200 rounded-lg outline-none cursor-pointer"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-[9px] uppercase text-slate-400">운영 마감 시간</label>
                  <input
                    type="time"
                    value={configCloseTime}
                    onChange={(e) => setConfigCloseTime(e.target.value)}
                    className="w-full px-2 py-1.5 bg-slate-50 border border-slate-200 rounded-lg outline-none cursor-pointer"
                  />
                </div>
              </div>

              {/* Max limit config */}
              <div className="space-y-2 p-3 bg-slate-50 border border-slate-200 rounded-xl">
                <div className="flex items-center justify-between font-bold text-xs text-slate-700">
                  <span>최대 이용 시간 제한 여부</span>
                  <button
                    type="button"
                    onClick={() => setHasMaxLimit(!hasMaxLimit)}
                    className="cursor-pointer"
                  >
                    {hasMaxLimit ? (
                      <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 border border-emerald-200">제한 활성화</span>
                    ) : (
                      <span className="text-[10px] px-2 py-0.5 rounded-full bg-slate-200 text-slate-600 border border-slate-300">무제한 허용</span>
                    )}
                  </button>
                </div>

                {hasMaxLimit && (
                  <div className="space-y-1.5 pt-1.5 border-t border-slate-200/60">
                    <div className="flex justify-between text-[10px] text-slate-500 font-bold">
                      <span>최대 이용 시간 설정:</span>
                      <span className="text-emerald-700">{configMaxHours}시간 제한</span>
                    </div>
                    <input
                      type="range"
                      min={1}
                      max={12}
                      value={configMaxHours}
                      onChange={(e) => setConfigMaxHours(Number(e.target.value))}
                      className="w-full h-1 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-emerald-600"
                    />
                  </div>
                )}
              </div>

              <button
                onClick={handleSaveConfig}
                className="w-full py-2 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs font-bold transition-all cursor-pointer shadow-sm text-center"
              >
                시설 운영 정책 변경 사항 저장
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
