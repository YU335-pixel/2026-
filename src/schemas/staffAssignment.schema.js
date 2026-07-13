const { z } = require("zod");

const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;
const TIME_RE = /^\d{2}:\d{2}$/;

const staffAssignmentItemSchema = z.object({
  staffName: z.string().min(1, "staffName は必須です"),
  staffId: z.string().min(1).nullable().optional().default(null),
  clientName: z.string().min(1, "clientName は必須です"),
  clientId: z.string().min(1).nullable().optional().default(null),
  visitDate: z.string().regex(DATE_RE, "visitDate は YYYY-MM-DD 形式で指定してください"),
  startTime: z.string().regex(TIME_RE, "startTime は HH:MM 形式で指定してください"),
  endTime: z.string().regex(TIME_RE, "endTime は HH:MM 形式で指定してください"),
  visitType: z.string().min(1, "visitType は必須です"),
  replaceExistingStaff: z.boolean().optional().default(false),
});

const staffAssignmentFileSchema = z.object({
  assignments: z.array(staffAssignmentItemSchema).min(1, "assignments は1件以上必要です"),
});

module.exports = { staffAssignmentItemSchema, staffAssignmentFileSchema };
