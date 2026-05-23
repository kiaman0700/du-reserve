"use client";

import React from "react";
import { Seat, SeatStatus } from "@/app/page";
import { Check, ShieldAlert, Sparkles, Clock, Trash2 } from "lucide-react";

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

interface SeatMapProps {
  seats: Seat[];
  onSelectSeat: (seat: Seat) => void;
  selectedSeatId: number | null;
  userReservationSeatId: number | null;
  selectedFacility: Facility | null;
}

const statusColors: Record<SeatStatus, { bg: string; text: string; label: string; border: string }> = {
  AVAILABLE: {
    bg: "bg-emerald-50/30 hover:bg-emerald-50/70",
    border: "border-emerald-200 hover:border-emerald-400 shadow-xs",
    text: "text-emerald-700 font-bold",
    label: "예약 가능"
  },
  OCCUPIED: {
    bg: "bg-slate-50 hover:bg-slate-100",
    border: "border-slate-200 hover:border-slate-350",
    text: "text-slate-500",
    label: "이용 중"
  },
  REPORTED_1ST: {
    bg: "animate-flash-amber",
    border: "border-amber-400 shadow-xs",
    text: "text-amber-700 font-bold",
    label: "1차 경고"
  },
  REPORTED_2ND: {
    bg: "animate-flash-red",
    border: "border-red-400 shadow-xs",
    text: "text-red-650 font-bold",
    label: "2차 신고"
  },
  CLEARING: {
    bg: "animate-pulse-purple",
    border: "border-purple-300 shadow-xs",
    text: "text-purple-700 font-bold",
    label: "정리 중"
  }
};

export default function SeatMap({ 
  seats, 
  onSelectSeat, 
  selectedSeatId, 
  userReservationSeatId,
  selectedFacility
}: SeatMapProps) {
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
        className={`relative flex flex-col justify-between rounded-xl border p-3 text-left transition-all h-[95px] w-full cursor-pointer ${
          isSelected 
            ? "ring-2 ring-emerald-600 border-emerald-500 bg-white scale-[1.03] shadow-md" 
            : `${colors.bg} ${colors.border}`
        } duration-200`}
      >
        {/* Seat Badge & Number */}
        <div className="flex w-full items-center justify-between">
          <span className="font-mono text-[10px] text-slate-500">Seat {String(seat.seat_number).padStart(2, "0")}</span>
          
          {isMySeat ? (
            <span className="flex h-5 items-center gap-1 rounded bg-emerald-600 px-1.5 py-0.5 text-[9px] font-bold text-white shadow-xs">
              내 자리
            </span>
          ) : (
            <span className={`text-[9px] font-bold px-1 py-0.5 rounded-sm bg-white/80 border border-slate-100/50 ${colors.text}`}>
              {colors.label}
            </span>
          )}
        </div>

        {/* Seat Status Graphic / Timer */}
        <div className="mt-2 flex flex-col justify-end flex-grow">
          {seat.status === "CLEARING" && seat.clearing_timer_seconds !== undefined && (
            <div className="space-y-1">
              <div className="flex items-center gap-1 text-[10px] text-purple-700 font-bold">
                <Clock className="h-3 w-3 animate-spin" />
                <span>{Math.floor(seat.clearing_timer_seconds / 60)}분 {seat.clearing_timer_seconds % 60}초</span>
              </div>
              <div className="w-full bg-slate-200 rounded-full h-1 overflow-hidden">
                <div 
                  className="bg-purple-500 h-full rounded-full transition-all duration-1000"
                  style={{ width: `${(seat.clearing_timer_seconds / 600) * 100}%` }}
                />
              </div>
            </div>
          )}

          {seat.status === "REPORTED_1ST" && (
            <div className="flex items-center gap-1 text-[10px] text-amber-700 font-bold">
              <ShieldAlert className="h-3 w-3 text-amber-500" />
              <span className="font-mono text-[9px]">부재중 신고됨</span>
            </div>
          )}

          {seat.status === "REPORTED_2ND" && (
            <div className="flex items-center gap-1 text-[10px] text-red-650 font-bold animate-pulse">
              <Trash2 className="h-3 w-3 text-red-500" />
              <span>강제 퇴실 대기</span>
            </div>
          )}

          {seat.status === "OCCUPIED" && (
            <span className="text-[10px] text-slate-600 font-semibold truncate max-w-[120px]">
              {seat.current_user_name || "이용 중"}
            </span>
          )}

          {seat.status === "AVAILABLE" && (
            <div className="flex items-center gap-1 text-[9px] text-emerald-700">
              <Sparkles className="h-3 w-3 text-emerald-600" />
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
          <h4 className="text-xs font-bold text-slate-500 uppercase tracking-wider pl-1 border-l-2 border-emerald-600">
            A 구역 ({selectedFacility ? `${selectedFacility.buildingName} 창가석` : "창가 좌석"})
          </h4>
          <div className="grid grid-cols-3 gap-3">
            {blockA.map(renderSeat)}
          </div>
        </div>

        {/* Right Block */}
        <div className="space-y-3">
          <h4 className="text-xs font-bold text-slate-500 uppercase tracking-wider pl-1 border-l-2 border-lime-505">
            B 구역 ({selectedFacility ? `${selectedFacility.buildingName} 내측석` : "내측 좌석"})
          </h4>
          <div className="grid grid-cols-3 gap-3">
            {blockB.map(renderSeat)}
          </div>
        </div>
      </div>

      {/* Screen / Blackboard Sign */}
      <div className="w-full py-2 bg-slate-100 border border-slate-200 rounded-lg text-center text-slate-500 text-xs font-semibold tracking-widest uppercase">
        {selectedFacility ? `${selectedFacility.roomName} 출입문 및 무인 키오스크 방향` : "도서관 입구 & 대시보드 스크린 방향"}
      </div>
    </div>
  );
}
