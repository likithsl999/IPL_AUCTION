import { pgTable, serial, text, real, integer, boolean } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const playersTable = pgTable("players", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  role: text("role").notNull(), // Batsman, Bowler, All-rounder, Wicketkeeper
  basePrice: real("base_price").notNull(), // in Crores
  skillRating: integer("skill_rating").notNull(), // 1-100 overall
  nationality: text("nationality").notNull(),
  sold: boolean("sold").notNull().default(false),
  soldTo: text("sold_to"), // team id
  soldPrice: real("sold_price"),
  // Extended stats
  battingRating: integer("batting_rating").notNull().default(50),
  bowlingRating: integer("bowling_rating").notNull().default(50),
  fieldingRating: integer("fielding_rating").notNull().default(70),
  age: integer("age").notNull().default(25),
  experience: integer("experience").notNull().default(3), // IPL seasons
  form: integer("form").notNull().default(70), // recent form 1-100
  strikeRate: real("strike_rate").notNull().default(130), // T20 strike rate
  economy: real("economy").notNull().default(8.0), // bowling economy
  strengths: text("strengths").notNull().default(""), // comma-separated
  weaknesses: text("weaknesses").notNull().default(""),
});

export const insertPlayerSchema = createInsertSchema(playersTable).omit({ id: true });
export type InsertPlayer = z.infer<typeof insertPlayerSchema>;
export type Player = typeof playersTable.$inferSelect;
