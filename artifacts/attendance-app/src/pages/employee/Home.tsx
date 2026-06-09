import React, { useEffect, useState } from "react";
import { Link } from "wouter";
import { format } from "date-fns";
import { Clock, QrCode, History } from "lucide-react";
import { useGetTodayAttendance, useGetMe, getGetTodayAttendanceQueryKey } from "@workspace/api-client-react";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Spinner } from "@/components/ui/spinner";
import { setToken } from "@/lib/auth";
import { useLocation } from "wouter";
import { User } from "lucide-react";

export default function EmployeeHome() {
  const [currentTime, setCurrentTime] = useState(new Date());
  const [, setLocation] = useLocation();
  const { data: user } = useGetMe();
  
  const { data: attendanceData, isLoading } = useGetTodayAttendance({
    query: {
      queryKey: getGetTodayAttendanceQueryKey(),
    }
  });

  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  const handleLogout = () => {
    setToken(null);
    setLocation("/login");
  };

  if (isLoading) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <Spinner className="size-8" />
      </div>
    );
  }

  const record = attendanceData?.record;
  const isClockedIn = record && !record.clockOut;
  const isCompleted = record && record.clockOut;

  return (
    <div className="flex flex-col gap-6">
      <div className="flex justify-between items-start">
        <div>
          <p className="text-sm font-medium text-muted-foreground">{format(currentTime, "EEEE, MMMM d")}</p>
          <h2 className="text-2xl font-bold mt-1">Hello, {user?.name?.split(" ")[0] || "User"}</h2>
        </div>
        <Button variant="ghost" size="icon" onClick={handleLogout} className="text-muted-foreground hover:text-destructive">
          <User className="w-5 h-5" />
        </Button>
      </div>

      <Card className="bg-primary text-primary-foreground border-none shadow-md overflow-hidden relative">
        <div className="absolute top-0 right-0 p-8 opacity-10">
          <Clock className="w-32 h-32" />
        </div>
        <CardContent className="p-6 relative z-10">
          <div className="text-center mb-6">
            <div className="text-5xl font-mono tracking-tight font-bold">
              {format(currentTime, "HH:mm")}
            </div>
            <div className="text-primary-foreground/80 mt-1 font-medium">
              {format(currentTime, "ss")} seconds
            </div>
          </div>

          <div className="flex justify-between items-center bg-black/10 rounded-lg p-4 backdrop-blur-sm">
            <div className="flex flex-col">
              <span className="text-xs uppercase tracking-wider text-primary-foreground/70 font-semibold mb-1">Status</span>
              <span className="font-medium">
                {!record ? "Not Clocked In" : isClockedIn ? "Clocked In" : "Completed Day"}
              </span>
            </div>
            {record && (
              <div className="flex flex-col text-right">
                <span className="text-xs uppercase tracking-wider text-primary-foreground/70 font-semibold mb-1">Since</span>
                <span className="font-medium font-mono">{format(new Date(record.clockIn), "HH:mm")}</span>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {!isCompleted && (
        <Link href="/scan" className="block w-full">
          <Button 
            size="lg" 
            className="w-full py-8 text-lg font-bold shadow-lg hover:shadow-xl transition-all"
            variant={isClockedIn ? "secondary" : "default"}
          >
            <QrCode className="mr-2 w-6 h-6" />
            {isClockedIn ? "Clock Out" : "Clock In Now"}
          </Button>
        </Link>
      )}

      {isCompleted && (
        <Card className="border-border">
          <CardHeader>
            <CardTitle className="text-lg">Today's Summary</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="flex justify-between items-center py-2 border-b">
                <span className="text-muted-foreground">Clock In</span>
                <span className="font-mono font-medium">{format(new Date(record.clockIn), "HH:mm")}</span>
              </div>
              <div className="flex justify-between items-center py-2 border-b">
                <span className="text-muted-foreground">Clock Out</span>
                <span className="font-mono font-medium">{format(new Date(record.clockOut!), "HH:mm")}</span>
              </div>
              <div className="bg-muted p-4 rounded-lg text-center">
                <p className="text-sm font-medium text-muted-foreground">Great job today!</p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      <div className="mt-4">
        <div className="flex justify-between items-center mb-4">
          <h3 className="font-bold text-lg">Quick Actions</h3>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <Link href="/history">
            <Card className="hover-elevate cursor-pointer border-border transition-colors">
              <CardContent className="p-4 flex flex-col items-center justify-center text-center gap-2">
                <div className="w-10 h-10 rounded-full bg-primary/10 text-primary flex items-center justify-center">
                  <History className="w-5 h-5" />
                </div>
                <span className="text-sm font-medium">History</span>
              </CardContent>
            </Card>
          </Link>
        </div>
      </div>
    </div>
  );
}
