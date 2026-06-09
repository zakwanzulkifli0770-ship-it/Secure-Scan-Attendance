import { Router } from "express";
import path from "path";
import fs from "fs";
import { db } from "@workspace/db";
import { attendanceTable, qrTokensTable, employeesTable } from "@workspace/db";
import { eq, and, gt, desc, gte, lte, sql } from "drizzle-orm";
import { requireAuth } from "../middlewares/auth";
import {
  ClockInBody,
  ClockOutBody,
  GetMyAttendanceHistoryQueryParams,
  ListAttendanceQueryParams,
} from "@workspace/api-zod";

const router = Router();

const COMPANY_LAT = 0; // Set to your company latitude
const COMPANY_LNG = 0; // Set to your company longitude
const RADIUS_METERS = 100;
// If COMPANY_LAT/LNG are 0, skip GPS validation (for demo)
const GPS_VALIDATION_ENABLED = false;

function getDistanceMeters(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const R = 6371000;
  const phi1 = (lat1 * Math.PI) / 180;
  const phi2 = (lat2 * Math.PI) / 180;
  const dphi = ((lat2 - lat1) * Math.PI) / 180;
  const dlambda = ((lng2 - lng1) * Math.PI) / 180;
  const a =
    Math.sin(dphi / 2) ** 2 +
    Math.cos(phi1) * Math.cos(phi2) * Math.sin(dlambda / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

function getUploadsDir(): string {
  // Vercel serverless: only /tmp is writable
  if (process.env.VERCEL) return "/tmp/uploads";
  const cwd = process.cwd();
  const root = cwd.endsWith(path.join("artifacts", "api-server"))
    ? path.resolve(cwd, "../..")
    : cwd;
  return path.resolve(root, "artifacts/api-server/uploads");
}

function saveSelfie(base64Data: string, employeeId: number, type: "in" | "out"): string | null {
  try {
    const uploadsDir = getUploadsDir();
    if (!fs.existsSync(uploadsDir)) {
      fs.mkdirSync(uploadsDir, { recursive: true });
    }
    const matches = base64Data.match(/^data:([A-Za-z-+/]+);base64,(.+)$/);
    if (!matches) return null;
    const buffer = Buffer.from(matches[2], "base64");
    const filename = `selfie_${employeeId}_${type}_${Date.now()}.jpg`;
    const filepath = path.join(uploadsDir, filename);
    fs.writeFileSync(filepath, buffer);
    return `/api/uploads/${filename}`;
  } catch {
    return null;
  }
}

router.post("/attendance/clock-in", requireAuth, async (req, res): Promise<void> => {
  const parsed = ClockInBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "Invalid request body" });
    return;
  }

  const { token, latitude, longitude, selfieBase64 } = parsed.data;
  const employeeId = req.user!.id;

  try {
    // Validate QR token
    const now = new Date();
    const [qrToken] = await db
      .select()
      .from(qrTokensTable)
      .where(and(eq(qrTokensTable.token, token), gt(qrTokensTable.expiresAt, now)))
      .limit(1);

    if (!qrToken) {
      res.status(400).json({ error: "Invalid or expired QR token" });
      return;
    }

    // Check GPS radius if enabled
    if (GPS_VALIDATION_ENABLED && COMPANY_LAT !== 0) {
      const distance = getDistanceMeters(latitude, longitude, COMPANY_LAT, COMPANY_LNG);
      if (distance > RADIUS_METERS) {
        res.status(400).json({
          error: `You are ${Math.round(distance)}m away. Must be within ${RADIUS_METERS}m of office.`,
        });
        return;
      }
    }

    // Check for duplicate clock-in today
    const todayStr = now.toISOString().split("T")[0];
    const [existing] = await db
      .select()
      .from(attendanceTable)
      .where(
        and(eq(attendanceTable.employeeId, employeeId), eq(attendanceTable.date, todayStr))
      )
      .limit(1);

    if (existing) {
      res.status(400).json({ error: "Already clocked in today" });
      return;
    }

    // Save selfie
    let selfieUrl: string | null = null;
    if (selfieBase64) {
      selfieUrl = saveSelfie(selfieBase64, employeeId, "in");
    }

    const [record] = await db
      .insert(attendanceTable)
      .values({
        employeeId,
        date: todayStr,
        clockIn: now,
        latitude,
        longitude,
        selfieUrl,
      })
      .returning();

    res.status(201).json(record);
  } catch (err) {
    req.log.error({ err }, "Clock in error");
    res.status(500).json({ error: "Internal server error" });
  }
});

router.post("/attendance/clock-out", requireAuth, async (req, res): Promise<void> => {
  const parsed = ClockOutBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "Invalid request body" });
    return;
  }

  const { token, latitude, longitude, selfieBase64 } = parsed.data;
  const employeeId = req.user!.id;

  try {
    const now = new Date();

    // Validate QR token
    const [qrToken] = await db
      .select()
      .from(qrTokensTable)
      .where(and(eq(qrTokensTable.token, token), gt(qrTokensTable.expiresAt, now)))
      .limit(1);

    if (!qrToken) {
      res.status(400).json({ error: "Invalid or expired QR token" });
      return;
    }

    // Check GPS radius if enabled
    if (GPS_VALIDATION_ENABLED && COMPANY_LAT !== 0) {
      const distance = getDistanceMeters(latitude, longitude, COMPANY_LAT, COMPANY_LNG);
      if (distance > RADIUS_METERS) {
        res.status(400).json({
          error: `You are ${Math.round(distance)}m away. Must be within ${RADIUS_METERS}m of office.`,
        });
        return;
      }
    }

    // Find today's record
    const todayStr = now.toISOString().split("T")[0];
    const [existing] = await db
      .select()
      .from(attendanceTable)
      .where(
        and(eq(attendanceTable.employeeId, employeeId), eq(attendanceTable.date, todayStr))
      )
      .limit(1);

    if (!existing) {
      res.status(400).json({ error: "No clock-in record found for today" });
      return;
    }

    if (existing.clockOut) {
      res.status(400).json({ error: "Already clocked out today" });
      return;
    }

    // Save selfie
    let selfieUrl: string | null = existing.selfieUrl;
    if (selfieBase64) {
      selfieUrl = saveSelfie(selfieBase64, employeeId, "out");
    }

    const [record] = await db
      .update(attendanceTable)
      .set({ clockOut: now, selfieUrl })
      .where(eq(attendanceTable.id, existing.id))
      .returning();

    res.json(record);
  } catch (err) {
    req.log.error({ err }, "Clock out error");
    res.status(500).json({ error: "Internal server error" });
  }
});

router.get("/attendance/today", requireAuth, async (req, res): Promise<void> => {
  const employeeId = req.user!.id;
  const todayStr = new Date().toISOString().split("T")[0];

  try {
    const [record] = await db
      .select()
      .from(attendanceTable)
      .where(
        and(eq(attendanceTable.employeeId, employeeId), eq(attendanceTable.date, todayStr))
      )
      .limit(1);

    res.json({ record: record ?? null });
  } catch (err) {
    req.log.error({ err }, "Get today attendance error");
    res.status(500).json({ error: "Internal server error" });
  }
});

router.get("/attendance/my-history", requireAuth, async (req, res): Promise<void> => {
  const parsed = GetMyAttendanceHistoryQueryParams.safeParse(req.query);
  const month = parsed.success ? parsed.data.month : undefined;
  const employeeId = req.user!.id;

  try {
    let records;
    if (month) {
      const startDate = `${month}-01`;
      const [year, mon] = month.split("-").map(Number);
      const lastDay = new Date(year, mon, 0).getDate();
      const endDate = `${month}-${String(lastDay).padStart(2, "0")}`;
      records = await db
        .select()
        .from(attendanceTable)
        .where(
          and(
            eq(attendanceTable.employeeId, employeeId),
            gte(attendanceTable.date, startDate),
            lte(attendanceTable.date, endDate)
          )
        )
        .orderBy(desc(attendanceTable.date));
    } else {
      records = await db
        .select()
        .from(attendanceTable)
        .where(eq(attendanceTable.employeeId, employeeId))
        .orderBy(desc(attendanceTable.date))
        .limit(60);
    }

    res.json(records);
  } catch (err) {
    req.log.error({ err }, "Get attendance history error");
    res.status(500).json({ error: "Internal server error" });
  }
});

router.get("/attendance", requireAuth, async (req, res): Promise<void> => {
  const parsed = ListAttendanceQueryParams.safeParse(req.query);
  const params = parsed.success ? parsed.data : {};

  try {
    const conditions = [];
    if (params.date) conditions.push(eq(attendanceTable.date, params.date));
    if (params.employeeId) conditions.push(eq(attendanceTable.employeeId, params.employeeId));
    if (params.month) {
      const [year, mon] = params.month.split("-").map(Number);
      const startDate = `${params.month}-01`;
      const lastDay = new Date(year, mon, 0).getDate();
      const endDate = `${params.month}-${String(lastDay).padStart(2, "0")}`;
      conditions.push(gte(attendanceTable.date, startDate));
      conditions.push(lte(attendanceTable.date, endDate));
    }

    const records = await db
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
      .where(conditions.length > 0 ? and(...conditions) : undefined)
      .orderBy(desc(attendanceTable.date), desc(attendanceTable.clockIn));

    res.json(records);
  } catch (err) {
    req.log.error({ err }, "List attendance error");
    res.status(500).json({ error: "Internal server error" });
  }
});

export default router;
