import React, { useState } from "react";
import { format, subMonths, addMonths } from "date-fns";
import { ChevronLeft, ChevronRight, Calendar, MapPin, Camera } from "lucide-react";
import { useGetMyAttendanceHistory, getGetMyAttendanceHistoryQueryKey } from "@workspace/api-client-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";

export default function History() {
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const monthStr = format(currentMonth, "yyyy-MM");

  const { data: records, isLoading } = useGetMyAttendanceHistory({
    month: monthStr
  }, {
    query: {
      queryKey: [...getGetMyAttendanceHistoryQueryKey(), monthStr],
    }
  });

  const prevMonth = () => setCurrentMonth(subMonths(currentMonth, 1));
  const nextMonth = () => setCurrentMonth(addMonths(currentMonth, 1));

  return (
    <div className="flex flex-col gap-6">
      <div className="flex justify-between items-center bg-card p-3 rounded-lg border shadow-sm">
        <Button variant="ghost" size="icon" onClick={prevMonth}>
          <ChevronLeft className="w-5 h-5" />
        </Button>
        <div className="flex items-center gap-2 font-bold text-lg">
          <Calendar className="w-5 h-5 text-primary" />
          {format(currentMonth, "MMMM yyyy")}
        </div>
        <Button variant="ghost" size="icon" onClick={nextMonth} disabled={currentMonth >= new Date()}>
          <ChevronRight className="w-5 h-5" />
        </Button>
      </div>

      <div className="space-y-4">
        {isLoading ? (
          Array.from({ length: 5 }).map((_, i) => (
            <Skeleton key={i} className="h-32 w-full rounded-xl" />
          ))
        ) : !records || records.length === 0 ? (
          <div className="text-center py-12 bg-card rounded-xl border border-dashed">
            <Calendar className="w-12 h-12 text-muted-foreground/30 mx-auto mb-3" />
            <h3 className="text-lg font-medium text-foreground">No records found</h3>
            <p className="text-muted-foreground text-sm">You have no attendance records for this month.</p>
          </div>
        ) : (
          records.map((record) => {
            const date = new Date(record.date);
            const isCompleted = !!record.clockOut;
            const isLate = false; // Add logic if needed based on business rules
            
            return (
              <Card key={record.id} className="overflow-hidden border-l-4 border-l-primary shadow-sm hover:shadow-md transition-shadow">
                <CardContent className="p-0">
                  <div className="flex">
                    <div className="bg-muted/50 p-4 flex flex-col items-center justify-center min-w-20 border-r text-center">
                      <span className="text-sm font-semibold text-muted-foreground uppercase">{format(date, "EEE")}</span>
                      <span className="text-2xl font-bold">{format(date, "d")}</span>
                    </div>
                    <div className="p-4 flex-1">
                      <div className="flex justify-between items-start mb-3">
                        <Badge variant={isCompleted ? "secondary" : "outline"} className={!isCompleted ? "text-primary border-primary" : ""}>
                          {isCompleted ? "Completed" : "In Progress"}
                        </Badge>
                      </div>
                      
                      <div className="flex justify-between items-center mb-2">
                        <div className="flex flex-col">
                          <span className="text-xs text-muted-foreground mb-1">Clock In</span>
                          <span className="font-mono font-medium">{format(new Date(record.clockIn), "HH:mm")}</span>
                        </div>
                        <div className="flex flex-col text-right">
                          <span className="text-xs text-muted-foreground mb-1">Clock Out</span>
                          <span className="font-mono font-medium">{record.clockOut ? format(new Date(record.clockOut), "HH:mm") : "--:--"}</span>
                        </div>
                      </div>
                      
                      {record.latitude && (
                        <div className="flex items-center gap-1 text-xs text-muted-foreground mt-3 pt-3 border-t">
                          <MapPin className="w-3 h-3" />
                          <span>Location verified</span>
                        </div>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })
        )}
      </div>
    </div>
  );
}
