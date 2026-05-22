"use client";

import React from "react";
import { Seat, SeatStatus } from "@/app/page";
import { Check, ShieldAlert, Sparkles, Clock, Trash2 } from "lucide-react";

interface SeatMapProps {
  seats: Seat[];
  onSelectSeat: (seat: Seat) => void;
  selectedSeatId: number | null;
  userReservationSeatId: number | null;
}

const statusColors: Record<SeatStatus, { bg: string; text: string; label: string; border: string }> = {
  AVAILABLE: {
    bg: "bg-blue-950/40 hover:bg-blue-900/40",
    border: "border-blue-500/30 hover:border-blue-400/80 shadow-[0_0_8px_rgba(59,130,246,0.1)]",
    text: "text-blue-400",
    label: "빈자리"
  },
  OCCUPIED: {
    bg: "bg-slate-800/80 hover:bg-slate-700/80",
    border: "border-slate-700 hover:border-slate-500",
    text: "text-slate-300",
    label: "이용 중"
  },
  REPORTED_1ST: {
    bg: "animate-flash-amber",
    border: "border-amber-500/80 shadow-[0_0_12px_rgba(245,158,11,0.3)]",
    text: "text-amber-400 font-medium",
    label: "1차 경고"
  },
  REPORTED_2ND: {
    bg: "animate-flash-red",
    border: "border-red-500 shadow-[0_0_16px_rgba(239,68,68,0.4)]",
    text: "text-red-400 font-bold",
    label: "2차 신고"
  },
  CLEARING: {
    bg: "animate-pulse-purple",
    border: "border-violet-500/80 shadow-[0_0_12px_rgba(139,92,246,0.3)]",
    text: "text-violet-400 font-medium",
    label: "정리 중"
  }
};

export default function SeatMap({ seats, onSelectSeat, selectedSeatId, userReservationSeatId }: SeatMapProps) {
  // We can group seats into groups to represent different blocks/desks for visual flair
  const midPoint = Math.ceil(seats.length / 2);
  const blockA = seats.slice(0, midPoint);
  const blockB = seats.slice(midPoint);

  const renderSeat = (seat: Seat) => {
    const isSelected = selectedSeatId === seat.id;
    const isMySeat = userReservationSeatId === seat.id;
    const colors = statusColors[seat.status];

    return (
      <button
        key={seat.id}
        onClick={() => onSelectSeat(seat)}
        className={`relative flex flex-col justify-between rounded-xl border p-3 text-left transition-all h-[95px] w-full ${
          isSelected 
            ? "ring-2 ring-indigo-500 border-indigo-400 bg-slate-800 scale-[1.03] shadow-[0_0_16px_rgba(99,102,241,0.3)]" 
            : `${colors.bg} ${colors.border}`
        } duration-200 cursor-pointer`}
      >
        {/* Seat Badge & Number */}
        <div className="flex w-full items-center justify-between">
          <span className="font-mono text-xs text-slate-400">Seat {String(seat.seat_number).padStart(2, "0")}</span>
          
          {isMySeat ? (
            <span className="flex h-5 items-center gap-1 rounded bg-indigo-500/20 px-1.5 py-0.5 text-[10px] font-bold text-indigo-400 border border-indigo-500/30">
              내 자리
            </span>
          ) : (
            <span className={`text-[10px] font-semibold px-1 rounded-sm bg-slate-950/40 ${colors.text}`}>
              {colors.label}
            </span>
          )}
        </div>

        {/* Seat Status Graphic / Timer */}
        <div className="mt-2 flex flex-col justify-end flex-grow">
          {seat.status === "CLEARING" && seat.clearing_timer_seconds !== undefined && (
            <div className="space-y-1">
              <div className="flex items-center gap-1 text-[10px] text-violet-400">
                <Clock className="h-3 w-3 animate-spin" />
                <span>{Math.floor(seat.clearing_timer_seconds / 60)}분 {seat.clearing_timer_seconds % 60}초</span>
              </div>
              <div className="w-full bg-slate-950/40 rounded-full h-1 overflow-hidden">
                <div 
                  className="bg-violet-500 h-full rounded-full transition-all duration-1000"
                  style={{ width: `${(seat.clearing_timer_seconds / 600) * 100}%` }}
                />
              </div>
            </div>
          )}

          {seat.status === "REPORTED_1ST" && (
            <div className="flex items-center gap-1 text-[10px] text-amber-400">
              <ShieldAlert className="h-3 w-3" />
              <span className="font-mono">부재중 신고됨</span>
            </div>
          )}

          {seat.status === "REPORTED_2ND" && (
            <div className="flex items-center gap-1 text-[10px] text-red-400 animate-pulse">
              <Trash2 className="h-3 w-3" />
              <span>강제 퇴실 대기</span>
            </div>
          )}

          {seat.status === "OCCUPIED" && (
            <span className="text-[11px] text-slate-400 truncate max-w-[100px]">
              {seat.current_user_name || "이용 중"}
            </span>
          )}

          {seat.status === "AVAILABLE" && (
            <div className="flex items-center gap-1 text-[10px] text-blue-400">
              <Sparkles className="h-3 w-3 text-blue-500/80" />
              <span>예약 가능</span>
            </div>
          )}
        </div>
      </button>
    );
  };

  return (
    <div className="space-y-6">
      {/* Visual Desk Layout */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        {/* Left Block */}
        <div className="space-y-3">
          <h4 className="text-xs font-semibold text-slate-400 uppercase tracking-wider pl-1 border-l-2 border-indigo-500">
            A 구역 (창가 좌석)
          </h4>
          <div className="grid grid-cols-3 gap-3">
            {blockA.map(renderSeat)}
          </div>
        </div>

        {/* Right Block */}
        <div className="space-y-3">
          <h4 className="text-xs font-semibold text-slate-400 uppercase tracking-wider pl-1 border-l-2 border-emerald-500">
            B 구역 (내측 좌석)
          </h4>
          <div className="grid grid-cols-3 gap-3">
            {blockB.map(renderSeat)}
          </div>
        </div>
      </div>

      {/* Screen / Blackboard Sign */}
      <div className="w-full py-2 bg-slate-900 border border-slate-800 rounded-lg text-center text-slate-500 text-xs font-medium tracking-widest uppercase">
        도서관 입구 & 대시보드 스크린 방향
      </div>
    </div>
  );
}
