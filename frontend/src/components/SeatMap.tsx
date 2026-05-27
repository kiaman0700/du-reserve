"use client";

import React from "react";
import { Seat, SeatStatus } from "@/app/page";
import { Check, ShieldAlert, Sparkles, Clock, Trash2, Wrench, VolumeX } from "lucide-react";

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
  noiseLevel: "COZY" | "MURMUR" | "WARN";
  highlightSeatId?: number | null;
  complaints?: any[];
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
    text: "text-red-655 font-bold",
    label: "2차 신고"
  },
  CLEARING: {
    bg: "animate-pulse-purple",
    border: "border-purple-300 shadow-xs",
    text: "text-purple-700 font-bold",
    label: "정리 중"
  },
  MAINTENANCE: {
    bg: "bg-slate-150/80 bg-[repeating-linear-gradient(45deg,rgba(0,0,0,0.03),rgba(0,0,0,0.03)_10px,transparent_10px,transparent_20px)]",
    border: "border-slate-300 opacity-80",
    text: "text-slate-500 font-bold",
    label: "점검 중"
  }
};

export default function SeatMap({ 
  seats, 
  onSelectSeat, 
  selectedSeatId, 
  userReservationSeatId,
  selectedFacility,
  noiseLevel,
  highlightSeatId = null,
  complaints = []
}: SeatMapProps) {
  const midPoint = Math.ceil(seats.length / 2);
  const blockA = seats.slice(0, midPoint);
  const blockB = seats.slice(midPoint);

  const renderSeat = (seat: Seat) => {
    const isSelected = selectedSeatId === seat.id;
    const isMySeat = userReservationSeatId === seat.id;
    const colors = statusColors[seat.status];
    const isHighlighted = highlightSeatId === seat.id;

    // Check if seat has pending damage/facility complaint
    const hasPendingDamage = complaints?.some(c => 
      c.seat_id === seat.id && 
      (c.category === "DAMAGE" || c.category === "FACILITY") && 
      c.status === "PENDING"
    );

    return (
      <button
        key={seat.id}
        onClick={() => onSelectSeat(seat)}
        className={`relative flex flex-col justify-between rounded-xl border p-3 text-left transition-all h-[95px] w-full cursor-pointer ${
          isHighlighted
            ? "ring-4 ring-amber-500 border-amber-550 bg-white scale-[1.05] shadow-xl z-20 animate-pulse"
            : isSelected 
            ? "ring-2 ring-emerald-600 border-emerald-500 bg-white scale-[1.03] shadow-md" 
            : `${colors.bg} ${colors.border}`
        } duration-200`}
      >
        {/* Seat Badge & Number */}
        <div className="flex w-full items-center justify-between gap-1">
          <div className="flex items-center gap-1">
            <span className="font-mono text-[10px] text-slate-500">Seat {String(seat.seat_number).padStart(2, "0")}</span>
            {hasPendingDamage && (
              <span className="px-1.5 py-0.5 text-[8px] font-black bg-red-655 text-white rounded border border-red-400 animate-pulse flex items-center gap-0.5" title="시설물 고장 신고 접수됨">
                ⚠️ 고장
              </span>
            )}
          </div>
          
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

          {seat.status === "MAINTENANCE" && (
            <div className="flex items-center gap-1 text-[9px] text-slate-500">
              <Wrench className="h-3 w-3 text-slate-450 animate-pulse-subtle" />
              <span>좌석 점검 중</span>
            </div>
          )}
        </div>
      </button>
    );
  };

  return (
    <div className="space-y-6 animate-fade-in">
      {/* 📢 [TODO 9] 실시간 소음 온도 Heatmap 전광판 */}
      <div className="p-4 bg-slate-50 border border-slate-200 rounded-2xl flex flex-col sm:flex-row items-center justify-between gap-4">
        <div className="flex items-center space-x-3">
          <div className={`p-2.5 rounded-xl border text-white transition-colors duration-300 ${
            noiseLevel === "COZY" ? "bg-emerald-500 border-emerald-400" :
            noiseLevel === "MURMUR" ? "bg-amber-500 border-amber-400" :
            "bg-red-500 border-red-400 animate-pulse"
          }`}>
            <VolumeX className="h-5 w-5" />
          </div>
          <div>
            <h4 className="text-xs font-extrabold text-slate-800 flex flex-wrap items-center gap-1.5 leading-none">
              <span>🔊 실시간 소음 온도 Heatmap</span>
              <span className={`px-2 py-0.5 rounded text-[9px] text-white font-bold transition-colors duration-300 ${
                noiseLevel === "COZY" ? "bg-emerald-600" :
                noiseLevel === "MURMUR" ? "bg-amber-600" :
                "bg-red-600 animate-pulse"
              }`}>
                {noiseLevel === "COZY" && "쾌적 (15°C ~ 36.5°C)"}
                {noiseLevel === "MURMUR" && "웅성웅성 (55°C)"}
                {noiseLevel === "WARN" && "주의필요 (85°C)"}
              </span>
            </h4>
            <p className="text-[10px] text-slate-400 mt-1 font-semibold leading-none">
              최근 1시간 내 접수된 학우분들의 실시간 소음 민원 접수량을 기반으로 쾌적 온도가 자동 조정됩니다.
            </p>
          </div>
        </div>

        {/* Heatmap Bar */}
        <div className="flex items-center gap-2 w-full sm:w-auto font-mono text-[10px] font-bold text-slate-400">
          <span>쾌적</span>
          <div className="h-2.5 w-40 bg-slate-200 rounded-full overflow-hidden flex">
            <div className={`h-full transition-all duration-500 ${
              noiseLevel === "COZY" ? "w-1/3 bg-emerald-500" : 
              noiseLevel === "MURMUR" ? "w-2/3 bg-amber-500" : 
              "w-full bg-red-500 animate-pulse"
            }`} />
          </div>
          <span className={noiseLevel === "WARN" ? "text-red-500 font-bold" : ""}>주의필요</span>
        </div>
      </div>

      {/* Visual Desk Layout */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        {/* Left Block */}
        <div className={`space-y-3 p-4 border rounded-2xl transition-all duration-300 ${
          noiseLevel === "WARN" 
            ? "border-red-200 bg-red-50/10 shadow-lg shadow-red-500/5 animate-pulse-slow" 
            : noiseLevel === "MURMUR" 
            ? "border-amber-250 bg-amber-50/5 shadow-md shadow-amber-500/5" 
            : "border-slate-150"
        }`}>
          <div className="flex items-center justify-between">
            <h4 className="text-xs font-bold text-slate-500 uppercase tracking-wider pl-1 border-l-2 border-emerald-600">
              A 구역 ({selectedFacility ? `${selectedFacility.buildingName} 창가석` : "창가 좌석"})
            </h4>
            <span className={`text-[9px] font-extrabold px-2 py-0.5 rounded-md ${
              noiseLevel === "COZY" ? "bg-emerald-50 text-emerald-700 border border-emerald-150" :
              noiseLevel === "MURMUR" ? "bg-amber-50 text-amber-700 border border-amber-150" :
              "bg-red-50 text-red-700 border border-red-150 animate-pulse"
            }`}>
              {noiseLevel === "COZY" && "🔊 소음 쾌적"}
              {noiseLevel === "MURMUR" && "🔊 소음 웅성웅성"}
              {noiseLevel === "WARN" && "🔇 소음 주의요망"}
            </span>
          </div>
          <div className="grid grid-cols-3 gap-3">
            {blockA.map(renderSeat)}
          </div>
        </div>

        {/* Right Block */}
        <div className={`space-y-3 p-4 border rounded-2xl transition-all duration-300 ${
          noiseLevel === "WARN" 
            ? "border-red-200 bg-red-50/10 shadow-lg shadow-red-500/5 animate-pulse-slow" 
            : noiseLevel === "MURMUR" 
            ? "border-amber-250 bg-amber-50/5 shadow-md shadow-amber-500/5" 
            : "border-slate-150"
        }`}>
          <div className="flex items-center justify-between">
            <h4 className="text-xs font-bold text-slate-500 uppercase tracking-wider pl-1 border-l-2 border-lime-505">
              B 구역 ({selectedFacility ? `${selectedFacility.buildingName} 내측석` : "내측 좌석"})
            </h4>
            <span className={`text-[9px] font-extrabold px-2 py-0.5 rounded-md ${
              noiseLevel === "COZY" ? "bg-emerald-50 text-emerald-700 border border-emerald-150" :
              noiseLevel === "MURMUR" ? "bg-amber-50 text-amber-700 border border-amber-150" :
              "bg-red-50 text-red-700 border border-red-150 animate-pulse"
            }`}>
              {noiseLevel === "COZY" && "🔊 소음 쾌적"}
              {noiseLevel === "MURMUR" && "🔊 소음 웅성웅성"}
              {noiseLevel === "WARN" && "🔇 소음 주의요망"}
            </span>
          </div>
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
