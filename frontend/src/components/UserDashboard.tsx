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

interface UserDashboardProps {
  user: Profile;
  selectedSeat: Seat | null;
  userReservation: Seat | null;
  absenceReports: AbsenceReport[];
  onReserve: (seatId: number) => void;
  onCheckout: () => void;
  onConfirmReturn: () => void;
  onReportAbsence1st: (seatId: number, photo: string) => void;
  onReportAbsence2nd: (seatId: number, photo: string) => void;
  timerSpeedUp: boolean;
  setTimerSpeedUp: (val: boolean) => void;
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
  timerSpeedUp,
  setTimerSpeedUp
}: UserDashboardProps) {
  const [showCamera, setShowCamera] = useState<boolean>(false);
  const [cameraPurpose, setCameraPurpose] = useState<"1ST" | "2ND">("1ST");
  const [reportingSeatId, setReportingSeatId] = useState<number | null>(null);

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
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 rounded-2xl bg-slate-900 border border-slate-800 p-6">
        <div className="flex items-center space-x-4">
          <div className="rounded-full bg-indigo-500/10 p-3 text-indigo-400">
            <User className="h-6 w-6" />
          </div>
          <div>
            <div className="flex items-center space-x-2">
              <h2 className="text-lg font-bold text-slate-100">{user.name}</h2>
              <span className="rounded bg-indigo-500/10 px-2 py-0.5 text-xs text-indigo-400 font-mono">
                {user.role}
              </span>
            </div>
            <p className="text-xs text-slate-400">학번/ID: {user.university_id}</p>
          </div>
        </div>

        {/* Current Active Reservation Details */}
        {userReservation ? (
          <div className="flex items-center space-x-4 bg-slate-950/50 border border-indigo-500/20 px-4 py-3 rounded-xl">
            <div className="space-y-1">
              <span className="text-[10px] text-indigo-400 uppercase tracking-widest font-bold">내 예약 정보</span>
              <p className="text-sm font-semibold text-slate-200">
                {userReservation.room_name} - {userReservation.seat_number}번 좌석
              </p>
              
              {userReservation.status === "REPORTED_1ST" && (
                <div className="flex items-center gap-1.5 text-xs text-amber-500 font-semibold animate-pulse">
                  <AlertTriangle className="h-3.5 w-3.5" />
                  <span>장기 부재 신고 접수됨 (복귀 필요)</span>
                </div>
              )}
            </div>
            <div className="flex flex-col gap-2">
              {userReservation.status === "REPORTED_1ST" ? (
                <button
                  onClick={onConfirmReturn}
                  className="bg-amber-600 hover:bg-amber-500 text-slate-100 px-3 py-1.5 rounded-lg text-xs font-semibold shadow-lg shadow-amber-900/30 transition-colors"
                >
                  복귀 확인
                </button>
              ) : (
                <button
                  onClick={onCheckout}
                  className="flex items-center justify-center gap-1 bg-red-600/15 hover:bg-red-600 hover:text-slate-100 text-red-400 px-3 py-1.5 rounded-lg text-xs font-semibold border border-red-500/20 transition-all"
                >
                  <LogOut className="h-3 w-3" />
                  <span>퇴실하기</span>
                </button>
              )}
            </div>
          </div>
        ) : (
          <div className="text-xs text-slate-400 bg-slate-950/40 px-4 py-3 rounded-xl border border-slate-800">
            현재 예약한 자리가 없습니다. 좌석 배치도에서 자리를 선택하여 예약을 진행하세요.
          </div>
        )}
      </div>

      {/* Main Grid: Control / Seat Panel */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 bg-slate-900 border border-slate-800 rounded-2xl p-6">
          <h3 className="text-base font-semibold text-slate-200 mb-4 flex items-center justify-between">
            <span>열람실 실시간 현황</span>
            <span className="flex items-center gap-1.5 text-xs text-emerald-400 font-medium">
              <span className="h-2 w-2 rounded-full bg-emerald-500 animate-ping"></span> Realtime 동기화 활성
            </span>
          </h3>
          
          {/* Legend */}
          <div className="flex flex-wrap gap-4 mb-6 text-xs text-slate-400 bg-slate-950/30 p-3 rounded-xl border border-slate-900">
            <div className="flex items-center gap-1.5">
              <span className="h-3.5 w-3.5 rounded border border-blue-500/40 bg-blue-950/40"></span>
              <span>빈자리</span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="h-3.5 w-3.5 rounded border border-slate-700 bg-slate-800/80"></span>
              <span>이용 중</span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="h-3.5 w-3.5 rounded border border-amber-500 bg-amber-500/20 animate-pulse"></span>
              <span>1차 경고</span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="h-3.5 w-3.5 rounded border border-red-500 bg-red-500/20 animate-pulse"></span>
              <span>2차 신고</span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="h-3.5 w-3.5 rounded border border-violet-500 bg-violet-500/20 animate-pulse"></span>
              <span>정리 중</span>
            </div>
          </div>

          <div className="border border-slate-800/50 rounded-xl p-4 bg-slate-950/20">
            {/* The SeatMap goes here or is passed as children. In page.tsx, we compose them. */}
            <p className="text-xs text-indigo-400 font-semibold mb-2 flex items-center gap-1">
              <Activity className="h-3.5 w-3.5" />
              <span>좌석 도면 배치 (클릭하여 조작 가능)</span>
            </p>
            <div className="text-slate-400 text-xs">
              예약하고 싶은 빈자리를 누르거나, 자리에 없는 사용자를 신고하기 위해 이용 중인 자리를 선택하세요.
            </div>
          </div>
        </div>

        {/* Action Panel Sidebar */}
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 flex flex-col justify-between">
          <div>
            <h3 className="text-base font-semibold text-slate-200 mb-4 pb-2 border-b border-slate-800">
              좌석 상세 및 액션
            </h3>

            {selectedSeat ? (
              <div className="space-y-6">
                {/* Seat Info Card */}
                <div className="space-y-3 bg-slate-950/60 p-4 rounded-xl border border-slate-800">
                  <div className="flex justify-between items-center">
                    <span className="text-xs text-slate-500 font-mono">제1열람실</span>
                    <span className="text-sm font-bold text-slate-200">{selectedSeat.seat_number}번 좌석</span>
                  </div>

                  <div className="flex items-center justify-between text-xs py-1 border-t border-b border-slate-800/50">
                    <span className="text-slate-400">현재 상태</span>
                    <span className={`font-semibold ${
                      selectedSeat.status === "AVAILABLE" ? "text-blue-400" :
                      selectedSeat.status === "OCCUPIED" ? "text-slate-300" :
                      selectedSeat.status === "REPORTED_1ST" ? "text-amber-400" :
                      selectedSeat.status === "REPORTED_2ND" ? "text-red-400" :
                      "text-violet-400"
                    }`}>
                      {selectedSeat.status === "AVAILABLE" && "예약 가능 (AVAILABLE)"}
                      {selectedSeat.status === "OCCUPIED" && "이용 중 (OCCUPIED)"}
                      {selectedSeat.status === "REPORTED_1ST" && "1차 경고 (REPORTED_1ST)"}
                      {selectedSeat.status === "REPORTED_2ND" && "2차 신고 완료 (REPORTED_2ND)"}
                      {selectedSeat.status === "CLEARING" && "자리 정리 중 (CLEARING)"}
                    </span>
                  </div>

                  {selectedSeat.status !== "AVAILABLE" && (
                    <div className="text-[11px] text-slate-400 space-y-1">
                      <div className="flex justify-between">
                        <span>이용자:</span>
                        <span className="font-semibold text-slate-300">
                          {selectedSeat.id === userReservation?.id ? `${user.name} (나)` : selectedSeat.current_user_name || "학부생"}
                        </span>
                      </div>
                      {selectedSeat.id !== userReservation?.id && (
                        <div className="flex justify-between">
                          <span>학번 정보:</span>
                          <span className="font-mono text-slate-500">2022****</span>
                        </div>
                      )}
                    </div>
                  )}
                </div>

                {/* Actions based on seat status */}
                <div className="space-y-3">
                  {/* Option 1: Reserve the seat */}
                  {selectedSeat.status === "AVAILABLE" && (
                    <button
                      disabled={!!userReservation}
                      onClick={() => onReserve(selectedSeat.id)}
                      className={`w-full py-3 rounded-xl font-bold text-sm transition-all flex items-center justify-center gap-2 ${
                        userReservation 
                          ? "bg-slate-800 text-slate-500 border border-slate-700 cursor-not-allowed"
                          : "bg-blue-600 hover:bg-blue-500 text-slate-100 shadow-lg shadow-blue-900/20 hover:scale-[1.01] active:scale-[0.99]"
                      }`}
                    >
                      <span>{userReservation ? "이미 예약된 좌석이 있습니다" : "이 좌석 예약하기"}</span>
                    </button>
                  )}

                  {/* Option 2: Reported by user or report actions */}
                  {selectedSeat.status === "OCCUPIED" && selectedSeat.id !== userReservation?.id && (
                    <div className="space-y-2">
                      <p className="text-[11px] text-amber-500 flex items-start gap-1">
                        <AlertTriangle className="h-3.5 w-3.5 flex-shrink-0 mt-0.5" />
                        <span>좌석에 소지품만 남겨두고 장시간 자리를 비웠다면 증거 사진을 촬영해 신고할 수 있습니다.</span>
                      </p>
                      
                      <button
                        onClick={() => handleOpenReportCamera("1ST", selectedSeat.id)}
                        className="w-full py-2.5 rounded-xl bg-amber-600/10 hover:bg-amber-600 hover:text-slate-100 text-amber-400 font-semibold border border-amber-500/20 text-xs transition-all flex items-center justify-center gap-1.5"
                      >
                        <Camera className="h-4 w-4" />
                        <span>부재중 1차 신고 (현장 촬영)</span>
                      </button>
                    </div>
                  )}

                  {/* Option 3: Reported 1st - waiting for timer or 2nd report */}
                  {selectedSeat.status === "REPORTED_1ST" && selectedSeat.id !== userReservation?.id && activeReport && (
                    <div className="space-y-3 bg-slate-950/40 p-4 rounded-xl border border-amber-500/20">
                      <div className="flex items-center justify-between text-xs text-amber-400 font-medium">
                        <span className="flex items-center gap-1">
                          <Clock className="h-3.5 w-3.5" /> 1차 신고 대기 타이머:
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
                          <div className="w-full bg-slate-800 rounded-full h-1 overflow-hidden">
                            <div 
                              className="bg-amber-500 h-full rounded-full transition-all duration-1000"
                              style={{ width: `${(activeReport.warning_timer_seconds / 1800) * 100}%` }}
                            />
                          </div>
                        </div>
                      ) : (
                        <div className="space-y-2">
                          <p className="text-[11px] text-red-400 font-semibold">
                            원예약자가 30분 이내에 복귀 확인을 하지 않았습니다. 2차 최종 촬영을 통해 관리자 대시보드로 이관하십시오.
                          </p>
                          <button
                            onClick={() => handleOpenReportCamera("2ND", selectedSeat.id)}
                            className="w-full py-2.5 rounded-xl bg-red-600 hover:bg-red-500 text-slate-100 font-semibold text-xs transition-all flex items-center justify-center gap-1.5 shadow-lg shadow-red-900/30"
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
                    <div className="p-4 rounded-xl border border-red-500/20 bg-red-950/20 text-center">
                      <Lock className="h-8 w-8 text-red-500 mx-auto mb-2" />
                      <p className="text-xs font-semibold text-red-400">2차 최종 신고 완료</p>
                      <p className="text-[10px] text-slate-400 mt-1">
                        관리자 대시보드에 두 증거 사진이 이관되었습니다. 관리자의 확인 후 좌석이 강제 개방됩니다.
                      </p>
                    </div>
                  )}

                  {/* Option 5: Clearing - countdown to available */}
                  {selectedSeat.status === "CLEARING" && (
                    <div className="p-4 rounded-xl border border-violet-500/20 bg-violet-950/20 text-center">
                      <Clock className="h-8 w-8 text-violet-400 mx-auto mb-2 animate-pulse" />
                      <p className="text-xs font-semibold text-violet-400">물품 수거 및 정돈 중</p>
                      <p className="text-[10px] text-slate-400 mt-1">
                        담당자가 사재기 물품을 정리 중입니다. 10분 유예 시간이 끝나면 자동으로 빈자리가 됩니다.
                      </p>
                    </div>
                  )}

                  {/* Self operations for current occupant */}
                  {selectedSeat.id === userReservation?.id && (
                    <div className="bg-slate-950/50 p-4 rounded-xl border border-slate-800 space-y-2">
                      <p className="text-xs text-slate-400 text-center">내가 사용 중인 좌석입니다.</p>
                      {selectedSeat.status === "REPORTED_1ST" ? (
                        <button
                          onClick={onConfirmReturn}
                          className="w-full py-2.5 rounded-xl bg-amber-600 hover:bg-amber-500 text-slate-100 font-bold text-xs transition-all shadow-md shadow-amber-900/30"
                        >
                          자리 복귀 확인 (신고 리셋)
                        </button>
                      ) : (
                        <button
                          onClick={onCheckout}
                          className="w-full py-2.5 rounded-xl bg-red-600/10 hover:bg-red-600 hover:text-slate-100 text-red-400 font-semibold border border-red-500/20 text-xs transition-colors"
                        >
                          반납 및 퇴실하기
                        </button>
                      )}
                    </div>
                  )}
                </div>
              </div>
            ) : (
              <div className="h-48 flex flex-col items-center justify-center border border-dashed border-slate-800 rounded-xl p-4 text-center">
                <HelpCircle className="h-8 w-8 text-slate-600 mb-2" />
                <p className="text-xs text-slate-500">도면에서 임의의 좌석을 클릭하시면 상세 정보 및 액션 버튼이 활성화됩니다.</p>
              </div>
            )}
          </div>

          {/* Simulation controller */}
          <div className="mt-8 pt-4 border-t border-slate-800/80">
            <div className="bg-slate-950/80 p-3 rounded-lg border border-slate-800 space-y-2">
              <div className="flex items-center justify-between text-[10px] text-indigo-400 font-semibold">
                <span>🧪 테스트용 시뮬레이션 설정</span>
                <span className="bg-indigo-950 text-indigo-300 px-1 py-0.5 rounded font-mono">DEV MODE</span>
              </div>
              <label className="flex items-center space-x-2 text-xs text-slate-300 cursor-pointer">
                <input
                  type="checkbox"
                  checked={timerSpeedUp}
                  onChange={(e) => setTimerSpeedUp(e.target.checked)}
                  className="rounded border-slate-700 bg-slate-900 text-indigo-600 focus:ring-indigo-500"
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
