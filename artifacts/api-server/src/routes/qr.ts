import { Router } from "express";
import { v4 as uuidv4 } from "uuid";
import { db } from "@workspace/db";
import { qrTokensTable } from "@workspace/db";
import { desc, gt } from "drizzle-orm";
import { requireAuth, requireAdmin } from "../middlewares/auth";

const router = Router();

router.post("/qr/generate", requireAuth, requireAdmin, async (req, res): Promise<void> => {
  try {
    const token = uuidv4();
    const expiresAt = new Date(Date.now() + 5 * 60 * 1000); // 5 minutes

    const [qrToken] = await db
      .insert(qrTokensTable)
      .values({ token, expiresAt })
      .returning();

    res.status(201).json(qrToken);
  } catch (err) {
    req.log.error({ err }, "Generate QR token error");
    res.status(500).json({ error: "Internal server error" });
  }
});

router.get("/qr/current", requireAuth, requireAdmin, async (req, res): Promise<void> => {
  try {
    const now = new Date();
    const [qrToken] = await db
      .select()
      .from(qrTokensTable)
      .where(gt(qrTokensTable.expiresAt, now))
      .orderBy(desc(qrTokensTable.createdAt))
      .limit(1);

    if (!qrToken) {
      res.status(404).json({ error: "No active QR token. Generate a new one." });
      return;
    }

    res.json(qrToken);
  } catch (err) {
    req.log.error({ err }, "Get current QR token error");
    res.status(500).json({ error: "Internal server error" });
  }
});

export default router;
