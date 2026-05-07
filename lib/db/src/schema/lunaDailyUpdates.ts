import { pgTable, serial, text, date, timestamp } from "drizzle-orm/pg-core";

export const lunaDailyUpdatesTable = pgTable("luna_daily_updates", {
  id: serial("id").primaryKey(),
  userId: text("user_id").notNull(),
  date: date("date").notNull(),
  updateText: text("update_text").notNull(),
  severity: text("severity").notNull().default("minor"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export type LunaDailyUpdate = typeof lunaDailyUpdatesTable.$inferSelect;
