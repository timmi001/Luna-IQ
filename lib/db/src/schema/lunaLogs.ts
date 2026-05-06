import { pgTable, serial, text, integer, date, jsonb, timestamp } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const lunaLogsTable = pgTable("luna_logs", {
  id: serial("id").primaryKey(),
  userId: text("user_id").notNull(),
  date: date("date").notNull(),
  cyclePhase: text("cycle_phase").notNull(),
  dayOfCycle: integer("day_of_cycle"),
  mood: text("mood").notNull(),
  symptoms: jsonb("symptoms").notNull().$type<string[]>().default([]),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const insertLunaLogSchema = createInsertSchema(lunaLogsTable).omit({ id: true, createdAt: true });
export type InsertLunaLog = z.infer<typeof insertLunaLogSchema>;
export type LunaLog = typeof lunaLogsTable.$inferSelect;
