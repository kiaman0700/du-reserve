"use client";

import React, { useState, useEffect, useRef } from "react";
import { 
  Building2, 
  ShieldCheck, 
  GraduationCap, 
  HelpCircle, 
  CheckCircle2, 
  AlertTriangle,
  FileText,
  Clock,
  Lock
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

// Initial Mock Seats (24 Seats in total)
const INITIAL_SEATS: Seat[] = Array.from({ length: 24 }, (_, i) => {
  const seatNumber = i + 1;
  
  // Set some initial states to make it feel alive and testable immediately
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
      clearing_timer_seconds: 480 // 8 minutes left
    };
  }

  return {
    id: seatNumber,
    seat_number: seatNumber,
    room_name: "제1열람실",
    status: "AVAILABLE"
  };
});

// 백엔드 Express API 서버의 기본 URL
const API_BASE_URL = "http://localhost:5000";

export default function Page() {
  // Global State
  const [perspective, setPerspective] = useState<"STUDENT" | "ADMIN">("STUDENT");
  const [seats, setSeats] = useState<Seat[]>([]);
  const [absenceReports, setAbsenceReports] = useState<AbsenceReport[]>([]);
  const [selectedSeat, setSelectedSeat] = useState<Seat | null>(null);
  
  // Timer speedup state (60x speed for testing)
  const [timerSpeedUp, setTimerSpeedUp] = useState<boolean>(true);
  
  // Logged in Mock users
  const studentUser: Profile = {
    id: "6ca7d934-8c8f-4a0b-8d5c-9cfaecb0d912", // Supabase UUID 포맷 예시
    university_id: "20222043",
    name: "강민성 (전자공학과)",
    role: "USER"
  };

  const adminUser: Profile = {
    id: "a3b2c1d0-1234-5678-9abc-def012345678", // Supabase UUID 포맷 예시
    university_id: "ADM-9942",
    name: "이영희 사서관",
    role: "ADMIN"
  };

  // Track forced checkout notification
  const [forcedCheckoutAlert, setForcedCheckoutAlert] = useState<{
    show: boolean;
    seatNumber: number;
  }>({ show: false, seatNumber: 0 });

  // Get active reservation for the logged in student
  const myReservation = seats.find(s => s.current_user_id === studentUser.id) || null;

  // Active warning modal trigger (if my reserved seat goes into REPORTED_1ST)
  const [showWarningModal, setShowWarningModal] = useState<boolean>(false);

  // 1. 백엔드 API로부터 최신 상태 정보(좌석 현황 및 신고 내역)를 조회하는 함수
  const fetchData = async () => {
    try {
      const res = await fetch(`${API_BASE_URL}/api/seats`);
      if (!res.ok) throw new Error("서버 에러 발생");
      const data = await res.json();
      setSeats(data.seats || []);
      setAbsenceReports(data.absenceReports || []);
    } catch (err) {
      console.error("데이터 로드 실패:", err);
    }
  };

  // 컴포넌트 마운트 시 및 3초 간격 주기적 폴링(실시간 동기화)
  useEffect(() => {
    fetchData(); // 최초 로드
    const pollInterval = setInterval(fetchData, 3000);
    return () => clearInterval(pollInterval);
  }, []);

  // Monitor my seat status changes for warning popup
  useEffect(() => {
    if (myReservation && myReservation.status === "REPORTED_1ST") {
      setShowWarningModal(true);
    } else {
      setShowWarningModal(false);
    }
  }, [myReservation?.status]);

  // Timers management effect (1-second tick handler)
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

      // 2. Tick Clearing seat timers
      setSeats((prevSeats) =>
        prevSeats.map((seat) => {
          if (seat.status === "CLEARING" && seat.clearing_timer_seconds !== undefined) {
            const decrement = timerSpeedUp ? 60 : 1;
            const newSeconds = Math.max(0, seat.clearing_timer_seconds - decrement);
            
            if (newSeconds === 0) {
              // 타이머 만료 시 즉시 개방 완료를 위해 백엔드에 자동 요청 트리거
              handleClearComplete(seat.id);
            }
            return {
              ...seat,
              clearing_timer_seconds: newSeconds
            };
          }
          return seat;
        })
      );
    }, 1000);

    return () => clearInterval(interval);
  }, [timerSpeedUp]);

  // Update selected seat details whenever seats list changes
  useEffect(() => {
    if (selectedSeat) {
      const updated = seats.find(s => s.id === selectedSeat.id);
      if (updated) setSelectedSeat(updated);
    }
  }, [seats]);

  // 10분 정리 시간이 끝났거나 사서가 수동으로 비우는 헬퍼 함수
  const handleClearComplete = async (seatId: number) => {
    try {
      await fetch(`${API_BASE_URL}/api/absence-reports/clear-complete`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ seatId })
      });
      fetchData();
    } catch (err) {
      console.error("정리 완료 에러:", err);
    }
  };

  // Student Actions: Book Seat
  const handleReserveSeat = async (seatId: number) => {
    try {
      const res = await fetch(`${API_BASE_URL}/api/reservations`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ seatId, userId: studentUser.id })
      });
      const data = await res.json();
      if (!res.ok) {
        alert(data.message || "예약에 실패했습니다.");
        return;
      }
      fetchData();
    } catch (err) {
      console.error("예약 에러:", err);
    }
  };

  // Student Actions: Checkout/Release Seat
  const handleCheckoutSeat = async () => {
    if (!myReservation) return;
    try {
      const res = await fetch(`${API_BASE_URL}/api/reservations/checkout`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ seatId: myReservation.id, userId: studentUser.id })
      });
      const data = await res.json();
      if (!res.ok) {
        alert(data.message || "반납에 실패했습니다.");
        return;
      }
      setShowWarningModal(false);
      fetchData();
    } catch (err) {
      console.error("반납 에러:", err);
    }
  };

  // Student Actions: Confirm Return (Resets warning)
  const handleConfirmReturn = async () => {
    if (!myReservation) return;
    try {
      const res = await fetch(`${API_BASE_URL}/api/absence-reports/return`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ seatId: myReservation.id, userId: studentUser.id })
      });
      const data = await res.json();
      if (!res.ok) {
        alert(data.message || "복귀 확인 실패");
        return;
      }
      setShowWarningModal(false);
      fetchData();
    } catch (err) {
      console.error("복귀 처리 에러:", err);
    }
  };

  // Student Actions: 1st Absence Report (Uploads 1st photo)
  const handleReportAbsence1st = async (seatId: number, photoUrl: string) => {
    try {
      const res = await fetch(`${API_BASE_URL}/api/absence-reports/1st`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          seatId,
          reporterId: studentUser.id,
          firstPhotoBase64: photoUrl
        })
      });
      const data = await res.json();
      if (!res.ok) {
        alert(data.message || "1차 신고 실패");
        return;
      }
      fetchData();
    } catch (err) {
      console.error("1차 신고 에러:", err);
    }
  };

  // Student Actions: 2nd Absence Report (Uploads 2nd photo after 30 mins)
  const handleReportAbsence2nd = async (seatId: number, photoUrl: string) => {
    try {
      const res = await fetch(`${API_BASE_URL}/api/absence-reports/2nd`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          seatId,
          secondPhotoBase64: photoUrl
        })
      });
      const data = await res.json();
      if (!res.ok) {
        alert(data.message || "2차 신고 실패");
        return;
      }
      fetchData();
    } catch (err) {
      console.error("2차 신고 에러:", err);
    }
  };

  // Admin Actions: Immediate release (즉시 빈자리 전환)
  const handleImmediateRelease = async (seatId: number) => {
    const seat = seats.find(s => s.id === seatId);
    if (!seat) return;

    if (seat.current_user_id === studentUser.id) {
      setForcedCheckoutAlert({ show: true, seatNumber: seat.seat_number });
    }

    try {
      // 1) 강제 퇴실 처리 (CLEARING으로 변환)
      await fetch(`${API_BASE_URL}/api/absence-reports/release`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ seatId })
      });
      
      // 2) 즉시 AVAILABLE로 강제 개방 완료 처리
      await handleClearComplete(seatId);
    } catch (err) {
      console.error("즉시 개방 에러:", err);
    }
  };

  // Admin Actions: Delayed release (물품 수거 및 자리 정리 - 10분 타이머)
  const handleDelayedRelease = async (seatId: number) => {
    const seat = seats.find(s => s.id === seatId);
    if (!seat) return;

    if (seat.current_user_id === studentUser.id) {
      setForcedCheckoutAlert({ show: true, seatNumber: seat.seat_number });
    }

    try {
      await fetch(`${API_BASE_URL}/api/absence-reports/release`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ seatId })
      });
      fetchData();
    } catch (err) {
      console.error("정리 개방 에러:", err);
    }
  };

  // Find active warnings for the student
  const activeStudentWarning = myReservation && myReservation.status === "REPORTED_1ST"
    ? absenceReports.find(r => r.seat_id === myReservation.id && r.status === "PENDING")
    : null;

  return (
    <div className="flex-grow flex flex-col min-h-screen bg-slate-950 text-slate-100 pb-16">
      {/* Top Navbar */}
      <header className="sticky top-0 z-40 bg-slate-900/80 border-b border-slate-800 backdrop-blur-md">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="bg-indigo-600 p-2 rounded-xl text-slate-100 flex items-center justify-center shadow-lg shadow-indigo-900/30">
              <Building2 className="h-6 w-6" />
            </div>
            <div>
              <h1 className="text-base sm:text-lg font-bold tracking-tight text-slate-100">Du-Reserve</h1>
              <p className="text-[10px] text-indigo-400 font-medium uppercase tracking-widest leading-none">대구대 스마트 열람실</p>
            </div>
          </div>

          {/* Perspective switcher tab */}
          <div className="flex bg-slate-950 p-1 rounded-xl border border-slate-800">
            <button
              onClick={() => {
                setPerspective("STUDENT");
                setSelectedSeat(null);
              }}
              className={`flex items-center space-x-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                perspective === "STUDENT"
                  ? "bg-indigo-600 text-slate-100 shadow-md shadow-indigo-950"
                  : "text-slate-400 hover:text-slate-200"
              }`}
            >
              <GraduationCap className="h-3.5 w-3.5" />
              <span>학생 화면</span>
            </button>
            <button
              onClick={() => {
                setPerspective("ADMIN");
                setSelectedSeat(null);
              }}
              className={`flex items-center space-x-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                perspective === "ADMIN"
                  ? "bg-violet-600 text-slate-100 shadow-md shadow-violet-950"
                  : "text-slate-400 hover:text-slate-200"
              }`}
            >
              <ShieldCheck className="h-3.5 w-3.5" />
              <span>관리자 화면</span>
            </button>
          </div>
        </div>
      </header>

      {/* Main container */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 mt-8 flex-grow w-full">
        {/* Banner info */}
        <div className="mb-6 flex flex-col md:flex-row justify-between items-start md:items-center gap-4 bg-gradient-to-r from-indigo-900/15 via-violet-950/10 to-transparent border border-indigo-500/10 rounded-2xl p-6">
          <div className="space-y-1">
            <h2 className="text-lg font-bold text-slate-200">
              {perspective === "STUDENT" 
                ? "학생 포털 예약 데스크" 
                : "도서관 중앙 시설물 관제센터"}
            </h2>
            <p className="text-xs text-slate-400 max-w-2xl leading-normal">
              {perspective === "STUDENT"
                ? "빈자리를 직접 예약하고 이용할 수 있습니다. 소지품만 두고 장시간 비워진 자리는 2단계 부재 사진 인증을 통해 신고하여 건전한 면학 환경을 만드십시오."
                : "실시간 접수된 장기 미사용 신고 현황을 대조 검증하고, 상황에 따른 이원화 개방(정리 후 10분 뒤 개방 / 즉시 강제 개방) 명령을 내립니다."}
            </p>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-[10px] bg-slate-900 text-slate-400 border border-slate-800 rounded px-2.5 py-1 flex items-center gap-1 font-mono">
              <FileText className="h-3 w-3 text-indigo-400" />
              <span>Phase 1 (스마트 열람실)</span>
            </span>
          </div>
        </div>

        {/* Dynamic components */}
        {perspective === "STUDENT" ? (
          <div className="space-y-8">
            <UserDashboard
              user={studentUser}
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
            />

            <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6">
              <SeatMap
                seats={seats}
                onSelectSeat={setSelectedSeat}
                selectedSeatId={selectedSeat?.id || null}
                userReservationSeatId={myReservation?.id || null}
              />
            </div>
          </div>
        ) : (
          <div className="space-y-8">
            <AdminPanel
              adminUser={adminUser}
              seats={seats}
              absenceReports={absenceReports}
              onImmediateRelease={handleImmediateRelease}
              onDelayedRelease={handleDelayedRelease}
            />
          </div>
        )}
      </main>

      {/* Footer */}
      <footer className="mt-16 border-t border-slate-900 py-6 text-center text-xs text-slate-500">
        <div className="max-w-7xl mx-auto px-4 flex flex-col sm:flex-row items-center justify-between gap-4">
          <p>© 2026 Daegu University. Smart Facility Reservation System. All rights reserved.</p>
          <div className="flex items-center space-x-4">
            <span className="flex items-center gap-1 text-[11px] text-slate-400">
              <svg className="h-3.5 w-3.5 text-slate-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M15 22v-4a4.8 4.8 0 0 0-1-3.5c3 0 6-2 6-5.5.08-1.25-.27-2.48-1-3.5.28-1.15.28-2.35 0-3.5 0 0-1 0-3 1.5-2.64-.5-5.36-.5-8 0C6 2 5 2 5 2c-.3 1.15-.3 2.35 0 3.5A5.403 5.403 0 0 0 4 9c0 3.5 3 5.5 6 5.5-.39.49-.68 1.05-.85 1.65-.17.6-.22 1.23-.15 1.85v4" /><path d="M9 18c-4.51 2-5-2-7-2" /></svg>
              <span>kiaman0700/du-reserve</span>
            </span>
          </div>
        </div>
      </footer>

      {/* REQ-03-02: Realtime warning alert popup for original user */}
      {showWarningModal && activeStudentWarning && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 p-4 backdrop-blur-md">
          <div className="w-full max-w-md overflow-hidden rounded-2xl border border-amber-500/30 bg-slate-900 shadow-2xl animate-bounce-short">
            <div className="bg-amber-500/10 border-b border-amber-500/20 px-6 py-4 flex items-center gap-3 text-amber-500">
              <AlertTriangle className="h-6 w-6 animate-pulse" />
              <h3 className="font-bold text-slate-100">장기 부재 경고 안내 (1차 접수)</h3>
            </div>
            
            <div className="p-6 space-y-4">
              <div className="bg-amber-500/5 border border-amber-500/20 p-4 rounded-xl text-xs text-amber-200 leading-relaxed font-semibold">
                ⚠️ 장기 부재 신고가 접수되었습니다. 30분 이내에 좌석으로 복귀하여 [복귀 확인] 버튼을 누르지 않으면 담당자에 의해 강제 퇴실 조치 및 좌석이 초기화될 수 있습니다.
              </div>

              <div className="flex items-center justify-between bg-slate-950/60 p-3 rounded-lg border border-slate-800 text-xs">
                <span className="text-slate-400 flex items-center gap-1">
                  <Clock className="h-3.5 w-3.5 text-amber-500" /> 복귀 유예 남은 시간:
                </span>
                <span className="font-mono text-sm font-bold text-amber-400">
                  {activeStudentWarning.warning_timer_seconds !== undefined && activeStudentWarning.warning_timer_seconds > 0 ? (
                    `${Math.floor(activeStudentWarning.warning_timer_seconds / 60)}분 ${activeStudentWarning.warning_timer_seconds % 60}초`
                  ) : (
                    "시간 초과! 2차 최종 촬영 접수 대기 상태"
                  )}
                </span>
              </div>
            </div>

            <div className="bg-slate-950 px-6 py-4 flex justify-end">
              <button
                onClick={handleConfirmReturn}
                className="bg-amber-600 hover:bg-amber-500 text-slate-100 px-5 py-2 rounded-xl text-sm font-bold shadow-lg shadow-amber-900/30 transition-all active:scale-95"
              >
                자리 복귀 확인 (신고 리셋)
              </button>
            </div>
          </div>
        </div>
      )}

      {/* REQ-04-03: Post forced checkout popup notice */}
      {forcedCheckoutAlert.show && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 p-4 backdrop-blur-md animate-fade-in">
          <div className="w-full max-w-md overflow-hidden rounded-2xl border border-red-500/30 bg-slate-900 shadow-2xl">
            <div className="bg-red-500/10 border-b border-red-500/20 px-6 py-4 flex items-center gap-3 text-red-500">
              <AlertTriangle className="h-6 w-6 animate-pulse" />
              <h3 className="font-bold text-slate-100">좌석 강제 퇴실 처분 고지</h3>
            </div>
            
            <div className="p-6 space-y-3">
              <p className="text-sm font-bold text-slate-200">
                대상: {forcedCheckoutAlert.seatNumber}번 좌석
              </p>
              <div className="bg-red-500/5 border border-red-500/20 p-4 rounded-xl text-xs text-red-200 leading-relaxed font-semibold">
                🚨 장기 부재 신고 누적으로 인해 해당 좌석이 강제 퇴실 처리되었습니다. 방치되어 있던 개인 물품은 현장 점검 후 [도서관 1층 안내 데스크 / 관리실]로 이동 보관되었습니다. 물품을 찾으러 해당 장소로 방문해 주시기 바랍니다.
              </div>
            </div>

            <div className="bg-slate-950 px-6 py-4 flex justify-end">
              <button
                onClick={() => setForcedCheckoutAlert({ show: false, seatNumber: 0 })}
                className="bg-red-600 hover:bg-red-500 text-slate-100 px-5 py-2 rounded-xl text-sm font-semibold shadow-lg shadow-red-900/30 transition-all active:scale-95"
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
