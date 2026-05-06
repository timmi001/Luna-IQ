import { pgTable, serial, text, date, jsonb, timestamp } from "drizzle-orm/pg-core";

export const lunaInsightsTable = pgTable("luna_insights", {
  id: serial("id").primaryKey(),
  userId: text("user_id").notNull(),
  date: date("date").notNull(),
  insightData: jsonb("insight_data").notNull(),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export type LunaInsight = typeof lunaInsightsTable.$inferSelect;
