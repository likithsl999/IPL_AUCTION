import { pgTable, serial, text, real, integer, boolean } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const playersTable = pgTable("players", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  role: text("role").notNull(), // Batsman, Bowler, All-rounder, Wicketkeeper
  basePrice: real("base_price").notNull(), // in Crores
  skillRating: integer("skill_rating").notNull(), // 1-100
  nationality: text("nationality").notNull(),
  sold: boolean("sold").notNull().default(false),
  soldTo: text("sold_to"), // team id
  soldPrice: real("sold_price"),
});

export const insertPlayerSchema = createInsertSchema(playersTable).omit({ id: true });
export type InsertPlayer = z.infer<typeof insertPlayerSchema>;
export type Player = typeof playersTable.$inferSelect;
