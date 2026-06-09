import React, { useState } from "react";
import { format } from "date-fns";
import { FileDown, Calendar as CalendarIcon, FileSpreadsheet } from "lucide-react";
import { useExportAttendance, getExportAttendanceQueryKey } from "@workspace/api-client-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";

export default function Reports() {
  const [month, setMonth] = useState<Date>(new Date());
  const monthStr = format(month, "yyyy-MM");

  const { data: reportData, isLoading, refetch } = useExportAttendance({
    month: monthStr
  }, {
    query: {
      queryKey: [...getExportAttendanceQueryKey(), monthStr],
      enabled: false, // Only run on demand
    }
  });

  const handleExport = async () => {
    const res = await refetch();
    if (res.data) {
      // The API returns CSV text directly
      downloadCSV(res.data, `attendance-report-${monthStr}.csv`);
    } else {
      alert("No data available to export for this month.");
    }
  };

  const convertToCSV = (data: Record<string, unknown>[]) => {
    if (data.length === 0) return "";
    const headers = ["Employee ID", "Name", "Date", "Clock In", "Clock Out", "Hours"];
    const rows = data.map(record => {
      const emp = record.employee as Record<string, unknown> | undefined;
      return [
        emp?.employeeId ?? "",
        emp?.name ?? "",
        record.date,
        record.clockIn ? format(new Date(record.clockIn as string), "HH:mm") : "",
        record.clockOut ? format(new Date(record.clockOut as string), "HH:mm") : "",
        "8.0"
      ].join(",");
    });
    return [headers.join(","), ...rows].join("\n");
  };

  const downloadCSV = (csv: string, filename: string) => {
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement("a");
    const url = URL.createObjectURL(blob);
    link.setAttribute("href", url);
    link.setAttribute("download", filename);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Reports</h1>
          <p className="text-muted-foreground mt-1">Export attendance data for payroll and compliance</p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Card className="border-2">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <FileSpreadsheet className="w-5 h-5 text-primary" />
              Monthly Attendance Export
            </CardTitle>
            <CardDescription>
              Generate a comprehensive CSV report of all employee clock-ins and clock-outs for a specific month.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="space-y-2">
              <label className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70">
                Select Month
              </label>
              <Select defaultValue={monthStr} onValueChange={(val) => setMonth(new Date(val + "-01"))}>
                <SelectTrigger>
                  <SelectValue placeholder="Select month" />
                </SelectTrigger>
                <SelectContent>
                  {[0, 1, 2, 3, 4, 5].map((i) => {
                    const d = new Date();
                    d.setMonth(d.getMonth() - i);
                    const val = format(d, "yyyy-MM");
                    const label = format(d, "MMMM yyyy");
                    return <SelectItem key={val} value={val}>{label}</SelectItem>;
                  })}
                </SelectContent>
              </Select>
            </div>
            
            <div className="bg-muted p-4 rounded-lg">
              <h4 className="font-medium mb-2 text-sm">Included in this report:</h4>
              <ul className="text-sm text-muted-foreground space-y-1 list-disc list-inside ml-4">
                <li>Employee details (ID, Name, Role)</li>
                <li>Daily clock-in and clock-out timestamps</li>
                <li>Total hours calculated per day</li>
                <li>Absence markers for expected workdays</li>
              </ul>
            </div>

            <Button size="lg" className="w-full" onClick={handleExport} disabled={isLoading}>
              <FileDown className="w-5 h-5 mr-2" />
              {isLoading ? "Generating..." : `Export ${format(month, "MMMM yyyy")} Data`}
            </Button>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
