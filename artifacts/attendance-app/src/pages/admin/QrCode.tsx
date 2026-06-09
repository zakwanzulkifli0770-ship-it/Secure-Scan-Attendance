import React, { useEffect, useState, useRef } from "react";
import QRCodeLib from "qrcode";
import { differenceInSeconds } from "date-fns";
import { RefreshCw, Clock, AlertTriangle } from "lucide-react";
import { useGetCurrentQrToken, useGenerateQrToken, getGetCurrentQrTokenQueryKey } from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Progress } from "@/components/ui/progress";

export default function QrCode() {
  const queryClient = useQueryClient();
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [timeLeft, setTimeLeft] = useState(0);
  const [progress, setProgress] = useState(100);

  const { data: tokenData, isLoading, isError } = useGetCurrentQrToken({
    query: {
      queryKey: getGetCurrentQrTokenQueryKey(),
      refetchInterval: 30000, // Refetch every 30 seconds as fallback
    }
  });

  const generateMutation = useGenerateQrToken();

  const handleGenerateNew = () => {
    generateMutation.mutate(undefined, {
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: getGetCurrentQrTokenQueryKey() });
      }
    });
  };

  useEffect(() => {
    if (tokenData && canvasRef.current) {
      QRCodeLib.toCanvas(
        canvasRef.current,
        tokenData.token,
        {
          width: 400,
          margin: 2,
          color: {
            dark: "#000000",
            light: "#ffffff",
          },
        },
        (error) => {
          if (error) console.error(error);
        }
      );
    }
  }, [tokenData]);

  useEffect(() => {
    if (!tokenData) return;

    const expiresAt = new Date(tokenData.expiresAt);
    const createdAt = new Date(tokenData.createdAt);
    const totalDuration = differenceInSeconds(expiresAt, createdAt);

    const updateTimer = () => {
      const now = new Date();
      const secondsLeft = Math.max(0, differenceInSeconds(expiresAt, now));
      setTimeLeft(secondsLeft);
      
      const currentProgress = (secondsLeft / totalDuration) * 100;
      setProgress(Math.max(0, Math.min(100, currentProgress)));

      if (secondsLeft === 0) {
        // Auto refresh when expired
        queryClient.invalidateQueries({ queryKey: getGetCurrentQrTokenQueryKey() });
      }
    };

    updateTimer();
    const interval = setInterval(updateTimer, 1000);
    return () => clearInterval(interval);
  }, [tokenData, queryClient]);

  const formatTime = (seconds: number) => {
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${m}:${s.toString().padStart(2, "0")}`;
  };

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Active QR Code</h1>
          <p className="text-muted-foreground mt-1">Employees scan this to record attendance</p>
        </div>
      </div>

      <Card className="shadow-lg border-2">
        <CardHeader className="text-center border-b bg-muted/30 pb-8 pt-8">
          <CardTitle className="text-2xl font-bold text-primary">Scan to Check In/Out</CardTitle>
          <CardDescription className="text-base mt-2">Open the HR app on your mobile device</CardDescription>
        </CardHeader>
        <CardContent className="p-10 flex flex-col items-center">
          
          <div className="bg-white p-4 rounded-xl shadow-sm border mb-8 relative">
            {isLoading || generateMutation.isPending ? (
              <Skeleton className="w-[400px] h-[400px]" />
            ) : isError || !tokenData ? (
              <div className="w-[400px] h-[400px] flex flex-col items-center justify-center text-muted-foreground bg-muted/50 rounded-lg">
                <AlertTriangle className="w-16 h-16 mb-4 text-warning" />
                <p>Failed to load QR code</p>
                <Button variant="outline" className="mt-4" onClick={handleGenerateNew}>Retry</Button>
              </div>
            ) : (
              <div className="relative">
                <canvas ref={canvasRef} className="block w-[400px] h-[400px]"></canvas>
                {timeLeft === 0 && (
                  <div className="absolute inset-0 bg-white/80 backdrop-blur-sm flex flex-col items-center justify-center rounded-lg">
                    <p className="text-xl font-bold text-destructive mb-4">Code Expired</p>
                  </div>
                )}
              </div>
            )}
          </div>

          <div className="w-full max-w-sm space-y-3 mb-8">
            <div className="flex justify-between text-sm font-medium">
              <span className="flex items-center text-muted-foreground"><Clock className="w-4 h-4 mr-1"/> Expires in</span>
              <span className={timeLeft < 30 ? "text-destructive font-bold" : "text-primary font-bold"}>
                {formatTime(timeLeft)}
              </span>
            </div>
            <Progress value={progress} className={timeLeft < 30 ? "[&>div]:bg-destructive" : ""} />
          </div>

          <Button 
            size="lg" 
            className="w-full max-w-sm text-lg" 
            onClick={handleGenerateNew}
            disabled={generateMutation.isPending}
          >
            <RefreshCw className={`w-5 h-5 mr-2 ${generateMutation.isPending ? "animate-spin" : ""}`} />
            Generate New Code Now
          </Button>

        </CardContent>
      </Card>
    </div>
  );
}
