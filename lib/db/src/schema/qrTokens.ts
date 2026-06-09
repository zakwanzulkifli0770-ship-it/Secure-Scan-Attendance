import { pgTable, serial, text, timestamp } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const qrTokensTable = pgTable("qr_tokens", {
  id: serial("id").primaryKey(),
  token: text("token").notNull().unique(),
  expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const insertQrTokenSchema = createInsertSchema(qrTokensTable).omit({
  id: true,
  createdAt: true,
});

export type InsertQrToken = z.infer<typeof insertQrTokenSchema>;
export type QrToken = typeof qrTokensTable.$inferSelect;
