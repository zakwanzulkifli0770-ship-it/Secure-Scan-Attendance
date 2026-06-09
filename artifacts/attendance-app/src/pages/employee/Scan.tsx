import React, { useEffect, useRef, useState } from "react";
import { useLocation } from "wouter";
import { Html5Qrcode } from "html5-qrcode";
import { Camera, MapPin, CheckCircle2, ArrowLeft, RefreshCw } from "lucide-react";
import { useClockIn, useClockOut, useGetTodayAttendance, getGetTodayAttendanceQueryKey } from "@workspace/api-client-react";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Spinner } from "@/components/ui/spinner";
import { useQueryClient } from "@tanstack/react-query";

type Step = "SCAN" | "LOCATION" | "SELFIE" | "SUBMITTING";

export default function Scan() {
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  
  const [step, setStep] = useState<Step>("SCAN");
  const [qrToken, setQrToken] = useState<string>("");
  const [locationCoords, setLocationCoords] = useState<{lat: number, lng: number} | null>(null);
  const [selfieBase64, setSelfieBase64] = useState<string>("");
  
  const scannerRef = useRef<Html5Qrcode | null>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [stream, setStream] = useState<MediaStream | null>(null);

  const { data: attendanceData } = useGetTodayAttendance({
    query: { queryKey: getGetTodayAttendanceQueryKey() }
  });
  
  const isClockedIn = attendanceData?.record && !attendanceData?.record.clockOut;

  const clockInMutation = useClockIn();
  const clockOutMutation = useClockOut();

  // Initialize QR Scanner
  useEffect(() => {
    if (step !== "SCAN") return;

    const scanner = new Html5Qrcode("qr-reader");
    scannerRef.current = scanner;

    scanner.start(
      { facingMode: "environment" },
      { fps: 10, qrbox: { width: 250, height: 250 } },
      (decodedText) => {
        scanner.stop().then(() => {
          setQrToken(decodedText);
          setStep("LOCATION");
        });
      },
      () => {} // ignore errors
    ).catch((err) => {
      console.error("Error starting scanner", err);
      toast({ variant: "destructive", title: "Camera Error", description: "Could not access camera" });
    });

    return () => {
      if (scannerRef.current && scannerRef.current.isScanning) {
        scannerRef.current.stop().catch(console.error);
      }
    };
  }, [step, toast]);

  // Capture Location
  useEffect(() => {
    if (step === "LOCATION") {
      if (!navigator.geolocation) {
        toast({ variant: "destructive", title: "Error", description: "Geolocation is not supported" });
        setStep("SELFIE");
        return;
      }

      navigator.geolocation.getCurrentPosition(
        (position) => {
          setLocationCoords({
            lat: position.coords.latitude,
            lng: position.coords.longitude
          });
          setStep("SELFIE");
        },
        (error) => {
          console.error("Location error", error);
          toast({ variant: "destructive", title: "Location Error", description: "Could not get your location" });
          setStep("SELFIE"); // proceed anyway
        },
        { enableHighAccuracy: true, timeout: 5000 }
      );
    }
  }, [step, toast]);

  // Initialize Selfie Camera
  useEffect(() => {
    if (step === "SELFIE") {
      navigator.mediaDevices.getUserMedia({ video: { facingMode: "user" } })
        .then((s) => {
          setStream(s);
          if (videoRef.current) {
            videoRef.current.srcObject = s;
          }
        })
        .catch((err) => {
          console.error("Webcam error", err);
          toast({ variant: "destructive", title: "Camera Error", description: "Could not access front camera" });
        });
    }

    return () => {
      if (stream) {
        stream.getTracks().forEach(track => track.stop());
      }
    };
  }, [step]);

  const captureSelfie = () => {
    if (videoRef.current && canvasRef.current) {
      const video = videoRef.current;
      const canvas = canvasRef.current;
      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;
      const ctx = canvas.getContext("2d");
      if (ctx) {
        ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
        const dataUrl = canvas.toDataURL("image/jpeg", 0.8);
        setSelfieBase64(dataUrl);
        
        // Stop stream
        if (stream) {
          stream.getTracks().forEach(track => track.stop());
        }
        
        submitAttendance(dataUrl);
      }
    }
  };

  const submitAttendance = (selfieData: string) => {
    setStep("SUBMITTING");
    
    const payload = {
      token: qrToken,
      latitude: locationCoords?.lat || 0,
      longitude: locationCoords?.lng || 0,
      selfieBase64: selfieData
    };

    const mutation = isClockedIn ? clockOutMutation : clockInMutation;
    
    mutation.mutate({ data: payload }, {
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: getGetTodayAttendanceQueryKey() });
        toast({ title: "Success", description: `Successfully clocked ${isClockedIn ? "out" : "in"}` });
        setLocation("/");
      },
      onError: (err: any) => {
        toast({ variant: "destructive", title: "Error", description: err?.data?.error || "Failed to submit attendance" });
        setStep("SCAN"); // retry
      }
    });
  };

  return (
    <div className="flex flex-col h-full relative bg-black rounded-lg overflow-hidden">
      <div className="absolute top-4 left-4 z-20">
        <Button variant="secondary" size="icon" className="rounded-full bg-black/50 text-white hover:bg-black/70" onClick={() => setLocation("/")}>
          <ArrowLeft className="w-5 h-5" />
        </Button>
      </div>

      {step === "SCAN" && (
        <div className="flex-1 flex flex-col items-center justify-center relative">
          <div id="qr-reader" className="w-full h-full object-cover"></div>
          <div className="absolute bottom-10 left-0 w-full text-center text-white z-10 px-4">
            <div className="bg-black/60 backdrop-blur-md p-4 rounded-xl border border-white/10 inline-block mx-auto max-w-sm">
              <h3 className="text-lg font-bold">Scan QR Code</h3>
              <p className="text-sm opacity-80 mt-1">Point your camera at the active QR code on the admin screen to {isClockedIn ? "clock out" : "clock in"}.</p>
            </div>
          </div>
        </div>
      )}

      {step === "LOCATION" && (
        <div className="flex-1 flex flex-col items-center justify-center p-6 text-center text-white">
          <MapPin className="w-16 h-16 text-primary mb-4 animate-bounce" />
          <h2 className="text-2xl font-bold">Capturing Location</h2>
          <p className="text-muted-foreground mt-2">Please wait while we verify your coordinates...</p>
        </div>
      )}

      {step === "SELFIE" && (
        <div className="flex-1 flex flex-col bg-black">
          <div className="relative flex-1">
            <video 
              ref={videoRef} 
              autoPlay 
              playsInline 
              muted 
              className="w-full h-full object-cover rounded-t-lg"
            />
            <canvas ref={canvasRef} className="hidden" />
          </div>
          <div className="bg-card p-6 rounded-t-3xl -mt-6 relative z-10 flex flex-col items-center text-center shadow-[0_-10px_40px_rgba(0,0,0,0.5)]">
            <h3 className="text-xl font-bold">Take a Selfie</h3>
            <p className="text-sm text-muted-foreground mt-1 mb-6">Required for attendance verification</p>
            
            <Button 
              size="lg" 
              className="w-20 h-20 rounded-full bg-primary hover:bg-primary/90 p-0 flex items-center justify-center shadow-lg border-4 border-background"
              onClick={captureSelfie}
            >
              <Camera className="w-8 h-8 text-primary-foreground" />
            </Button>
          </div>
        </div>
      )}

      {step === "SUBMITTING" && (
        <div className="flex-1 flex flex-col items-center justify-center p-6 text-center text-white">
          <Spinner className="size-12 text-primary mb-4" />
          <h2 className="text-2xl font-bold">Submitting</h2>
          <p className="text-muted-foreground mt-2">Recording your attendance...</p>
        </div>
      )}
    </div>
  );
}
