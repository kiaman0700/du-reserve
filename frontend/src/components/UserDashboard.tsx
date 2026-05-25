"use client";

import React, { useState, useEffect } from "react";
import { Seat, Profile, AbsenceReport } from "@/app/page";
import { 
  User, 
  MapPin, 
  AlertTriangle, 
  Clock, 
  LogOut, 
  CheckCircle, 
  Camera, 
  Lock, 
  HelpCircle,
  Activity,
  VolumeX,
  Wrench,
  Megaphone,
  Bell,
  ToggleLeft,
  ToggleRight,
  ChevronRight,
  Loader2,
  Trash2,
  FileText
} from "lucide-react";
import CameraCapture from "./CameraCapture";

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
  open_time: string;
  close_time: string;
  max_use_hours: number | null;
}

interface Complaint {
  id: number;
  seat_id: number | null;
  room_name: string;
  category: "NOISE" | "DAMAGE" | "CLEANLINESS" | "ABSENCE" | "OTHER";
  description: string;
  photo_url?: string;
  status: "PENDING" | "PROCESSING" | "RESOLVED";
  resolution_comment?: string;
  created_at: string;
}

interface UserDashboardProps {
  user: Profile;
  selectedSeat: Seat | null;
  userReservation: Seat | null;
  absenceReports: AbsenceReport[];
  facilityConfig: FacilityConfig | null;
  myComplaints: Complaint[];
  cooldownTimeLeft: number; // Cooldown timer in seconds
  notificationSubscribed: boolean;
  onReserve: (seatId: number, durationMinutes: number | null) => void;
  onCheckout: () => void;
  onConfirmReturn: () => void; // Reset warning
  onReportAbsence1st: (seatId: number, photo: string) => void;
  onReportAbsence2nd: (seatId: number, photo: string) => void;
  onExtendSeat: (seatId: number, extendMinutes: number) => void;
  onSetEarlyCheckout: (seatId: number, minutesFromNow: number) => void;
  onCancelEarlyCheckout: (seatId: number) => void;
  onSubmitComplaint: (category: string, description: string, photo: string | null) => Promise<boolean>;
  onSubmitVindication: (complaintId: number, type: string, comment: string) => void;
  onSubscribeNotification: () => void;
  timerSpeedUp: boolean;
  setTimerSpeedUp: (val: boolean) => void;
  selectedFacility: Facility | null;
  allSeats: Seat[];
}

export default function UserDashboard({
  user,
  selectedSeat,
  userReservation,
  absenceReports,
  facilityConfig,
  myComplaints,
  cooldownTimeLeft,
  notificationSubscribed,
  onReserve,
  onCheckout,
  onConfirmReturn,
  onReportAbsence1st,
  onReportAbsence2nd,
  onExtendSeat,
  onSetEarlyCheckout,
  onCancelEarlyCheckout,
  onSubmitComplaint,
  onSubmitVindication,
  onSubscribeNotification,
  timerSpeedUp,
  setTimerSpeedUp,
  selectedFacility,
  allSeats
}: UserDashboardProps) {
  // UI Panels / Modals States
  const [showCamera, setShowCamera] = useState<boolean>(false);
  const [cameraPurpose, setCameraPurpose] = useState<"1ST" | "2ND" | "COMPLAINT" | "SELFIE">("1ST");
  const [reportingSeatId, setReportingSeatId] = useState<number | null>(null);

  // Form selections
  const [selectedDuration, setSelectedDuration] = useState<number>(180); // Default 3 hours
  const [isUnspecifiedTime, setIsUnspecifiedTime] = useState<boolean>(false);
  const [selectedExtension, setSelectedExtension] = useState<number>(60); // Extension default 1 hour
  const [earlyCheckoutMinutes, setEarlyCheckoutMinutes] = useState<number>(30); // 30 mins later
  
  // Complaint modal
  const [showComplaintModal, setShowComplaintModal] = useState<boolean>(false);
  const [complaintCategory, setComplaintCategory] = useState<"NOISE" | "DAMAGE" | "CLEANLINESS" | "OTHER">("NOISE");
  const [complaintDescription, setComplaintDescription] = useState<string>("");
  const [complaintPhoto, setComplaintPhoto] = useState<string | null>(null);
  const [isSubmittingComplaint, setIsSubmittingComplaint] = useState<boolean>(false);

  // Vindication modal
  const [showVindicateModal, setShowVindicateModal] = useState<boolean>(false);
  const [vindicateComplaintId, setVindicateComplaintId] = useState<number | null>(null);
  const [vindicateType, setVindicateType] = useState<string>("오해였습니다");
  const [vindicateComment, setVindicateComment] = useState<string>("");

  const formatSecondsToTime = (totalSeconds?: number) => {
    if (totalSeconds === undefined) return "정보 없음";
    if (totalSeconds <= 0) return "만료됨";
    
    const hours = Math.floor(totalSeconds / 3600);
    const minutes = Math.floor((totalSeconds % 3600) / 60);
    const seconds = totalSeconds % 60;
    
    if (hours > 0) {
      return `${hours}시간 ${minutes}분 ${seconds}초`;
    }
    return `${minutes}분 ${seconds}초`;
  };

  const formatTime = (timeStr: string) => {
    // format HH:MM:SS to HH:MM
    if (!timeStr) return "";
    const parts = timeStr.split(":");
    if (parts.length >= 2) return `${parts[0]}:${parts[1]}`;
    return timeStr;
  };

  // Find active report for the selected seat
  const activeReport = selectedSeat 
    ? absenceReports.find(r => r.seat_id === selectedSeat.id && r.seat_id !== userReservation?.id)
    : null;

  // Active warning on my own seat
  const myAbsenceWarning = userReservation
    ? absenceReports.find(r => r.seat_id === userReservation.id && r.status === "PENDING")
    : null;

  // Check if facility is fully occupied
  const totalFacilitySeats = allSeats.length;
  const occupiedFacilitySeats = allSeats.filter(s => s.status !== "AVAILABLE").length;
  const isFullyOccupied = totalFacilitySeats > 0 && totalFacilitySeats === occupiedFacilitySeats;

  // Open camera handler
  const handleOpenReportCamera = (purpose: "1ST" | "2ND" | "COMPLAINT" | "SELFIE", seatId: number) => {
    setCameraPurpose(purpose);
    setReportingSeatId(seatId);
    setShowCamera(true);
  };

  // Capture callback
  const handleCapturePhoto = (photoUrl: string) => {
    if (cameraPurpose === "1ST" && reportingSeatId !== null) {
      onReportAbsence1st(reportingSeatId, photoUrl);
    } else if (cameraPurpose === "2ND" && reportingSeatId !== null) {
      onReportAbsence2nd(reportingSeatId, photoUrl);
    } else if (cameraPurpose === "COMPLAINT") {
      setComplaintPhoto(photoUrl);
    } else if (cameraPurpose === "SELFIE") {
      // Self-vindication snapshot uploads selfie and auto resolves
      onConfirmReturn(); 
    }
    setShowCamera(false);
    setReportingSeatId(null);
  };

  // Submit convenience complaint
  const handleComplaintSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!complaintDescription.trim()) {
      alert("상세 내용을 작성해 주세요.");
      return;
    }
    setIsSubmittingComplaint(true);
    const success = await onSubmitComplaint(complaintCategory, complaintDescription, complaintPhoto);
    setIsSubmittingComplaint(false);
    if (success) {
      setComplaintDescription("");
      setComplaintPhoto(null);
      setShowComplaintModal(false);
      alert("민원 신고가 정상 접수되었습니다. 관리자가 신속하게 조치 중입니다.");
    }
  };

  // Submit vindication
  const handleVindicateSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (vindicateComplaintId === null) return;
    if (!vindicateComment.trim()) {
      alert("소명 사유를 작성해 주세요.");
      return;
    }
    onSubmitVindication(vindicateComplaintId, vindicateType, vindicateComment);
    setVindicateComment("");
    setShowVindicateModal(false);
    alert("소명서가 정상적으로 제출되었습니다. 관리자가 확인 후 패널티가 경감됩니다.");
  };

  return (
    <div className="space-y-6">
      
      {/* ⚠️ 스마트 셀프 소명 (1차 부재 경고 감지 배너) */}
      {userReservation && userReservation.status === "REPORTED_1ST" && myAbsenceWarning && (
        <div className="rounded-2xl border-2 border-red-500 bg-red-50 p-6 shadow-xl animate-pulse-slow">
          <div className="flex flex-col md:flex-row items-center justify-between gap-4">
            <div className="flex items-center space-x-4">
              <div className="rounded-full bg-red-100 p-3 text-red-650 border border-red-200">
                <AlertTriangle className="h-6 w-6 text-red-600" />
              </div>
              <div className="space-y-1">
                <h3 className="text-base font-extrabold text-red-900 flex items-center gap-1.5">
                  <span>[⚠️ 부재 신고 감지! 10분 내로 소명하세요]</span>
                </h3>
                <p className="text-xs text-red-800 font-medium">
                  현재 자리에 물건만 있고 비어 있다는 부재 신고가 접수되었습니다. 아래의 소명 버튼을 눌러 카메라로 본인 인증(셀카 촬영)을 하거나 복귀 확인을 진행하세요.
                </p>
                <div className="text-xs text-red-950 font-bold font-mono">
                  복귀 유예 남은 시간: {formatSecondsToTime(myAbsenceWarning.warning_timer_seconds)}
                </div>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={() => handleOpenReportCamera("SELFIE", userReservation.id)}
                className="bg-red-600 hover:bg-red-700 text-white px-5 py-2.5 rounded-xl text-xs font-bold shadow-lg shadow-red-900/20 transition-all flex items-center gap-1.5 cursor-pointer"
              >
                <Camera className="h-4 w-4" />
                <span>소명하기 (셀카 촬영)</span>
              </button>
              <button
                onClick={onConfirmReturn}
                className="bg-white hover:bg-slate-100 text-red-650 px-4 py-2.5 rounded-xl text-xs font-bold border border-red-200 transition-all cursor-pointer"
              >
                자리 복귀 완료
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 🚀 [요청 8] 마이 메인 퀵 액션 배너 (좌석 고정 및 빠른 조작) */}
      {userReservation && (
        <div className="rounded-3xl bg-gradient-to-r from-emerald-700 via-emerald-800 to-emerald-950 p-6 text-white shadow-xl shadow-emerald-900/10 relative overflow-hidden animate-fade-in">
          <div className="absolute right-0 top-0 translate-x-[20%] -translate-y-[20%] w-[180px] h-[180px] rounded-full bg-emerald-500/10 blur-xl pointer-events-none" />
          <div className="relative z-10 flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
            <div className="space-y-2">
              <span className="px-2 py-0.5 text-[9px] font-extrabold uppercase tracking-widest bg-emerald-600/40 border border-emerald-500/30 rounded-md inline-block text-emerald-300">
                My Active Seat
              </span>
              <h3 className="text-lg font-black tracking-tight text-white flex items-center gap-2 leading-none">
                <MapPin className="h-5 w-5 text-emerald-300" />
                <span>{selectedFacility ? `${selectedFacility.buildingName} ${selectedFacility.name}` : userReservation.room_name}</span>
                <span className="text-amber-300 font-mono font-bold text-xl">{userReservation.seat_number}번석</span>
              </h3>
              <p className="text-xs text-emerald-200 leading-normal flex items-center gap-1.5 font-medium">
                <Clock className="h-3.5 w-3.5 text-emerald-400" />
                <span>남은 이용 시간:</span>
                {userReservation.use_timer_seconds !== undefined ? (
                  <strong className="font-mono text-sm text-white bg-emerald-900/50 px-2 py-0.5 rounded border border-emerald-700">
                    {formatSecondsToTime(userReservation.use_timer_seconds)}
                  </strong>
                ) : (
                  <strong className="text-white">마감 시까지 (무제한)</strong>
                )}
              </p>
            </div>

            {/* Quick Actions Buttons */}
            <div className="flex flex-wrap items-center gap-3 w-full md:w-auto border-t border-emerald-700/50 pt-4 md:pt-0 md:border-0">
              {/* 즉시 반납 */}
              <button
                onClick={onCheckout}
                className="flex-1 md:flex-none flex items-center justify-center gap-1.5 px-4 py-2.5 rounded-xl bg-red-500/10 hover:bg-red-500/20 text-red-200 border border-red-500/30 font-bold text-xs transition-all cursor-pointer hover:scale-[1.01]"
              >
                <LogOut className="h-4 w-4" />
                <span>즉시 반납</span>
              </button>

              {/* 연장 선택 */}
              <div className="flex items-center gap-1.5 bg-emerald-900/40 border border-emerald-700/60 p-1.5 rounded-xl flex-1 md:flex-none">
                <select
                  value={selectedExtension}
                  onChange={(e) => setSelectedExtension(Number(e.target.value))}
                  className="bg-transparent border-0 text-white font-bold text-xs focus:outline-none cursor-pointer pr-4"
                >
                  <option value={30} className="text-slate-800">30분 연장</option>
                  <option value={60} className="text-slate-800">1시간 연장</option>
                  <option value={120} className="text-slate-800">2시간 연장</option>
                  <option value={180} className="text-slate-800">3시간 연장</option>
                </select>
                <button
                  onClick={() => onExtendSeat(userReservation.id, selectedExtension)}
                  className="bg-emerald-600 hover:bg-emerald-500 text-white px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer hover:scale-95"
                >
                  연장
                </button>
              </div>

              {/* 조기 퇴실 예정 시간 설정 (나갈 시간 미리 예약) */}
              <div className="flex items-center gap-1.5 bg-emerald-900/40 border border-emerald-700/60 p-1.5 rounded-xl flex-1 md:flex-none">
                <select
                  value={earlyCheckoutMinutes}
                  onChange={(e) => setEarlyCheckoutMinutes(Number(e.target.value))}
                  className="bg-transparent border-0 text-white font-bold text-xs focus:outline-none cursor-pointer pr-4"
                >
                  <option value={10} className="text-slate-800">10분 뒤 퇴실 예고</option>
                  <option value={20} className="text-slate-800">20분 뒤 퇴실 예고</option>
                  <option value={30} className="text-slate-800">30분 뒤 퇴실 예고</option>
                  <option value={60} className="text-slate-800">1시간 뒤 퇴실 예고</option>
                </select>
                <button
                  onClick={() => onSetEarlyCheckout(userReservation.id, earlyCheckoutMinutes)}
                  className="bg-amber-600 hover:bg-amber-500 text-white px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer hover:scale-95"
                >
                  설정
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 10분 전 만료 임박 알림 팝업/배너 */}
      {userReservation && userReservation.use_timer_seconds !== undefined && userReservation.use_timer_seconds > 0 && userReservation.use_timer_seconds <= 600 && (
        <div className="rounded-2xl bg-amber-50 border border-amber-300 p-5 shadow-lg flex flex-col md:flex-row items-start md:items-center justify-between gap-4 animate-bounce-short">
          <div className="flex items-center space-x-3.5">
            <div className="p-2.5 bg-amber-100 rounded-xl text-amber-600 border border-amber-250">
              <Clock className="h-6 w-6 animate-pulse" />
            </div>
            <div className="space-y-1">
              <h4 className="text-sm font-bold text-slate-900">⚠️ 좌석 이용 시간 만료 임박 안내</h4>
              <p className="text-xs text-slate-655 font-semibold">
                곧 이용 시간이 만료되어 빈 자리로 변경될 예정입니다. 이용 시간을 연장하시겠습니까, 아니면 퇴실 예약을 취소하시겠습니까?
              </p>
              <div className="text-xs text-amber-700 font-bold">
                남은 시간: {formatSecondsToTime(userReservation.use_timer_seconds)}
              </div>
            </div>
          </div>
          <div className="flex items-center gap-2.5 w-full md:w-auto">
            <button
              onClick={() => onExtendSeat(userReservation.id, 60)}
              className="flex-1 md:flex-none bg-emerald-600 hover:bg-emerald-500 text-white px-4 py-2 rounded-xl text-xs font-bold shadow-md cursor-pointer transition-all"
            >
              시간 연장 (1시간)
            </button>
            <button
              onClick={() => onCancelEarlyCheckout(userReservation.id)}
              className="flex-1 md:flex-none bg-white hover:bg-slate-100 text-slate-700 border border-slate-200 px-4 py-2 rounded-xl text-xs font-bold cursor-pointer transition-all"
            >
              퇴실 취소 (기존 상태 유지)
            </button>
            <button
              onClick={onCheckout}
              className="flex-1 md:flex-none bg-red-655 hover:bg-red-500 text-white px-4 py-2 rounded-xl text-xs font-bold cursor-pointer transition-all"
            >
              즉시 퇴실
            </button>
          </div>
        </div>
      )}

      {/* User Information Profile Panel */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 rounded-2xl bg-white border border-slate-200 p-6 shadow-xs">
        <div className="flex items-center space-x-4">
          <div className="rounded-full bg-emerald-50 p-3 text-emerald-600 border border-emerald-100 shadow-3xs">
            <User className="h-6 w-6" />
          </div>
          <div>
            <div className="flex items-center space-x-2">
              <h2 className="text-lg font-extrabold text-slate-800">{user.name}</h2>
              <span className="rounded bg-emerald-50 border border-emerald-150 px-2 py-0.5 text-xs text-emerald-700 font-mono font-bold">
                {user.role === "ADMIN" ? "운영 사서관" : "학부생"}
              </span>
            </div>
            <p className="text-xs text-slate-500 font-semibold mt-0.5">학번/ID: {user.university_id}</p>
          </div>
        </div>

        {/* Dynamic Buttons for Subscribing or Petitions */}
        <div className="flex flex-wrap items-center gap-3">
          {/* 빈자리 알림 신청 [요청 5] */}
          {isFullyOccupied && selectedFacility && (
            <button
              onClick={onSubscribeNotification}
              disabled={notificationSubscribed}
              className={`px-4 py-2 rounded-xl text-xs font-bold border transition-all flex items-center gap-1.5 cursor-pointer ${
                notificationSubscribed 
                  ? "bg-slate-100 border-slate-200 text-slate-400 cursor-not-allowed"
                  : "bg-emerald-50 hover:bg-emerald-100 text-emerald-700 border-emerald-200 hover:scale-[1.01] active:scale-[0.98]"
              }`}
            >
              <Bell className={`h-4 w-4 ${notificationSubscribed ? "" : "animate-bounce"}`} />
              <span>{notificationSubscribed ? "빈자리 알림 신청 완료" : "빈자리 알림 받기 신청"}</span>
            </button>
          )}

          {/* 통합 좌석 민원 신청 버튼 */}
          <button
            onClick={() => setShowComplaintModal(true)}
            className="px-4 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold transition-all hover:scale-[1.01] flex items-center gap-1.5 cursor-pointer shadow-md shadow-slate-900/10"
          >
            <Megaphone className="h-4 w-4" />
            <span>이용 불편 민원 신청</span>
          </button>
        </div>
      </div>

      {/* Main Grid: Control / Seat Panel */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 bg-white border border-slate-200 rounded-2xl p-6 shadow-xs flex flex-col justify-between">
          <div>
            <h3 className="text-base font-extrabold text-slate-850 mb-4 flex items-center justify-between border-b border-slate-100 pb-2">
              <span>{selectedFacility ? `${selectedFacility.name} 실시간 현황` : "열람실 실시간 현황"}</span>
              <span className="flex items-center gap-1.5 text-[11px] text-emerald-600 font-extrabold">
                <span className="h-2 w-2 rounded-full bg-emerald-500 animate-ping"></span> 실시간 웹소켓 연동 중
              </span>
            </h3>
            
            {/* Facility Operating Info */}
            {facilityConfig && (
              <div className="mb-4 p-3.5 bg-slate-50 border border-slate-200 rounded-xl text-xs space-y-1 font-semibold text-slate-655 flex justify-between items-center">
                <span>🕒 당일 운영 시간: <strong className="text-slate-800">{formatTime(facilityConfig.open_time)} ~ {formatTime(facilityConfig.close_time)}</strong></span>
                <span>⏱️ 최대 이용 가능: <strong className="text-slate-800">{facilityConfig.max_use_hours ? `${facilityConfig.max_use_hours}시간` : "제한 없음(무제한)"}</strong></span>
              </div>
            )}

            {/* Legend */}
            <div className="flex flex-wrap gap-4 mb-6 text-xs text-slate-600 bg-slate-50 p-3 rounded-xl border border-slate-150">
              <div className="flex items-center gap-1.5 font-semibold">
                <span className="h-3.5 w-3.5 rounded border border-emerald-500/30 bg-emerald-50"></span>
                <span>빈자리</span>
              </div>
              <div className="flex items-center gap-1.5 font-semibold">
                <span className="h-3.5 w-3.5 rounded border border-slate-300 bg-slate-100"></span>
                <span>이용 중</span>
              </div>
              <div className="flex items-center gap-1.5 font-semibold">
                <span className="h-3.5 w-3.5 rounded border border-amber-400 bg-amber-50 animate-pulse"></span>
                <span>1차 경고</span>
              </div>
              <div className="flex items-center gap-1.5 font-semibold">
                <span className="h-3.5 w-3.5 rounded border border-red-400 bg-red-50 animate-pulse"></span>
                <span>2차 신고</span>
              </div>
              <div className="flex items-center gap-1.5 font-semibold">
                <span className="h-3.5 w-3.5 rounded border border-purple-400 bg-purple-50 animate-pulse"></span>
                <span>정리 중</span>
              </div>
            </div>

            <div className="border border-slate-200 rounded-xl p-4 bg-slate-50/50">
              <p className="text-xs text-emerald-700 font-bold mb-2 flex items-center gap-1">
                <Activity className="h-3.5 w-3.5" />
                <span>좌석 도면 배치 (클릭하여 조작 가능)</span>
              </p>
              <div className="text-slate-500 text-xs font-semibold">
                예약하고 싶은 빈자리를 누르거나, 자리에 없는 사용자를 신고하기 위해 이용 중인 자리를 선택하세요.
              </div>
            </div>
          </div>

          {/* Cooldown Timer Block */}
          {cooldownTimeLeft > 0 && (
            <div className="mt-4 p-3 bg-red-50 border border-red-200 text-xs font-bold text-red-700 rounded-xl flex items-center gap-2">
              <AlertTriangle className="h-4 w-4 text-red-500 animate-spin-slow" />
              <span>민원 중복 접수 방지 대기 중입니다. 재신청 가능 시간: <strong>{Math.floor(cooldownTimeLeft / 60)}분 {cooldownTimeLeft % 60}초</strong></span>
            </div>
          )}
        </div>

        {/* Action Panel Sidebar */}
        <div className="bg-white border border-slate-200 rounded-2xl p-6 flex flex-col justify-between shadow-xs">
          <div>
            <h3 className="text-base font-extrabold text-slate-850 mb-4 pb-2 border-b border-slate-200">
              좌석 상세 및 액션
            </h3>

            {selectedSeat ? (
              <div className="space-y-6">
                {/* Seat Info Card */}
                <div className="space-y-3 bg-slate-50 p-4 rounded-xl border border-slate-200">
                  <div className="flex justify-between items-center">
                    <span className="text-xs text-slate-500 font-mono">
                      {selectedFacility ? `${selectedFacility.buildingName} ${selectedFacility.name}` : "제1열람실"}
                    </span>
                    <span className="text-sm font-black text-slate-850">{selectedSeat.seat_number}번 좌석</span>
                  </div>

                  <div className="flex items-center justify-between text-xs py-1 border-t border-b border-slate-200/60 font-semibold">
                    <span className="text-slate-500">현재 상태</span>
                    <span className={`font-bold ${
                      selectedSeat.status === "AVAILABLE" ? "text-emerald-600" :
                      selectedSeat.status === "OCCUPIED" ? "text-slate-650" :
                      selectedSeat.status === "REPORTED_1ST" ? "text-amber-600" :
                      selectedSeat.status === "REPORTED_2ND" ? "text-red-650" :
                      "text-purple-650"
                    }`}>
                      {selectedSeat.status === "AVAILABLE" && "예약 가능"}
                      {selectedSeat.status === "OCCUPIED" && "이용 중"}
                      {selectedSeat.status === "REPORTED_1ST" && "1차 경고"}
                      {selectedSeat.status === "REPORTED_2ND" && "2차 신고 완료"}
                      {selectedSeat.status === "CLEARING" && "자리 정리 중"}
                    </span>
                  </div>

                  {selectedSeat.status !== "AVAILABLE" && (
                    <div className="text-[11px] text-slate-500 space-y-2 font-semibold">
                      <div className="flex justify-between">
                        <span>이용자:</span>
                        <span className="font-bold text-slate-700">
                          {selectedSeat.current_user_id === user.id ? `${user.name} (나)` : selectedSeat.current_user_name || "학부생"}
                        </span>
                      </div>
                      {selectedSeat.current_user_id !== user.id && (
                        <div className="flex justify-between">
                          <span>학번 정보:</span>
                          <span className="font-mono text-slate-400">2022****</span>
                        </div>
                      )}
                      
                      {selectedSeat.reserved_at && selectedSeat.ends_at && (
                        <div className="pt-2 border-t border-slate-200/60 space-y-1 bg-white/40 p-2 rounded-lg border border-slate-100">
                          <div className="flex justify-between">
                            <span className="text-slate-400">설정이용 시간:</span>
                            <span className="text-slate-700">{selectedSeat.total_duration_minutes ? `${selectedSeat.total_duration_minutes}분 설정` : "미지정"}</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-slate-400">예약 시간:</span>
                            <span className="text-slate-700">{selectedSeat.reserved_at} ~ {selectedSeat.ends_at}</span>
                          </div>
                          {selectedSeat.use_timer_seconds !== undefined && (
                            <div className="flex justify-between items-center font-bold text-emerald-655 mt-1">
                              <span>남은 이용 시간:</span>
                              <span className="font-mono text-[12px]">{formatSecondsToTime(selectedSeat.use_timer_seconds)}</span>
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  )}
                </div>

                {/* Actions based on seat status */}
                <div className="space-y-3">
                  {/* Option 1: Reserve the seat */}
                  {selectedSeat.status === "AVAILABLE" && (
                    <div className="space-y-3">
                      {!userReservation && (
                        <div className="space-y-2 p-3.5 bg-slate-50 border border-slate-200 rounded-xl">
                          {/* [요청 4] 이용 시간 설정 및 관리자 정책별 제어 */}
                          {facilityConfig && facilityConfig.max_use_hours === null ? (
                            <div className="flex items-center justify-between border-b border-slate-200 pb-2 mb-2 font-bold">
                              <span className="text-[10px] uppercase text-slate-500 tracking-wider">이용 시간 미지정 예약</span>
                              <button
                                type="button"
                                onClick={() => setIsUnspecifiedTime(!isUnspecifiedTime)}
                                className="cursor-pointer text-emerald-650 hover:text-emerald-700 focus:outline-none"
                              >
                                {isUnspecifiedTime ? <ToggleRight className="h-7 w-7 text-emerald-600" /> : <ToggleLeft className="h-7 w-7 text-slate-400" />}
                              </button>
                            </div>
                          ) : null}

                          {!isUnspecifiedTime && (
                            <>
                              <label className="text-[10px] uppercase font-bold text-slate-500 tracking-wider block">
                                ⏱️ 좌석 이용 설정 시간
                              </label>
                              <select
                                value={selectedDuration}
                                onChange={(e) => setSelectedDuration(Number(e.target.value))}
                                className="w-full px-3 py-2 bg-white border border-slate-200 rounded-lg text-xs font-bold text-slate-700 focus:outline-none focus:border-emerald-500 cursor-pointer"
                              >
                                {Array.from(
                                  { length: facilityConfig && facilityConfig.max_use_hours ? facilityConfig.max_use_hours * 6 : 18 }, 
                                  (_, i) => (i + 1) * 10
                                ).map((min) => {
                                  const hr = Math.floor(min / 60);
                                  const mn = min % 60;
                                  const label = hr > 0 ? `${hr}시간 ${mn > 0 ? `${mn}분` : ""}` : `${mn}분`;
                                  return (
                                    <option key={min} value={min}>
                                      {label} 이용
                                    </option>
                                  );
                                })}
                              </select>
                            </>
                          )}
                          <p className="text-[9px] text-slate-400 leading-normal mt-1 font-semibold">
                            {isUnspecifiedTime 
                              ? "* 미지정 선택 시 당일 운영 마감 시간까지 시간 제한 없이 자율 이용할 수 있습니다."
                              : "* 설정한 이용 시간(타이머)이 흐르며, 남은 시간이 10분 미만일 때 다시 연장할 수 있습니다."}
                          </p>
                        </div>
                      )}
                      <button
                        disabled={!!userReservation}
                        onClick={() => onReserve(selectedSeat.id, isUnspecifiedTime ? null : selectedDuration)}
                        className={`w-full py-3 rounded-xl font-bold text-sm transition-all flex items-center justify-center gap-2 cursor-pointer ${
                          userReservation 
                            ? "bg-slate-100 text-slate-400 border border-slate-200 cursor-not-allowed font-bold"
                            : "bg-emerald-600 hover:bg-emerald-500 text-white shadow-md shadow-emerald-700/10 hover:scale-[1.01] active:scale-[0.99]"
                        }`}
                      >
                        <span>{userReservation ? "이미 예약된 좌석이 있습니다" : "이 좌석 예약하기"}</span>
                      </button>
                    </div>
                  )}

                  {/* Option 2: Reported by user or report actions */}
                  {selectedSeat.status === "OCCUPIED" && selectedSeat.current_user_id !== user.id && (
                    <div className="space-y-3">
                      <p className="text-[11px] text-amber-600 flex items-start gap-1 font-semibold leading-relaxed bg-amber-50/50 p-2.5 rounded-lg border border-amber-100">
                        <AlertTriangle className="h-4 w-4 flex-shrink-0 text-amber-500" />
                        <span>좌석에 소지품만 남겨두고 장시간 자리를 비웠다면 증거 사진을 촬영해 신고할 수 있습니다.</span>
                      </p>
                      
                      <div className="flex gap-2">
                        {/* 1차 부재 신고 */}
                        <button
                          onClick={() => handleOpenReportCamera("1ST", selectedSeat.id)}
                          className="flex-1 py-2.5 rounded-xl bg-amber-50 hover:bg-amber-100 hover:text-amber-800 text-amber-700 font-bold border border-amber-200 text-xs transition-all flex items-center justify-center gap-1.5 cursor-pointer shadow-xs"
                        >
                          <Camera className="h-4 w-4" />
                          <span>부재중 1차 신고</span>
                        </button>
                      </div>
                    </div>
                  )}

                  {/* Option 3: Reported 1st - waiting for timer or 2nd report */}
                  {selectedSeat.status === "REPORTED_1ST" && selectedSeat.current_user_id !== user.id && activeReport && (
                    <div className="space-y-3 bg-amber-50/30 p-4 rounded-xl border border-amber-200 shadow-xs">
                      <div className="flex items-center justify-between text-xs text-amber-700 font-bold">
                        <span className="flex items-center gap-1">
                          <Clock className="h-3.5 w-3.5 text-amber-500" /> 1차 신고 대기 타이머:
                        </span>
                        <span className="font-mono text-sm">
                          {activeReport.warning_timer_seconds !== undefined && activeReport.warning_timer_seconds > 0 ? (
                            `${Math.floor(activeReport.warning_timer_seconds / 60)}분 ${activeReport.warning_timer_seconds % 60}초`
                          ) : (
                            "시간 경과 - 2차 신고 가능"
                          )}
                        </span>
                      </div>

                      {activeReport.warning_timer_seconds !== undefined && activeReport.warning_timer_seconds > 0 ? (
                        <div className="text-[11px] text-slate-500 space-y-2 font-semibold">
                          <p>⚠️ 원예약자가 자리로 복귀할 때까지 대기 타이머가 동작합니다. 타이머가 끝난 뒤에도 복귀하지 않으면 2차 최종 신고를 접수할 수 있습니다.</p>
                          <div className="w-full bg-slate-200 rounded-full h-1 overflow-hidden">
                            <div 
                              className="bg-amber-500 h-full rounded-full transition-all duration-1000"
                              style={{ width: `${(activeReport.warning_timer_seconds / 1800) * 100}%` }}
                            />
                          </div>
                        </div>
                      ) : (
                        <div className="space-y-2">
                          <p className="text-[11px] text-red-500 font-bold">
                            원예약자가 30분 이내에 복귀 확인을 하지 않았습니다. 2차 최종 촬영을 통해 관리자 대시보드로 이관하십시오.
                          </p>
                          <button
                            onClick={() => handleOpenReportCamera("2ND", selectedSeat.id)}
                            className="w-full py-2.5 rounded-xl bg-red-655 hover:bg-red-500 text-white font-bold text-xs transition-all flex items-center justify-center gap-1.5 shadow-md shadow-red-900/10 cursor-pointer"
                          >
                            <Camera className="h-4 w-4" />
                            <span>최종 2차 신고 접수 (현장 촬영)</span>
                          </button>
                        </div>
                      )}
                    </div>
                  )}

                  {/* Option 4: Reported 2nd - admin review */}
                  {selectedSeat.status === "REPORTED_2ND" && (
                    <div className="p-4 rounded-xl border border-red-200 bg-red-50/50 text-center">
                      <Lock className="h-8 w-8 text-red-500 mx-auto mb-2" />
                      <p className="text-xs font-extrabold text-red-650">2차 최종 신고 완료</p>
                      <p className="text-[10px] text-slate-500 mt-1 font-semibold leading-relaxed">
                        관리자 대시보드에 두 증거 사진이 이관되었습니다. 관리자의 현장 점검 후 좌석이 강제 개방됩니다.
                      </p>
                    </div>
                  )}

                  {/* Option 5: Clearing - countdown to available */}
                  {selectedSeat.status === "CLEARING" && (
                    <div className="p-4 rounded-xl border border-purple-200 bg-purple-50/50 text-center">
                      <Clock className="h-8 w-8 text-purple-500 mx-auto mb-2 animate-pulse" />
                      <p className="text-xs font-extrabold text-purple-655">물품 수거 및 정돈 중</p>
                      <p className="text-[10px] text-slate-500 mt-1 font-semibold leading-relaxed">
                        담당 사서관님이 사재기 물품을 정리 중입니다. 정리 유예 시간(10분)이 끝나면 자동으로 빈자리가 됩니다.
                      </p>
                    </div>
                  )}

                  {/* Self operations for current occupant */}
                  {selectedSeat.current_user_id === user.id && (
                    <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 space-y-2">
                      <p className="text-xs text-slate-500 text-center font-bold">내가 사용 중인 좌석입니다.</p>
                      {selectedSeat.status === "REPORTED_1ST" ? (
                        <button
                          onClick={onConfirmReturn}
                          className="w-full py-2.5 rounded-xl bg-amber-550 hover:bg-amber-600 text-white font-bold text-xs transition-all shadow-md shadow-amber-900/10 cursor-pointer"
                        >
                          자리 복귀 확인 (신고 리셋)
                        </button>
                      ) : (
                        <button
                          onClick={onCheckout}
                          className="w-full py-2.5 rounded-xl bg-red-50 hover:bg-red-100 text-red-650 font-bold border border-red-200 text-xs transition-colors cursor-pointer"
                        >
                          반납 및 퇴실하기
                        </button>
                      )}
                    </div>
                  )}
                </div>
              </div>
            ) : (
              <div className="h-48 flex flex-col items-center justify-center border border-dashed border-slate-200 rounded-xl p-4 text-center bg-slate-50/50">
                <HelpCircle className="h-8 w-8 text-slate-400 mb-2" />
                <p className="text-xs text-slate-500 leading-normal font-semibold">도면에서 임의의 좌석을 클릭하시면 상세 정보 및 액션 버튼이 활성화됩니다.</p>
              </div>
            )}
          </div>

          {/* Simulation controller */}
          <div className="mt-8 pt-4 border-t border-slate-200">
            <div className="bg-slate-50 p-3 rounded-lg border border-slate-200 space-y-2">
              <div className="flex items-center justify-between text-[10px] text-emerald-700 font-bold">
                <span>🧪 테스트용 시뮬레이션 설정</span>
                <span className="bg-emerald-50 text-emerald-700 border border-emerald-100 px-1 py-0.5 rounded font-mono">DEV MODE</span>
              </div>
              <label className="flex items-center space-x-2 text-xs text-slate-700 cursor-pointer font-semibold">
                <input
                  type="checkbox"
                  checked={timerSpeedUp}
                  onChange={(e) => setTimerSpeedUp(e.target.checked)}
                  className="rounded border-slate-300 bg-white text-emerald-600 focus:ring-emerald-500 cursor-pointer"
                />
                <span>타이머 속도 60배속 가속</span>
              </label>
              <p className="text-[10px] text-slate-400 leading-tight font-semibold">
                활성화 시, 1차 신고 대기(30분 → 30초) 및 물품 정리(10분 → 10초) 타이머가 가속되어 신속한 동작 검증이 가능합니다.
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* 🚀 [요청 9] 내 민원 건의 현황 (Student View Tracker) */}
      <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-xs">
        <h3 className="text-sm font-extrabold text-slate-800 mb-4 flex items-center gap-1.5 border-b border-slate-100 pb-2">
          <FileText className="h-4.5 w-4.5 text-emerald-600" />
          <span>내 민원 건의 현황 및 조치 상태 ({myComplaints.length}건)</span>
        </h3>
        {myComplaints.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="border-b border-slate-150 text-slate-400 uppercase tracking-wider font-bold">
                  <th className="py-2.5">접수 일시</th>
                  <th className="py-2.5">민원 유형</th>
                  <th className="py-2.5">민원 상세 내용</th>
                  <th className="py-2.5 text-center">진행 상태</th>
                  <th className="py-2.5">관리자 조치 결과</th>
                  <th className="py-2.5 text-right">소명</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 font-semibold text-slate-700">
                {myComplaints.map((c) => (
                  <tr key={c.id} className="hover:bg-slate-50/50 transition-all">
                    <td className="py-3 font-mono text-[11px] text-slate-400">
                      {new Date(c.created_at).toLocaleString("ko-KR", { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" })}
                    </td>
                    <td className="py-3">
                      <span className={`px-2 py-0.5 rounded-md text-[10px] font-bold ${
                        c.category === "NOISE" ? "bg-amber-50 text-amber-700 border border-amber-150" :
                        c.category === "DAMAGE" ? "bg-red-50 text-red-700 border border-red-150" :
                        c.category === "CLEANLINESS" ? "bg-blue-50 text-blue-700 border border-blue-150" :
                        "bg-slate-50 text-slate-700 border border-slate-150"
                      }`}>
                        {c.category === "NOISE" && "소음/소란"}
                        {c.category === "DAMAGE" && "시설 파손"}
                        {c.category === "CLEANLINESS" && "청결 불량"}
                        {c.category === "ABSENCE" && "부재 경고"}
                        {c.category === "OTHER" && "기타 민원"}
                      </span>
                    </td>
                    <td className="py-3 max-w-[200px] truncate" title={c.description}>
                      {c.description}
                    </td>
                    <td className="py-3 text-center">
                      <span className={`px-2 py-0.5 rounded-full text-[10px] font-extrabold ${
                        c.status === "PENDING" ? "bg-amber-100 text-amber-850" :
                        c.status === "PROCESSING" ? "bg-blue-100 text-blue-800 animate-pulse" :
                        "bg-emerald-100 text-emerald-800"
                      }`}>
                        {c.status === "PENDING" && "접수 완료"}
                        {c.status === "PROCESSING" && "관리자 확인 중"}
                        {c.status === "RESOLVED" && "조치 완료"}
                      </span>
                    </td>
                    <td className="py-3 text-slate-500 max-w-[220px] truncate" title={c.resolution_comment}>
                      {c.resolution_comment || <span className="text-slate-350 italic">처리 대기 중...</span>}
                    </td>
                    <td className="py-3 text-right">
                      {c.status !== "RESOLVED" && (
                        <button
                          onClick={() => {
                            setVindicateComplaintId(c.id);
                            setShowVindicateModal(true);
                          }}
                          className="px-2 py-1 rounded bg-slate-100 hover:bg-emerald-50 text-slate-600 hover:text-emerald-700 border border-slate-200 hover:border-emerald-200 text-[10px] font-bold transition-all cursor-pointer"
                        >
                          소명서 제출
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="py-8 text-center text-slate-400 text-xs italic font-medium">
            최근 제출한 민원 건의 내역이 없습니다.
          </div>
        )}
      </div>

      {/* 🚀 [요청 6] 통합 스마트 좌석 불편 신고 모달 */}
      {showComplaintModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4 animate-fade-in">
          <div className="w-full max-w-lg bg-white rounded-3xl border border-slate-200 shadow-2xl p-6 md:p-8 flex flex-col max-h-[90vh] overflow-hidden">
            {/* Modal Header */}
            <div className="flex items-center justify-between border-b border-slate-150 pb-4 mb-5">
              <div className="flex items-center space-x-2.5">
                <div className="bg-slate-900 p-2 rounded-xl text-white">
                  <Megaphone className="h-5 w-5" />
                </div>
                <div>
                  <h3 className="text-base font-extrabold text-slate-900">이용 불편 민원 신청 센터</h3>
                  <p className="text-[11px] text-slate-400 mt-0.5">교내 열람실 및 시설 사용 중 겪으신 불편 사항을 접수합니다.</p>
                </div>
              </div>
              <button
                onClick={() => setShowComplaintModal(false)}
                className="p-1 text-slate-400 hover:text-slate-650 transition-all cursor-pointer"
              >
                닫기
              </button>
            </div>

            {/* Disclaimer */}
            <div className="mb-4 bg-slate-50 border border-slate-200 p-3 rounded-xl text-[10px] text-slate-500 font-semibold leading-relaxed">
              🔒 <strong>실명 및 학번 기명 접수 고지:</strong><br />
              본 시스템은 신뢰할 수 있는 캠퍼스 환경 조성을 위해 익명 접수를 배제하고 <strong>학번({user.university_id})과 성명({user.name}) 기명 기반</strong>으로 운영됩니다. 악의적인 무차별 허위/악성 민원 접수 시 시스템 사용 제한 및 패널티 부과 처분을 받을 수 있습니다.
            </div>

            {/* Modal Form */}
            <form onSubmit={handleComplaintSubmit} className="space-y-4 flex-grow overflow-y-auto pr-1">
              {/* Category selector */}
              <div className="space-y-1.5">
                <label className="text-[10px] uppercase font-bold text-slate-500 tracking-wider">불편 사항 유형</label>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                  {[
                    { type: "NOISE", label: "소음/소란", icon: VolumeX },
                    { type: "DAMAGE", label: "시설 파손", icon: Wrench },
                    { type: "CLEANLINESS", label: "청결 불량", icon: Trash2 },
                    { type: "OTHER", label: "기타 사유", icon: HelpCircle }
                  ].map((cat) => (
                    <button
                      key={cat.type}
                      type="button"
                      onClick={() => setComplaintCategory(cat.type as any)}
                      className={`py-2 px-3 rounded-xl border text-xs font-bold transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
                        complaintCategory === cat.type
                          ? "bg-slate-900 text-white border-slate-950 shadow-sm"
                          : "bg-slate-50 border-slate-200 text-slate-550 hover:bg-slate-100"
                      }`}
                    >
                      <cat.icon className="h-3.5 w-3.5" />
                      <span>{cat.label}</span>
                    </button>
                  ))}
                </div>
              </div>

              {/* Description */}
              <div className="space-y-1.5">
                <label className="text-[10px] uppercase font-bold text-slate-500 tracking-wider">상세 민원 사유</label>
                <textarea
                  value={complaintDescription}
                  onChange={(e) => setComplaintDescription(e.target.value)}
                  placeholder="예: 제2열람실 3번 테이블 노트북 마우스 클릭 소리가 너무 큽니다. 조치 부탁드립니다."
                  rows={3}
                  className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:bg-white focus:border-slate-800 outline-none transition-all font-semibold"
                />
              </div>

              {/* Photo Evidence */}
              <div className="space-y-1.5">
                <label className="text-[10px] uppercase font-bold text-slate-500 tracking-wider block">증빙 사진 첨부 (선택 사항)</label>
                <div className="flex items-center gap-3">
                  {complaintPhoto ? (
                    <div className="relative w-24 h-24 rounded-lg overflow-hidden border border-slate-200 bg-slate-100">
                      <img src={complaintPhoto} alt="Evidence" className="w-full h-full object-cover" />
                      <button
                        type="button"
                        onClick={() => setComplaintPhoto(null)}
                        className="absolute top-1 right-1 bg-red-650 text-white p-0.5 rounded-full hover:bg-red-500 cursor-pointer"
                      >
                        <Trash2 className="h-3 w-3" />
                      </button>
                    </div>
                  ) : (
                    <button
                      type="button"
                      onClick={() => handleOpenReportCamera("COMPLAINT", 0)}
                      className="w-24 h-24 border border-dashed border-slate-300 rounded-lg flex flex-col items-center justify-center text-slate-400 hover:text-slate-650 hover:border-slate-450 hover:bg-slate-50 transition-all cursor-pointer"
                    >
                      <Camera className="h-5 w-5 mb-1" />
                      <span className="text-[9px] font-bold">사진 촬영</span>
                    </button>
                  )}
                  <p className="text-[9px] text-slate-400 max-w-[240px] leading-relaxed">
                    * 파손된 콘센트나 흔들리는 시설물 등을 실시간으로 촬영해 올리시면 시설수리에 대단히 도움이 됩니다.
                  </p>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex items-center justify-end gap-2 border-t border-slate-150 pt-4 mt-6">
                <button
                  type="button"
                  onClick={() => setShowComplaintModal(false)}
                  className="px-4 py-2 text-xs font-bold text-slate-500 hover:text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-xl transition-all cursor-pointer"
                >
                  취소
                </button>
                <button
                  type="submit"
                  disabled={cooldownTimeLeft > 0 || isSubmittingComplaint}
                  className={`px-5 py-2 text-xs font-bold text-white rounded-xl transition-all shadow-md cursor-pointer flex items-center gap-1.5 ${
                    cooldownTimeLeft > 0 || isSubmittingComplaint
                      ? "bg-slate-350 shadow-none cursor-not-allowed"
                      : "bg-emerald-600 hover:bg-emerald-500"
                  }`}
                >
                  {isSubmittingComplaint && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
                  <span>{cooldownTimeLeft > 0 ? "쿨타임 대기 중" : "민원 접수 완료"}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* 🚀 [요청 7] 스마트 셀프 소명서(해명서) 서면 제출 모달 */}
      {showVindicateModal && vindicateComplaintId !== null && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4 animate-fade-in">
          <div className="w-full max-w-md bg-white rounded-3xl border border-slate-200 shadow-2xl p-6 flex flex-col">
            <div className="flex items-center justify-between border-b border-slate-150 pb-3 mb-4">
              <h3 className="text-sm font-extrabold text-slate-900 flex items-center gap-1.5">
                <FileText className="h-4.5 w-4.5 text-emerald-600" />
                <span>소명서 서면 제출</span>
              </h3>
              <button
                onClick={() => setShowVindicateModal(false)}
                className="p-1 text-slate-400 hover:text-slate-650 transition-all cursor-pointer"
              >
                닫기
              </button>
            </div>

            <form onSubmit={handleVindicateSubmit} className="space-y-4">
              <div className="space-y-1">
                <label className="text-[10px] uppercase font-bold text-slate-500 tracking-wider">소명 유형 선택</label>
                <select
                  value={vindicateType}
                  onChange={(e) => setVindicateType(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:bg-white focus:border-emerald-500 outline-none cursor-pointer font-bold text-slate-700"
                >
                  <option value="주변 소음이었으나 오해를 받았습니다">주변 소음이었으나 오해를 받았습니다</option>
                  <option value="기기 오작동으로 경고를 확인하지 못했습니다">기기 오작동으로 경고를 확인하지 못했습니다</option>
                  <option value="잠시 자리를 비운 사이 급한 용무였습니다">잠시 자리를 비운 사이 급한 용무였습니다</option>
                  <option value="타 학생의 고의적 신고입니다">타 학생의 고의적 신고입니다</option>
                </select>
              </div>

              <div className="space-y-1">
                <label className="text-[10px] uppercase font-bold text-slate-500 tracking-wider">소명 및 변론 상세 (한 줄 해명)</label>
                <input
                  type="text"
                  maxLength={100}
                  value={vindicateComment}
                  onChange={(e) => setVindicateComment(e.target.value)}
                  placeholder="예: 마우스 소음이 크다는 신고를 받았는데, 저소음 마우스를 사용하고 있습니다."
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:bg-white focus:border-emerald-500 outline-none font-semibold text-slate-700"
                />
              </div>

              <div className="flex items-center justify-end gap-2 border-t border-slate-150 pt-4 mt-6">
                <button
                  type="button"
                  onClick={() => setShowVindicateModal(false)}
                  className="px-4 py-2 text-xs font-bold text-slate-500 hover:text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-xl transition-all cursor-pointer"
                >
                  취소
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 text-xs font-bold text-white bg-emerald-650 hover:bg-emerald-500 rounded-xl transition-all shadow-md cursor-pointer"
                >
                  소명서 제출 완료
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Camera Capture Modal */}
      {showCamera && (
        <CameraCapture
          title={
            cameraPurpose === "1ST" ? "1차 부재 신고 사진 촬영" :
            cameraPurpose === "2ND" ? "2차 최종 부재 신고 사진 촬영" :
            cameraPurpose === "COMPLAINT" ? "민원 증빙 사진 촬영" :
            "본인 소명 사진 촬영 (셀카 인증)"
          }
          onCapture={handleCapturePhoto}
          onClose={() => {
            setShowCamera(false);
            setReportingSeatId(null);
          }}
        />
      )}
    </div>
  );
}
