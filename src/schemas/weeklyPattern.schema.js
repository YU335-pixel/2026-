const { z } = require("zod");

const TIME_RE = /^\d{2}:\d{2}$/;
const WEEKDAYS = ["月", "火", "水", "木", "金", "土", "日"];

const weeklyPatternItemSchema = z.object({
  weekday: z.enum(WEEKDAYS),
  clientName: z.string().min(1, "clientName は必須です"),
  startTime: z.string().regex(TIME_RE, "startTime は HH:MM 形式で指定してください"),
  endTime: z.string().regex(TIME_RE, "endTime は HH:MM 形式で指定してください"),
  staffName: z.string().min(1, "staffName は必須です"),
  visitType: z.string().min(1, "visitType は必須です"),
});

const weeklyPatternFileSchema = z.object({
  pattern: z.array(weeklyPatternItemSchema).min(1, "pattern は1件以上必要です"),
});

module.exports = { weeklyPatternItemSchema, weeklyPatternFileSchema, WEEKDAYS };
