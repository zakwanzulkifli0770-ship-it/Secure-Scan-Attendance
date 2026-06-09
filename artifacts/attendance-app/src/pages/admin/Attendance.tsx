import React, { useState } from "react";
import { format } from "date-fns";
import { Calendar as CalendarIcon, Filter, Search, Download, MapPin, Map } from "lucide-react";
import { useListAttendance, getListAttendanceQueryKey } from "@workspace/api-client-react";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Skeleton } from "@/components/ui/skeleton";

export default function Attendance() {
  const [date, setDate] = useState<Date | undefined>(new Date());
  
  const dateStr = date ? format(date, "yyyy-MM-dd") : undefined;
  
  const { data: records, isLoading } = useListAttendance({
    date: dateStr
  }, {
    query: {
      queryKey: [...getListAttendanceQueryKey(), dateStr],
    }
  });

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Attendance Records</h1>
          <p className="text-muted-foreground mt-1">Review daily clock-in and clock-out data</p>
        </div>
        
        <div className="flex items-center gap-2">
          <Popover>
            <PopoverTrigger asChild>
              <Button variant="outline" className="min-w-[200px] justify-start text-left font-normal">
                <CalendarIcon className="mr-2 h-4 w-4" />
                {date ? format(date, "PPP") : <span>Pick a date</span>}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0">
              <Calendar
                mode="single"
                selected={date}
                onSelect={setDate}
                initialFocus
              />
            </PopoverContent>
          </Popover>
          <Button variant="outline">
            <Filter className="w-4 h-4 mr-2" />
            More Filters
          </Button>
        </div>
      </div>

      <Card>
        <div className="p-4 border-b flex items-center justify-between">
          <div className="relative w-full max-w-sm">
            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              type="search"
              placeholder="Search by employee name..."
              className="pl-9 bg-muted/50"
            />
          </div>
          <p className="text-sm text-muted-foreground">
            {records?.length || 0} records found
          </p>
        </div>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow className="bg-muted/50 hover:bg-muted/50">
                <TableHead>Employee</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Clock In</TableHead>
                <TableHead>Clock Out</TableHead>
                <TableHead>Selfie</TableHead>
                <TableHead>Location</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                Array.from({ length: 5 }).map((_, i) => (
                  <TableRow key={i}>
                    <TableCell><Skeleton className="h-10 w-full" /></TableCell>
                    <TableCell><Skeleton className="h-6 w-20" /></TableCell>
                    <TableCell><Skeleton className="h-6 w-16" /></TableCell>
                    <TableCell><Skeleton className="h-6 w-16" /></TableCell>
                    <TableCell><Skeleton className="h-10 w-10 rounded-full" /></TableCell>
                    <TableCell><Skeleton className="h-6 w-20" /></TableCell>
                  </TableRow>
                ))
              ) : !records || records.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} className="h-32 text-center text-muted-foreground">
                    No attendance records found for {date ? format(date, "MMMM d, yyyy") : "selected date"}.
                  </TableCell>
                </TableRow>
              ) : (
                records.map((record) => (
                  <TableRow key={record.id}>
                    <TableCell>
                      <div className="flex items-center gap-3">
                        <Avatar className="h-9 w-9">
                          <AvatarFallback className="bg-primary/10 text-primary">
                            {record.employee.name.substring(0, 2).toUpperCase()}
                          </AvatarFallback>
                        </Avatar>
                        <div>
                          <div className="font-medium">{record.employee.name}</div>
                          <div className="text-xs text-muted-foreground">{record.employee.employeeId}</div>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge variant={record.clockOut ? "secondary" : "default"} className={!record.clockOut ? "bg-green-500/10 text-green-700 hover:bg-green-500/20 hover:text-green-800" : ""}>
                        {record.clockOut ? "Completed" : "Active"}
                      </Badge>
                    </TableCell>
                    <TableCell className="font-mono">
                      {format(new Date(record.clockIn), "HH:mm")}
                    </TableCell>
                    <TableCell className="font-mono">
                      {record.clockOut ? format(new Date(record.clockOut), "HH:mm") : "--:--"}
                    </TableCell>
                    <TableCell>
                      {record.selfieUrl ? (
                        <Dialog>
                          <DialogTrigger asChild>
                            <Avatar className="h-10 w-10 cursor-pointer hover:ring-2 hover:ring-primary/50 transition-all">
                              <AvatarImage src={record.selfieUrl} className="object-cover" />
                              <AvatarFallback>PIC</AvatarFallback>
                            </Avatar>
                          </DialogTrigger>
                          <DialogContent className="sm:max-w-md">
                            <DialogHeader>
                              <DialogTitle>Verification Photo</DialogTitle>
                            </DialogHeader>
                            <div className="relative aspect-square w-full mt-4 rounded-md overflow-hidden bg-black">
                              <img src={record.selfieUrl} alt="Selfie" className="w-full h-full object-cover" />
                            </div>
                            <div className="text-center text-sm text-muted-foreground mt-2">
                              Captured at {format(new Date(record.clockIn), "h:mm a")}
                            </div>
                          </DialogContent>
                        </Dialog>
                      ) : (
                        <span className="text-xs text-muted-foreground italic">None</span>
                      )}
                    </TableCell>
                    <TableCell>
                      {record.latitude && record.longitude ? (
                        <Button variant="ghost" size="sm" className="h-8 gap-1 text-xs">
                          <MapPin className="w-3.5 h-3.5" />
                          View Map
                        </Button>
                      ) : (
                        <span className="text-xs text-muted-foreground">Unknown</span>
                      )}
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
