const { z } = require("zod");

const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;
const TIME_RE = /^\d{2}:\d{2}$/;

const scheduleChangeItemSchema = z.object({
  clientName: z.string().min(1, "clientName は必須です"),
  clientId: z.string().min(1).nullable().optional().default(null),
  visitDate: z.string().regex(DATE_RE, "visitDate は YYYY-MM-DD 形式で指定してください"),
  originalStartTime: z.string().regex(TIME_RE, "originalStartTime は HH:MM 形式で指定してください"),
  newStartTime: z.string().regex(TIME_RE, "newStartTime は HH:MM 形式で指定してください"),
  newEndTime: z.string().regex(TIME_RE, "newEndTime は HH:MM 形式で指定してください"),
  // カイポケ実際のサービス区分値が未確認のため、決め打ちのenumにはしていません。
  visitType: z.string().min(1, "visitType は必須です"),
  note: z.string().optional().default(""),
});

const scheduleChangeFileSchema = z.object({
  changes: z.array(scheduleChangeItemSchema).min(1, "changes は1件以上必要です"),
});

module.exports = { scheduleChangeItemSchema, scheduleChangeFileSchema };
