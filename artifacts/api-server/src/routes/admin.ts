import { Router } from "express";
import { db } from "@workspace/db";
import { attendanceTable, employeesTable } from "@workspace/db";
import { eq, and, gte, lte, sql, desc, count } from "drizzle-orm";
import { requireAuth, requireAdmin } from "../middlewares/auth";
import { ExportAttendanceQueryParams } from "@workspace/api-zod";

const router = Router();

router.get("/admin/dashboard", requireAuth, requireAdmin, async (req, res): Promise<void> => {
  try {
    const todayStr = new Date().toISOString().split("T")[0];

    // Total employees
    const [{ total }] = await db
      .select({ total: count() })
      .from(employeesTable)
      .where(eq(employeesTable.role, "employee"));

    // Present today
    const [{ present }] = await db
      .select({ present: count() })
      .from(attendanceTable)
      .where(eq(attendanceTable.date, todayStr));

    const totalEmployees = Number(total);
    const presentToday = Number(present);
    const absentToday = Math.max(0, totalEmployees - presentToday);

    // Late today (clocked in after 9:00 AM)
    const lateRecords = await db
      .select({ clockIn: attendanceTable.clockIn })
      .from(attendanceTable)
      .where(eq(attendanceTable.date, todayStr));

    const lateToday = lateRecords.filter((r) => {
      const hour = new Date(r.clockIn).getHours();
      return hour >= 9;
    }).length;

    // Avg hours this month
    const now = new Date();
    const startOfMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-01`;
    const endOfMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate()).padStart(2, "0")}`;

    const monthRecords = await db
      .select({
        clockIn: attendanceTable.clockIn,
        clockOut: attendanceTable.clockOut,
      })
      .from(attendanceTable)
      .where(
        and(
          gte(attendanceTable.date, startOfMonth),
          lte(attendanceTable.date, endOfMonth)
        )
      );

    const completedRecords = monthRecords.filter((r) => r.clockOut !== null);
    let avgHoursThisMonth = 0;
    if (completedRecords.length > 0) {
      const totalMs = completedRecords.reduce((sum, r) => {
        const ms =
          new Date(r.clockOut!).getTime() - new Date(r.clockIn).getTime();
        return sum + ms;
      }, 0);
      avgHoursThisMonth = parseFloat((totalMs / completedRecords.length / 3600000).toFixed(2));
    }

    // Recent attendance (last 10 with employee info)
    const recentAttendance = await db
      .select({
        id: attendanceTable.id,
        employeeId: attendanceTable.employeeId,
        date: attendanceTable.date,
        clockIn: attendanceTable.clockIn,
        clockOut: attendanceTable.clockOut,
        latitude: attendanceTable.latitude,
        longitude: attendanceTable.longitude,
        selfieUrl: attendanceTable.selfieUrl,
        createdAt: attendanceTable.createdAt,
        employee: {
          id: employeesTable.id,
          employeeId: employeesTable.employeeId,
          name: employeesTable.name,
          email: employeesTable.email,
          role: employeesTable.role,
          createdAt: employeesTable.createdAt,
        },
      })
      .from(attendanceTable)
      .innerJoin(employeesTable, eq(attendanceTable.employeeId, employeesTable.id))
      .orderBy(desc(attendanceTable.clockIn))
      .limit(10);

    res.json({
      totalEmployees,
      presentToday,
      absentToday,
      lateToday,
      avgHoursThisMonth,
      recentAttendance,
    });
  } catch (err) {
    req.log.error({ err }, "Dashboard error");
    res.status(500).json({ error: "Internal server error" });
  }
});

router.get("/admin/attendance/export", requireAuth, requireAdmin, async (req, res): Promise<void> => {
  const parsed = ExportAttendanceQueryParams.safeParse(req.query);
  const params = parsed.success ? parsed.data : {};

  try {
    const conditions = [];
    if (params.month) {
      const [year, mon] = params.month.split("-").map(Number);
      const startDate = `${params.month}-01`;
      const lastDay = new Date(year, mon, 0).getDate();
      const endDate = `${params.month}-${String(lastDay).padStart(2, "0")}`;
      conditions.push(gte(attendanceTable.date, startDate));
      conditions.push(lte(attendanceTable.date, endDate));
    }
    if (params.employeeId) {
      conditions.push(eq(attendanceTable.employeeId, params.employeeId));
    }

    const records = await db
      .select({
        date: attendanceTable.date,
        clockIn: attendanceTable.clockIn,
        clockOut: attendanceTable.clockOut,
        name: employeesTable.name,
        employeeId: employeesTable.employeeId,
        email: employeesTable.email,
      })
      .from(attendanceTable)
      .innerJoin(employeesTable, eq(attendanceTable.employeeId, employeesTable.id))
      .where(conditions.length > 0 ? and(...conditions) : undefined)
      .orderBy(attendanceTable.date);

    const csvLines = [
      "Employee ID,Name,Email,Date,Clock In,Clock Out,Hours Worked",
      ...records.map((r) => {
        const hoursWorked =
          r.clockOut
            ? ((new Date(r.clockOut).getTime() - new Date(r.clockIn).getTime()) / 3600000).toFixed(2)
            : "N/A";
        return [
          r.employeeId,
          r.name,
          r.email,
          r.date,
          new Date(r.clockIn).toISOString(),
          r.clockOut ? new Date(r.clockOut).toISOString() : "N/A",
          hoursWorked,
        ].join(",");
      }),
    ];

    const csv = csvLines.join("\n");
    res.setHeader("Content-Type", "text/csv");
    res.setHeader(
      "Content-Disposition",
      `attachment; filename="attendance_${params.month ?? "all"}.csv"`
    );
    res.send(csv);
  } catch (err) {
    req.log.error({ err }, "Export attendance error");
    res.status(500).json({ error: "Internal server error" });
  }
});

export default router;
