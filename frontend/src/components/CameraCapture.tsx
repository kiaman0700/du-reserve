"use client";

import React, { useRef, useState, useEffect } from "react";
import { Camera, RefreshCw, X, ShieldAlert, Sparkles } from "lucide-react";

interface CameraCaptureProps {
  onCapture: (photoDataUrl: string) => void;
  onClose: () => void;
  title: string;
}

export default function CameraCapture({ onCapture, onClose, title }: CameraCaptureProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [stream, setStream] = useState<MediaStream | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isSimulated, setIsSimulated] = useState<boolean>(false);
  const [capturedPhoto, setCapturedPhoto] = useState<string | null>(null);

  // Initialize camera
  useEffect(() => {
    let activeStream: MediaStream | null = null;

    async function startCamera() {
      try {
        const constraints = {
          video: { facingMode: "environment" }, // 후면 카메라 우선
          audio: false
        };
        const mediaStream = await navigator.mediaDevices.getUserMedia(constraints);
        activeStream = mediaStream;
        setStream(mediaStream);
        if (videoRef.current) {
          videoRef.current.srcObject = mediaStream;
        }
      } catch (err: any) {
        console.error("Camera access error:", err);
        setError("실제 카메라에 접근할 수 없습니다. 시뮬레이션 카메라로 전환합니다.");
        setIsSimulated(true);
      }
    }

    startCamera();

    return () => {
      if (activeStream) {
        activeStream.getTracks().forEach((track) => track.stop());
      }
    };
  }, []);

  // Capture the photo
  const capturePhoto = () => {
    if (isSimulated) {
      // Generate a mock photo in canvas
      const canvas = canvasRef.current;
      if (canvas) {
        const ctx = canvas.getContext("2d");
        if (ctx) {
          // Create a mock dashboard-like visual
          ctx.fillStyle = "#1e293b"; // Slate background
          ctx.fillRect(0, 0, canvas.width, canvas.height);
          
          // Draw grid pattern (simulating library/desk)
          ctx.strokeStyle = "#334155";
          ctx.lineWidth = 2;
          for (let i = 0; i < canvas.width; i += 40) {
            ctx.beginPath();
            ctx.moveTo(i, 0);
            ctx.lineTo(i, canvas.height);
            ctx.stroke();
          }
          for (let j = 0; j < canvas.height; j += 40) {
            ctx.beginPath();
            ctx.moveTo(0, j);
            ctx.lineTo(canvas.width, j);
            ctx.stroke();
          }

          // Draw mock empty desk outline
          ctx.strokeStyle = "#64748b";
          ctx.lineWidth = 4;
          ctx.strokeRect(80, 80, canvas.width - 160, canvas.height - 160);

          // Add text overlay
          ctx.fillStyle = "#f8fafc";
          ctx.font = "bold 16px sans-serif";
          ctx.textAlign = "center";
          ctx.fillText("대구대학교 중앙도서관 제1열람실", canvas.width / 2, canvas.height / 2 - 20);
          ctx.fillStyle = "#cbd5e1";
          ctx.font = "14px sans-serif";
          ctx.fillText("실시간 현장 촬영 증빙 자료 (시뮬레이션)", canvas.width / 2, canvas.height / 2 + 10);
          
          // Add Timestamp
          ctx.fillStyle = "#ef4444";
          ctx.font = "bold 12px monospace";
          ctx.textAlign = "left";
          ctx.fillText(`TIME: ${new Date().toLocaleTimeString()}`, 20, canvas.height - 20);
          ctx.fillText("LIVE PHOTO ONLY (UPLOAD BLOCKED)", 20, 25);

          // Show mock warning item (e.g. an empty bag left behind)
          ctx.fillStyle = "#b45309";
          ctx.beginPath();
          ctx.arc(canvas.width / 2, canvas.height / 2 + 70, 25, 0, 2 * Math.PI);
          ctx.fill();
          ctx.fillStyle = "#fef3c7";
          ctx.font = "11px sans-serif";
          ctx.textAlign = "center";
          ctx.fillText("방치된 물품", canvas.width / 2, canvas.height / 2 + 74);

          const dataUrl = canvas.toDataURL("image/jpeg");
          setCapturedPhoto(dataUrl);
        }
      }
    } else {
      const video = videoRef.current;
      const canvas = canvasRef.current;
      if (video && canvas) {
        const ctx = canvas.getContext("2d");
        if (ctx) {
          // Adjust canvas size to match video
          canvas.width = video.videoWidth;
          canvas.height = video.videoHeight;
          
          // Draw video frame to canvas
          ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
          
          // Draw red Timestamp and "LIVE CAMERA" watermarks directly on the picture to prevent photo manipulation
          ctx.fillStyle = "#ef4444";
          ctx.font = "bold 16px monospace";
          ctx.fillText(`TIMESTAMP: ${new Date().toLocaleString()}`, 20, canvas.height - 20);
          ctx.fillText("LIVE VERIFICATION - UPLOAD BLOCKED", 20, 30);

          const dataUrl = canvas.toDataURL("image/jpeg");
          setCapturedPhoto(dataUrl);
        }
      }
    }
  };

  const handleConfirm = () => {
    if (capturedPhoto) {
      onCapture(capturedPhoto);
    }
  };

  const handleRetake = () => {
    setCapturedPhoto(null);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 p-4 backdrop-blur-sm animate-fade-in">
      <div className="w-full max-w-lg overflow-hidden rounded-2xl border border-slate-800 bg-slate-900 shadow-2xl">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-800 bg-slate-950 px-6 py-4">
          <div className="flex items-center space-x-2">
            <Camera className="h-5 w-5 text-indigo-400" />
            <h3 className="font-semibold text-slate-100">{title}</h3>
          </div>
          <button
            onClick={onClose}
            className="rounded-lg p-1 text-slate-400 hover:bg-slate-800 hover:text-slate-100 transition-colors"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Video / Photo Body */}
        <div className="relative aspect-video w-full bg-slate-950 flex items-center justify-center overflow-hidden">
          {!capturedPhoto ? (
            isSimulated ? (
              /* Simulated Camera View */
              <div className="relative w-full h-full flex flex-col items-center justify-center p-6 text-center">
                {/* Custom Canvas for simulating capture */}
                <canvas ref={canvasRef} width={640} height={360} className="hidden" />
                <div className="absolute inset-0 bg-slate-950/40 pointer-events-none border-2 border-dashed border-amber-500/30 m-4 flex flex-col justify-between p-4">
                  <div className="flex justify-between items-start">
                    <span className="text-[10px] bg-amber-500/80 text-slate-950 px-2 py-0.5 rounded font-mono font-bold">SIMULATION CAMERA</span>
                    <span className="text-[10px] text-slate-400 font-mono">REC 🔴</span>
                  </div>
                  <div className="w-full h-[2px] bg-cyan-500/60 shadow-[0_0_8px_rgba(6,182,212,0.8)] animate-scanner"></div>
                  <div className="flex justify-between items-end text-[10px] text-slate-500 font-mono">
                    <span>DAEGU UNIV LIBR</span>
                    <span>1080P 30FPS</span>
                  </div>
                </div>
                
                <div className="z-10 flex flex-col items-center space-y-3">
                  <div className="rounded-full bg-amber-500/10 p-3 text-amber-500">
                    <ShieldAlert className="h-8 w-8" />
                  </div>
                  <div className="space-y-1">
                    <p className="font-semibold text-slate-200">웹캠 카메라 하드웨어 미감지</p>
                    <p className="text-xs text-slate-400 max-w-sm">
                      보안 정책에 따라 갤러리 이미지 업로드는 금지됩니다. 가상 현장 스냅샷 시뮬레이션을 실행합니다.
                    </p>
                  </div>
                </div>
              </div>
            ) : (
              /* Actual Webcam Feed */
              <>
                <video
                  ref={videoRef}
                  autoPlay
                  playsInline
                  muted
                  className="h-full w-full object-cover"
                />
                <canvas ref={canvasRef} className="hidden" />
                {/* Camera Overlay Guide */}
                <div className="absolute inset-4 pointer-events-none border border-slate-100/20 flex flex-col justify-between p-4">
                  <div className="flex justify-between">
                    <span className="text-[10px] bg-indigo-600 text-slate-100 px-2 py-0.5 rounded font-mono">LIVE API</span>
                    <span className="text-[10px] text-emerald-400 font-mono flex items-center gap-1">
                      <span className="h-2 w-2 rounded-full bg-emerald-400 animate-ping"></span> ONLINE
                    </span>
                  </div>
                  <div className="border-t border-b border-dashed border-slate-100/20 h-1/2 flex items-center justify-center">
                    <span className="text-xs text-slate-400 bg-slate-900/60 px-3 py-1.5 rounded-full backdrop-blur-sm">
                      자리 방치 물품이 잘 보이도록 촬영해 주세요
                    </span>
                  </div>
                  <div className="text-[10px] text-slate-400 font-mono">
                    DAEGU UNIV. LIBRARY FACILITY MGMT
                  </div>
                </div>
              </>
            )
          ) : (
            /* Image Preview */
            <img src={capturedPhoto} alt="Captured" className="h-full w-full object-cover animate-fade-in" />
          )}
        </div>

        {/* Footer controls */}
        <div className="bg-slate-950 px-6 py-4 flex items-center justify-between">
          <p className="text-xs text-slate-500 max-w-[200px]">
            {capturedPhoto 
              ? "캡처된 사진이 증빙 자료로 첨부됩니다." 
              : "실시간 라이브 촬영만 접수 가능합니다 (조작 방지)."}
          </p>

          <div className="flex space-x-3">
            {!capturedPhoto ? (
              <button
                onClick={capturePhoto}
                className="flex items-center space-x-2 bg-indigo-600 hover:bg-indigo-500 text-slate-100 px-4 py-2 rounded-lg font-medium text-sm transition-all hover:scale-[1.02] active:scale-[0.98]"
              >
                <Camera className="h-4 w-4" />
                <span>사진 촬영</span>
              </button>
            ) : (
              <>
                <button
                  onClick={handleRetake}
                  className="flex items-center space-x-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 px-3 py-2 rounded-lg font-medium text-sm transition-colors"
                >
                  <RefreshCw className="h-4 w-4" />
                  <span>재촬영</span>
                </button>
                <button
                  onClick={handleConfirm}
                  className="flex items-center space-x-1.5 bg-emerald-600 hover:bg-emerald-500 text-slate-100 px-4 py-2 rounded-lg font-semibold text-sm transition-all hover:scale-[1.02] active:scale-[0.98]"
                >
                  <Sparkles className="h-4 w-4" />
                  <span>제출하기</span>
                </button>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
