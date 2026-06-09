import React from "react";
import { format } from "date-fns";
import { Users, UserCheck, UserX, Clock, ArrowUpRight } from "lucide-react";
import { useGetAdminDashboard, getGetAdminDashboardQueryKey } from "@workspace/api-client-react";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";

export default function Dashboard() {
  const { data: stats, isLoading } = useGetAdminDashboard({
    query: {
      queryKey: getGetAdminDashboardQueryKey(),
    }
  });

  if (isLoading) {
    return (
      <div className="space-y-6">
        <h1 className="text-3xl font-bold">Dashboard</h1>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-32 rounded-xl" />
          ))}
        </div>
        <Skeleton className="h-96 rounded-xl" />
      </div>
    );
  }

  if (!stats) return null;

  const statCards = [
    { title: "Total Employees", value: stats.totalEmployees, icon: Users, color: "text-blue-500", bg: "bg-blue-500/10" },
    { title: "Present Today", value: stats.presentToday, icon: UserCheck, color: "text-green-500", bg: "bg-green-500/10" },
    { title: "Absent Today", value: stats.absentToday, icon: UserX, color: "text-red-500", bg: "bg-red-500/10" },
    { title: "Avg Hours/Mo", value: stats.avgHoursThisMonth.toFixed(1), icon: Clock, color: "text-purple-500", bg: "bg-purple-500/10" },
  ];

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-bold tracking-tight">Overview</h1>
        <p className="text-sm text-muted-foreground">{format(new Date(), "EEEE, MMMM d, yyyy")}</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {statCards.map((card, i) => (
          <Card key={i} className="hover-elevate">
            <CardContent className="p-6 flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground mb-1">{card.title}</p>
                <h3 className="text-3xl font-bold">{card.value}</h3>
              </div>
              <div className={`p-4 rounded-full ${card.bg}`}>
                <card.icon className={`w-6 h-6 ${card.color}`} />
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <Card className="lg:col-span-2 shadow-sm">
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle>Recent Activity</CardTitle>
            <Button variant="ghost" size="sm" className="text-primary h-8">
              View All <ArrowUpRight className="ml-2 w-4 h-4" />
            </Button>
          </CardHeader>
          <CardContent>
            <div className="space-y-6">
              {stats.recentAttendance.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  <Clock className="w-12 h-12 mx-auto mb-3 opacity-20" />
                  <p>No recent activity</p>
                </div>
              ) : (
                stats.recentAttendance.map((record) => (
                  <div key={record.id} className="flex items-center justify-between border-b pb-4 last:border-0 last:pb-0">
                    <div className="flex items-center gap-4">
                      <Avatar>
                        <AvatarImage src={record.selfieUrl || undefined} />
                        <AvatarFallback>{record.employee.name.substring(0, 2).toUpperCase()}</AvatarFallback>
                      </Avatar>
                      <div>
                        <p className="font-medium">{record.employee.name}</p>
                        <p className="text-xs text-muted-foreground">
                          {record.clockOut ? "Clocked out" : "Clocked in"} at{" "}
                          {format(new Date(record.clockOut || record.clockIn), "h:mm a")}
                        </p>
                      </div>
                    </div>
                    <Badge variant={record.clockOut ? "secondary" : "default"}>
                      {record.clockOut ? "Completed" : "Active"}
                    </Badge>
                  </div>
                ))
              )}
            </div>
          </CardContent>
        </Card>

        <Card className="shadow-sm bg-primary text-primary-foreground border-none relative overflow-hidden">
          <div className="absolute top-0 right-0 p-8 opacity-10">
            <Users className="w-48 h-48" />
          </div>
          <CardHeader>
            <CardTitle className="text-primary-foreground">Quick Stats</CardTitle>
          </CardHeader>
          <CardContent className="relative z-10 space-y-6">
            <div>
              <p className="text-primary-foreground/70 text-sm">Attendance Rate</p>
              <div className="flex items-end gap-2">
                <span className="text-4xl font-bold">
                  {stats.totalEmployees > 0 
                    ? Math.round((stats.presentToday / stats.totalEmployees) * 100) 
                    : 0}%
                </span>
              </div>
            </div>
            <div>
              <p className="text-primary-foreground/70 text-sm">Late Arrivals</p>
              <div className="flex items-end gap-2">
                <span className="text-4xl font-bold">{stats.lateToday}</span>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

// Temporary Button component for the top of the file since it's not imported
function Button({ children, className, variant, size }: any) {
  return <button className={className}>{children}</button>;
}
