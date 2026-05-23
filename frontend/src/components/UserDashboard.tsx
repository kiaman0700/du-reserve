"use client";

import React, { useState } from "react";
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
  History
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
  instantConfirm: boolean;
  buildingName: string;
  description: string;
}

interface UserDashboardProps {
  user: Profile;
  selectedSeat: Seat | null;
  userReservation: Seat | null;
  absenceReports: AbsenceReport[];
  onReserve: (seatId: number, durationMinutes: number) => void;
  onCheckout: () => void;
  onConfirmReturn: () => void;
  onReportAbsence1st: (seatId: number, photo: string) => void;
  onReportAbsence2nd: (seatId: number, photo: string) => void;
  onExtendSeat?: (seatId: number, extendMinutes: number) => void;
  timerSpeedUp: boolean;
  setTimerSpeedUp: (val: boolean) => void;
  selectedFacility: Facility | null;
}

export default function UserDashboard({
  user,
  selectedSeat,
  userReservation,
  absenceReports,
  onReserve,
  onCheckout,
  onConfirmReturn,
  onReportAbsence1st,
  onReportAbsence2nd,
  onExtendSeat,
  timerSpeedUp,
  setTimerSpeedUp,
  selectedFacility
}: UserDashboardProps) {
  const [showCamera, setShowCamera] = useState<boolean>(false);
  const [cameraPurpose, setCameraPurpose] = useState<"1ST" | "2ND">("1ST");
  const [reportingSeatId, setReportingSeatId] = useState<number | null>(null);

  const [selectedDuration, setSelectedDuration] = useState<number>(180); // 기본 3시간 (180분)
  const [selectedExtension, setSelectedExtension] = useState<number>(180); // 연장 기본 3시간

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

  // Find active report for the selected seat
  const activeReport = selectedSeat 
    ? absenceReports.find(r => r.seat_id === selectedSeat.id && r.seat_id !== userReservation?.id)
    : null;

  const handleOpenReportCamera = (purpose: "1ST" | "2ND", seatId: number) => {
    setCameraPurpose(purpose);
    setReportingSeatId(seatId);
    setShowCamera(true);
  };

  const handleCapturePhoto = (photoUrl: string) => {
    if (reportingSeatId === null) return;
    if (cameraPurpose === "1ST") {
      onReportAbsence1st(reportingSeatId, photoUrl);
    } else {
      onReportAbsence2nd(reportingSeatId, photoUrl);
    }
    setShowCamera(false);
    setReportingSeatId(null);
  };

  return (
    <div className="space-y-6">
      {/* User Information Panel */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 rounded-2xl bg-white border border-slate-200 p-6 shadow-xs">
        <div className="flex items-center space-x-4">
          <div className="rounded-full bg-emerald-50 p-3 text-emerald-600 border border-emerald-100">
            <User className="h-6 w-6" />
          </div>
          <div>
            <div className="flex items-center space-x-2">
              <h2 className="text-lg font-bold text-slate-800">{user.name}</h2>
              <span className="rounded bg-emerald-50 border border-emerald-100 px-2 py-0.5 text-xs text-emerald-700 font-mono font-bold">
                {user.role}
              </span>
            </div>
            <p className="text-xs text-slate-500">학번/ID: {user.university_id}</p>
          </div>
        </div>

        {/* Current Active Reservation Details */}
        {userReservation ? (
          <div className="flex items-center space-x-4 bg-emerald-50/30 border border-emerald-500/20 px-4 py-3 rounded-xl shadow-xs">
            <div className="space-y-1">
              <span className="text-[10px] text-emerald-700 uppercase tracking-widest font-bold">내 예약 정보</span>
              <p className="text-sm font-semibold text-slate-800">
                {selectedFacility ? `${selectedFacility.buildingName} ${selectedFacility.name}` : userReservation.room_name} - {userReservation.seat_number}번 좌석
              </p>
              
              {userReservation.status === "REPORTED_1ST" && (
                <div className="flex items-center gap-1.5 text-xs text-amber-655 font-bold animate-pulse">
                  <AlertTriangle className="h-3.5 w-3.5" />
                  <span>장기 부재 신고 접수됨 (복귀 필요)</span>
                </div>
              )}
            </div>
            <div className="flex flex-col gap-2">
              {userReservation.status === "REPORTED_1ST" ? (
                <button
                  onClick={onConfirmReturn}
                  className="bg-amber-500 hover:bg-amber-600 text-white px-3 py-1.5 rounded-lg text-xs font-bold shadow-md shadow-amber-900/10 transition-all cursor-pointer"
                >
                  복귀 확인
                </button>
              ) : (
                <button
                  onClick={onCheckout}
                  className="flex items-center justify-center gap-1 bg-red-55 hover:bg-red-500 hover:text-white text-red-650 px-3 py-1.5 rounded-lg text-xs font-bold border border-red-200 transition-all cursor-pointer"
                >
                  <LogOut className="h-3 w-3" />
                  <span>퇴실하기</span>
                </button>
              )}
            </div>
          </div>
        ) : (
          <div className="text-xs text-slate-500 bg-slate-50 px-4 py-3 rounded-xl border border-slate-200">
            현재 {selectedFacility ? selectedFacility.name : "열람실"}에 예약한 자리가 없습니다. 좌석 배치도에서 자리를 선택하여 예약을 진행하세요.
          </div>
        )}
      </div>

      {/* 이용 시간 만료 임박(10분 이하) 알림 배너 */}
      {userReservation && userReservation.use_timer_seconds !== undefined && userReservation.use_timer_seconds <= 600 && (
        <div className="rounded-2xl bg-amber-50 border border-amber-300 p-5 shadow-xs flex flex-col md:flex-row items-start md:items-center justify-between gap-4 animate-fade-in">
          <div className="flex items-center space-x-3.5">
            <div className="p-2.5 bg-amber-100 rounded-xl text-amber-600 border border-amber-250">
              <Clock className="h-6 w-6 animate-pulse" />
            </div>
            <div>
              <h4 className="text-sm font-bold text-slate-900">⚠️ 좌석 이용 시간 만료 임박 안내</h4>
              <p className="text-xs text-slate-600 mt-0.5 font-medium">
                현재 사용 중인 좌석의 남은 이용 시간이 <strong className="text-amber-700 font-mono text-sm">{formatSecondsToTime(userReservation.use_timer_seconds)}</strong> 남았습니다.
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2.5 w-full md:w-auto">
            <select
              value={selectedExtension}
              onChange={(e) => setSelectedExtension(Number(e.target.value))}
              className="px-3 py-1.5 bg-white border border-slate-200 rounded-xl text-xs font-bold focus:outline-none focus:ring-2 focus:ring-emerald-500/20 text-slate-700 cursor-pointer"
            >
              {Array.from({ length: 18 }, (_, i) => (i + 1) * 10).map((min) => {
                const hr = Math.floor(min / 60);
                const mn = min % 60;
                const label = hr > 0 ? `${hr}시간 ${mn > 0 ? `${mn}분` : ""}` : `${mn}분`;
                return (
                  <option key={min} value={min}>
                    {label}로 연장
                  </option>
                );
              })}
            </select>
            <button
              onClick={() => {
                if (onExtendSeat) {
                  onExtendSeat(userReservation.id, selectedExtension);
                }
              }}
              className="bg-emerald-600 hover:bg-emerald-500 text-white px-4 py-1.5 rounded-xl text-xs font-bold shadow-md shadow-emerald-800/10 transition-all active:scale-[0.97] cursor-pointer"
            >
              시간 연장 신청
            </button>
          </div>
        </div>
      )}

      {/* Main Grid: Control / Seat Panel */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 bg-white border border-slate-200 rounded-2xl p-6 shadow-xs">
          <h3 className="text-base font-bold text-slate-800 mb-4 flex items-center justify-between">
            <span>{selectedFacility ? `${selectedFacility.name} 실시간 현황` : "열람실 실시간 현황"}</span>
            <span className="flex items-center gap-1.5 text-xs text-emerald-600 font-bold">
              <span className="h-2 w-2 rounded-full bg-emerald-500 animate-ping"></span> 실시간 동기화 중
            </span>
          </h3>
          
          {/* Legend */}
          <div className="flex flex-wrap gap-4 mb-6 text-xs text-slate-600 bg-slate-50 p-3 rounded-xl border border-slate-150">
            <div className="flex items-center gap-1.5">
              <span className="h-3.5 w-3.5 rounded border border-emerald-500/30 bg-emerald-50"></span>
              <span>빈자리</span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="h-3.5 w-3.5 rounded border border-slate-300 bg-slate-100"></span>
              <span>이용 중</span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="h-3.5 w-3.5 rounded border border-amber-400 bg-amber-50 animate-pulse"></span>
              <span>1차 경고</span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="h-3.5 w-3.5 rounded border border-red-400 bg-red-50 animate-pulse"></span>
              <span>2차 신고</span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="h-3.5 w-3.5 rounded border border-purple-400 bg-purple-50 animate-pulse"></span>
              <span>정리 중</span>
            </div>
          </div>

          <div className="border border-slate-200 rounded-xl p-4 bg-slate-50/50">
            <p className="text-xs text-emerald-700 font-bold mb-2 flex items-center gap-1">
              <Activity className="h-3.5 w-3.5" />
              <span>좌석 도면 배치 (클릭하여 조작 가능)</span>
            </p>
            <div className="text-slate-500 text-xs">
              예약하고 싶은 빈자리를 누르거나, 자리에 없는 사용자를 신고하기 위해 이용 중인 자리를 선택하세요.
            </div>
          </div>
        </div>

        {/* Action Panel Sidebar */}
        <div className="bg-white border border-slate-200 rounded-2xl p-6 flex flex-col justify-between shadow-xs">
          <div>
            <h3 className="text-base font-bold text-slate-850 mb-4 pb-2 border-b border-slate-200">
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
                    <span className="text-sm font-bold text-slate-850">{selectedSeat.seat_number}번 좌석</span>
                  </div>

                  <div className="flex items-center justify-between text-xs py-1 border-t border-b border-slate-200/60">
                    <span className="text-slate-500">현재 상태</span>
                    <span className={`font-bold ${
                      selectedSeat.status === "AVAILABLE" ? "text-emerald-600" :
                      selectedSeat.status === "OCCUPIED" ? "text-slate-650" :
                      selectedSeat.status === "REPORTED_1ST" ? "text-amber-600" :
                      selectedSeat.status === "REPORTED_2ND" ? "text-red-650" :
                      "text-purple-650"
                    }`}>
                      {selectedSeat.status === "AVAILABLE" && "예약 가능 (AVAILABLE)"}
                      {selectedSeat.status === "OCCUPIED" && "이용 중 (OCCUPIED)"}
                      {selectedSeat.status === "REPORTED_1ST" && "1차 경고 (REPORTED_1ST)"}
                      {selectedSeat.status === "REPORTED_2ND" && "2차 신고 완료 (REPORTED_2ND)"}
                      {selectedSeat.status === "CLEARING" && "자리 정리 중 (CLEARING)"}
                    </span>
                  </div>

                  {selectedSeat.status !== "AVAILABLE" && (
                    <div className="text-[11px] text-slate-500 space-y-2">
                      <div className="flex justify-between">
                        <span>이용자:</span>
                        <span className="font-bold text-slate-700">
                          {selectedSeat.id === userReservation?.id ? `${user.name} (나)` : selectedSeat.current_user_name || "학부생"}
                        </span>
                      </div>
                      {selectedSeat.id !== userReservation?.id && (
                        <div className="flex justify-between">
                          <span>학번 정보:</span>
                          <span className="font-mono text-slate-400">2022****</span>
                        </div>
                      )}
                      
                      {/* 예약 상세 시간 정보 추가 */}
                      {selectedSeat.reserved_at && selectedSeat.ends_at && (
                        <div className="pt-2 border-t border-slate-200/60 space-y-1 bg-white/40 p-2 rounded-lg border border-slate-100">
                          <div className="flex justify-between font-medium">
                            <span className="text-slate-400">설정이용 시간:</span>
                            <span className="text-slate-700">{selectedSeat.total_duration_minutes}분 설정</span>
                          </div>
                          <div className="flex justify-between font-medium">
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
                        <div className="space-y-1.5 p-3.5 bg-slate-50 border border-slate-200 rounded-xl">
                          <label className="text-[10px] uppercase font-bold text-slate-500 tracking-wider block">
                            ⏱️ 좌석 이용 설정 시간
                          </label>
                          <select
                            value={selectedDuration}
                            onChange={(e) => setSelectedDuration(Number(e.target.value))}
                            className="w-full px-3 py-2 bg-white border border-slate-200 rounded-lg text-xs font-bold text-slate-700 focus:outline-none focus:border-emerald-500 cursor-pointer"
                          >
                            {Array.from({ length: 18 }, (_, i) => (i + 1) * 10).map((min) => {
                              const hr = Math.floor(min / 60);
                              const mn = min % 60;
                              const label = hr > 0 ? `${hr}시간 ${mn > 0 ? `${mn}분` : ""}` : `${mn}분`;
                              return (
                                <option key={min} value={min}>
                                  {label} 이용 (최대 3시간)
                                </option>
                              );
                            })}
                          </select>
                          <p className="text-[9px] text-slate-400 leading-normal mt-1">
                            * 사용자가 직접 설정한 시간만큼 타이머가 차감되며, 남은 시간이 10분 미만일 때 3시간 범위 내에서 다시 연장할 수 있습니다.
                          </p>
                        </div>
                      )}
                      <button
                        disabled={!!userReservation}
                        onClick={() => onReserve(selectedSeat.id, selectedDuration)}
                        className={`w-full py-3 rounded-xl font-bold text-sm transition-all flex items-center justify-center gap-2 cursor-pointer ${
                          userReservation 
                            ? "bg-slate-100 text-slate-400 border border-slate-200 cursor-not-allowed"
                            : "bg-emerald-600 hover:bg-emerald-500 text-white shadow-md shadow-emerald-700/10 hover:scale-[1.01] active:scale-[0.99]"
                        }`}
                      >
                        <span>{userReservation ? "이미 예약된 좌석이 있습니다" : "이 좌석 예약하기"}</span>
                      </button>
                    </div>
                  )}

                  {/* Option 2: Reported by user or report actions */}
                  {selectedSeat.status === "OCCUPIED" && selectedSeat.id !== userReservation?.id && (
                    <div className="space-y-2">
                      <p className="text-[11px] text-amber-600 flex items-start gap-1 font-medium">
                        <AlertTriangle className="h-3.5 w-3.5 flex-shrink-0 mt-0.5 text-amber-500" />
                        <span>좌석에 소지품만 남겨두고 장시간 자리를 비웠다면 증거 사진을 촬영해 신고할 수 있습니다.</span>
                      </p>
                      
                      <button
                        onClick={() => handleOpenReportCamera("1ST", selectedSeat.id)}
                        className="w-full py-2.5 rounded-xl bg-amber-55 hover:bg-amber-500 hover:text-white text-amber-700 font-bold border border-amber-200 text-xs transition-all flex items-center justify-center gap-1.5 cursor-pointer shadow-xs"
                      >
                        <Camera className="h-4 w-4" />
                        <span>부재중 1차 신고 (현장 촬영)</span>
                      </button>
                    </div>
                  )}

                  {/* Option 3: Reported 1st - waiting for timer or 2nd report */}
                  {selectedSeat.status === "REPORTED_1ST" && selectedSeat.id !== userReservation?.id && activeReport && (
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
                        <div className="text-[11px] text-slate-500 space-y-2">
                          <p>⚠️ 원예약자가 자리로 복귀할 때까지 대기 타이머가 동작합니다. 타이머가 끝난 뒤에도 복귀하지 않으면 2차 신고를 접수할 수 있습니다.</p>
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
                      <p className="text-xs font-bold text-red-650">2차 최종 신고 완료</p>
                      <p className="text-[10px] text-slate-500 mt-1">
                        관리자 대시보드에 두 증거 사진이 이관되었습니다. 관리자의 확인 후 좌석이 강제 개방됩니다.
                      </p>
                    </div>
                  )}

                  {/* Option 5: Clearing - countdown to available */}
                  {selectedSeat.status === "CLEARING" && (
                    <div className="p-4 rounded-xl border border-purple-200 bg-purple-50/50 text-center">
                      <Clock className="h-8 w-8 text-purple-500 mx-auto mb-2 animate-pulse" />
                      <p className="text-xs font-bold text-purple-655">물품 수거 및 정돈 중</p>
                      <p className="text-[10px] text-slate-500 mt-1">
                        담당자가 사재기 물품을 정리 중입니다. 10분 유예 시간이 끝나면 자동으로 빈자리가 됩니다.
                      </p>
                    </div>
                  )}

                  {/* Self operations for current occupant */}
                  {selectedSeat.id === userReservation?.id && (
                    <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 space-y-2">
                      <p className="text-xs text-slate-500 text-center">내가 사용 중인 좌석입니다.</p>
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
                          className="w-full py-2.5 rounded-xl bg-red-55 hover:bg-red-500 hover:text-white text-red-650 font-bold border border-red-200 text-xs transition-colors cursor-pointer"
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
                <p className="text-xs text-slate-500 leading-normal">도면에서 임의의 좌석을 클릭하시면 상세 정보 및 액션 버튼이 활성화됩니다.</p>
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
              <label className="flex items-center space-x-2 text-xs text-slate-700 cursor-pointer">
                <input
                  type="checkbox"
                  checked={timerSpeedUp}
                  onChange={(e) => setTimerSpeedUp(e.target.checked)}
                  className="rounded border-slate-300 bg-white text-emerald-600 focus:ring-emerald-500 cursor-pointer"
                />
                <span>타이머 속도 60배속 가속</span>
              </label>
              <p className="text-[10px] text-slate-500 leading-tight">
                활성화 시, 1차 신고 대기(30분 → 30초) 및 물품 정리(10분 → 10초) 타이머가 가속되어 신속한 동작 검증이 가능합니다.
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Camera Modal Overlay */}
      {showCamera && reportingSeatId !== null && (
        <CameraCapture
          title={`${reportingSeatId}번 좌석 부재 신고 사진 촬영`}
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
