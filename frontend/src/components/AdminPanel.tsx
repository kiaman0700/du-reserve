"use client";

import React from "react";
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
  Camera
} from "lucide-react";

interface AdminPanelProps {
  adminUser: Profile;
  seats: Seat[];
  absenceReports: AbsenceReport[];
  onImmediateRelease: (seatId: number) => void;
  onDelayedRelease: (seatId: number) => void;
}

export default function AdminPanel({
  adminUser,
  seats,
  absenceReports,
  onImmediateRelease,
  onDelayedRelease
}: AdminPanelProps) {
  // Statistics calculations
  const totalSeats = seats.length;
  const availableSeats = seats.filter(s => s.status === "AVAILABLE").length;
  const occupiedSeats = seats.filter(s => s.status === "OCCUPIED").length;
  const warningSeats = seats.filter(s => s.status === "REPORTED_1ST").length;
  const pendingAuditSeats = seats.filter(s => s.status === "REPORTED_2ND").length;
  const clearingSeats = seats.filter(s => s.status === "CLEARING").length;

  // Filter reports that are in the 2nd stage (Audit phase)
  const auditList = seats
    .filter(s => s.status === "REPORTED_2ND")
    .map(seat => {
      const report = absenceReports.find(r => r.seat_id === seat.id);
      return {
        seat,
        report
      };
    })
    .filter(item => item.report !== undefined);

  return (
    <div className="space-y-6">
      {/* Admin Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 rounded-2xl bg-white border border-slate-200 p-6 shadow-sm">
        <div className="flex items-center space-x-4">
          <div className="rounded-full bg-emerald-50 p-3 text-emerald-600 border border-emerald-100">
            <Shield className="h-6 w-6" />
          </div>
          <div>
            <div className="flex items-center space-x-2">
              <h2 className="text-lg font-bold text-slate-800">{adminUser.name}</h2>
              <span className="rounded bg-emerald-50 border border-emerald-100 px-2.5 py-0.5 text-xs font-bold text-emerald-700 font-mono">
                도서관 관리실 (ADMIN)
              </span>
            </div>
            <p className="text-xs text-slate-500">운영자 ID: {adminUser.university_id}</p>
          </div>
        </div>

        <div className="text-xs text-slate-600 bg-slate-50 px-4 py-3 rounded-xl border border-slate-200 flex items-center gap-2 max-w-md">
          <AlertCircle className="h-4 w-4 text-emerald-600 flex-shrink-0" />
          <span>신고 2차 증빙이 완료된 좌석은 1차/2차 사진 대조 검증 후 자리 정리 여부를 결정하십시오.</span>
        </div>
      </div>

      {/* Stats Cards Row */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
        <div className="bg-white border border-slate-200 p-4 rounded-xl text-center shadow-xs">
          <p className="text-xs text-slate-500 font-medium">전체 좌석</p>
          <p className="text-2xl font-bold text-slate-850 mt-1 font-mono">{totalSeats}</p>
        </div>
        <div className="bg-white border border-slate-200 p-4 rounded-xl text-center shadow-xs">
          <p className="text-xs text-emerald-600 font-medium">예약 가능</p>
          <p className="text-2xl font-bold text-emerald-600 mt-1 font-mono">{availableSeats}</p>
        </div>
        <div className="bg-white border border-slate-200 p-4 rounded-xl text-center shadow-xs">
          <p className="text-xs text-slate-500 font-medium">이용 중</p>
          <p className="text-2xl font-bold text-slate-700 mt-1 font-mono">{occupiedSeats}</p>
        </div>
        <div className="bg-white border border-slate-200 p-4 rounded-xl text-center shadow-xs border-l-4 border-l-red-500">
          <p className="text-xs text-red-500 font-medium">검증 대기</p>
          <p className="text-2xl font-bold text-red-500 mt-1 font-mono animate-pulse">{pendingAuditSeats}</p>
        </div>
        <div className="bg-white border border-slate-200 p-4 rounded-xl text-center shadow-xs">
          <p className="text-xs text-purple-600 font-medium">수거/정리 중</p>
          <p className="text-2xl font-bold text-purple-600 mt-1 font-mono">{clearingSeats}</p>
        </div>
      </div>

      {/* Audit queue and dashboard */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left column: Audit Queue */}
        <div className="lg:col-span-2 space-y-6">
          <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm">
            <div className="flex items-center justify-between mb-4 border-b border-slate-150 pb-3">
              <h3 className="text-base font-bold text-slate-800 flex items-center gap-2">
                <AlertOctagon className="h-5 w-5 text-red-550 animate-pulse" />
                <span>2차 증빙 현장 대조 심사 ({auditList.length}건)</span>
              </h3>
              <span className="text-[10px] bg-red-50 text-red-650 px-2 py-0.5 rounded border border-red-200 font-bold font-mono">
                FINAL AUDIT
              </span>
            </div>

            {auditList.length > 0 ? (
              <div className="space-y-6 divide-y divide-slate-150">
                {auditList.map(({ seat, report }, index) => {
                  if (!report) return null;
                  return (
                    <div key={seat.id} className="pt-6 first:pt-0 space-y-4">
                      {/* Meta header of report */}
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                        <div>
                          <span className="text-sm font-bold text-slate-800">
                            좌석 {String(seat.seat_number).padStart(2, "0")} ({seat.room_name})
                          </span>
                          <span className="ml-2 text-xs text-slate-500">
                            기존 이용자: {seat.current_user_name || "학부생"} ({seat.current_user_id ? "2022043" : "Unknown"})
                          </span>
                        </div>
                        <div className="text-[11px] text-slate-500 flex gap-2">
                          <span>신고자 ID: 2021008</span>
                          <span>|</span>
                          <span>1차 신고: {new Date(report.first_reported_at).toLocaleTimeString()}</span>
                        </div>
                      </div>

                      {/* Photo comparison box */}
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        {/* Photo 1 */}
                        <div className="space-y-1.5">
                          <div className="flex items-center justify-between text-[11px]">
                            <span className="text-amber-600 font-bold flex items-center gap-1">
                              <Camera className="h-3 w-3 text-amber-500" /> 1차 신고 사진 (30분 전)
                            </span>
                            <span className="text-slate-400 font-mono">
                              {new Date(report.first_reported_at).toLocaleTimeString()}
                            </span>
                          </div>
                          <div className="relative aspect-video rounded-lg overflow-hidden border border-slate-200 bg-slate-100">
                            <img 
                              src={report.first_photo_url} 
                              alt="First verification" 
                              className="w-full h-full object-cover" 
                            />
                            <div className="absolute inset-0 bg-gradient-to-t from-slate-900/50 via-transparent to-transparent flex items-end p-2">
                              <span className="text-[9px] text-amber-300 font-mono">신고 증거 1</span>
                            </div>
                          </div>
                        </div>

                        {/* Photo 2 */}
                        <div className="space-y-1.5">
                          <div className="flex items-center justify-between text-[11px]">
                            <span className="text-red-600 font-bold flex items-center gap-1">
                              <Camera className="h-3 w-3 text-red-500" /> 2차 신고 사진 (최종)
                            </span>
                            <span className="text-slate-400 font-mono">
                              {report.second_reported_at ? new Date(report.second_reported_at).toLocaleTimeString() : "시간 경과 수집"}
                            </span>
                          </div>
                          <div className="relative aspect-video rounded-lg overflow-hidden border border-slate-200 bg-slate-100">
                            {report.second_photo_url ? (
                              <img 
                                src={report.second_photo_url} 
                                        alt="Second verification" 
                                className="w-full h-full object-cover" 
                              />
                            ) : (
                              <div className="w-full h-full flex flex-col items-center justify-center text-slate-400 bg-slate-50">
                                <HelpCircle className="h-8 w-8 text-slate-300" />
                                <span className="text-[10px]">사진 데이터 오류</span>
                              </div>
                            )}
                            <div className="absolute inset-0 bg-gradient-to-t from-slate-900/50 via-transparent to-transparent flex items-end p-2">
                              <span className="text-[9px] text-red-300 font-mono">신고 증거 2</span>
                            </div>
                          </div>
                        </div>
                      </div>

                      {/* Admin Decisions */}
                      <div className="flex flex-col sm:flex-row items-center gap-3 bg-slate-50 p-4 rounded-xl border border-slate-200 justify-between">
                        <div className="text-[11px] text-slate-500 text-center sm:text-left leading-normal max-w-md">
                          <span className="font-bold text-slate-700">💡 이원화 개방 선택 가이드:</span><br />
                          현장에 개인 물품이 방치되어 있어 수거 작업이 필요하다면 <strong className="text-purple-650">지연 자동 개방</strong>을, 
                          자리가 이미 깨끗하거나 즉각 이용 가능하게 비우려면 <strong className="text-emerald-700">즉시 수동 개방</strong>을 선택하세요.
                        </div>
                        
                        <div className="flex gap-2 w-full sm:w-auto">
                          {/* Option 1: Delayed release */}
                          <button
                            onClick={() => onDelayedRelease(seat.id)}
                            className="flex-1 sm:flex-none flex items-center justify-center gap-1 bg-purple-600 hover:bg-purple-500 text-white px-4 py-2 rounded-lg font-bold text-xs transition-all hover:scale-[1.02] active:scale-[0.98] cursor-pointer shadow-xs"
                            title="10분 타이머 가동 후 AVAILABLE 자동 전환"
                          >
                            <Clock className="h-3.5 w-3.5" />
                            <span>물품 수거 및 정리</span>
                          </button>

                          {/* Option 2: Immediate release */}
                          <button
                            onClick={() => onImmediateRelease(seat.id)}
                            className="flex-1 sm:flex-none flex items-center justify-center gap-1 bg-emerald-650 hover:bg-emerald-500 text-white px-4 py-2 rounded-lg font-bold text-xs transition-all hover:scale-[1.02] active:scale-[0.98] cursor-pointer shadow-xs"
                            title="즉시 AVAILABLE (빈자리) 상태로 전환"
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
              <div className="py-12 text-center border border-dashed border-slate-250 rounded-xl bg-slate-50/50">
                <CheckCircle className="h-10 w-10 text-slate-350 mx-auto mb-2" />
                <p className="text-sm font-semibold text-slate-500">현재 대기 중인 2차 신고 검증 건이 없습니다.</p>
                <p className="text-xs text-slate-400 mt-1">학생들이 2차 신고를 접수하면 타임라인에 실시간으로 반영됩니다.</p>
              </div>
            )}
          </div>
        </div>

        {/* Right column: System Log / Control status info */}
        <div className="space-y-6">
          {/* Readonly Seat status monitor */}
          <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm">
            <h3 className="text-sm font-bold text-slate-800 mb-3 uppercase tracking-wider">관제 좌석 요약도</h3>
            <div className="grid grid-cols-4 gap-2">
              {seats.map(seat => {
                let colorClass = "bg-slate-100 border-slate-200 text-slate-400";
                if (seat.status === "AVAILABLE") colorClass = "bg-emerald-50 border-emerald-200 text-emerald-700";
                if (seat.status === "OCCUPIED") colorClass = "bg-slate-100 border-slate-200 text-slate-650";
                if (seat.status === "REPORTED_1ST") colorClass = "bg-amber-50 border-amber-300 text-amber-600 animate-pulse";
                if (seat.status === "REPORTED_2ND") colorClass = "bg-red-50 border-red-300 text-red-650 animate-pulse";
                if (seat.status === "CLEARING") colorClass = "bg-purple-50 border-purple-300 text-purple-650 animate-pulse";

                return (
                  <div 
                    key={seat.id} 
                    className={`border text-[10px] py-2 rounded text-center font-mono font-bold ${colorClass}`}
                    title={`${seat.seat_number}번 - ${seat.status}`}
                  >
                    {String(seat.seat_number).padStart(2, "0")}
                  </div>
                );
              })}
            </div>
          </div>

          {/* Admin Policy Board */}
          <div className="bg-white border border-slate-200 rounded-2xl p-6 space-y-4 shadow-sm">
            <h3 className="text-sm font-bold text-slate-800 uppercase tracking-wider pb-2 border-b border-slate-150">
              🚨 운영 관리 수칙 (R&R)
            </h3>
            <div className="space-y-3 text-xs text-slate-500 leading-relaxed">
              <div className="space-y-1">
                <p className="font-bold text-slate-700">1. 악의적 갤러리 합성 신고 차단</p>
                <p>시스템은 파일 업로드 방식이 아닌 HTML5 API 카메라 촬영만을 고집하여 허위 사진 합성을 통한 자리 뺏기 공격을 차단합니다.</p>
              </div>
              <div className="space-y-1">
                <p className="font-bold text-slate-700">2. 이원화 개방의 타임아웃</p>
                <p>[물품 수거 및 자리 정리] 선택 시, 10분 타이머가 시작되며 자리 상태는 보라색(CLEARING)으로 변경됩니다. 이 10분간은 타 학생이 좌석을 예약할 수 없어 정리 시간 확보에 용이합니다.</p>
              </div>
              <div className="space-y-1">
                <p className="font-bold text-slate-700">3. 강제 퇴실 사후 팝업 통제</p>
                <p>관리자가 승인하여 강제 퇴실된 사용자는 재로그인 시 알림 팝업이 노출되며, 안내 데스크로 방치 물품을 회수하러 와야 함을 명시합니다.</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
