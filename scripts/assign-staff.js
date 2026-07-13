#!/usr/bin/env node

const fs = require("fs");

const { loadConfig } = require("../src/config");
const { Logger } = require("../src/logger");
const { parseArgs, confirmChange } = require("../src/cli");
const { launchContext, saveSessionState, closeContext } = require("../src/browser");
const { login } = require("../src/auth");
const { goToStaffSchedule } = require("../src/navigation");
const {
  applyAssignment,
  AmbiguousMatchError,
  OperationError,
} = require("../src/operations/staffAssignment");
const { staffAssignmentFileSchema } = require("../src/schemas/staffAssignment.schema");

function formatDiff(item) {
  return (
    `${item.clientName} / ${item.visitDate} ${item.startTime}〜${item.endTime}: ` +
    `→ ${item.staffName}${item.replaceExistingStaff ? "（既存スタッフを上書き）" : ""}`
  );
}

async function main() {
  const args = parseArgs(process.argv);
  const config = loadConfig();
  const logger = new Logger(config.paths.logsDir);

  const raw = JSON.parse(fs.readFileSync(args.inputPath, "utf8"));
  const parsed = staffAssignmentFileSchema.parse(raw);

  const { browser, context } = await launchContext(config, { headless: args.headless });
  const page = await context.newPage();

  let failed = false;
  try {
    await login(page, config, logger);
    await saveSessionState(context, config);
    await goToStaffSchedule(page);

    for (const item of parsed.assignments) {
      const diffText = formatDiff(item);
      try {
        if (!args.dryRun && !args.yes) {
          const confirmed = await confirmChange(diffText);
          if (!confirmed) {
            logger.info("skipped by user", item);
            continue;
          }
        }

        const result = await applyAssignment(page, item, {
          dryRun: args.dryRun,
          diagnosticsDir: config.paths.diagnosticsDir,
        });
        logger.info(`${result.status}: ${diffText}`, item);
      } catch (err) {
        failed = true;
        logger.error(`failed: ${diffText} — ${err.message}`, item);
        if (err instanceof AmbiguousMatchError || err instanceof OperationError) {
          if (!args.continueOnError) {
            throw err;
          }
          continue;
        }
        throw err;
      }
    }
  } catch (err) {
    failed = true;
    logger.error(err.message);
    throw err;
  } finally {
    await closeContext(browser, context, config, { failed, label: "assign-staff" });
  }
}

main().catch((err) => {
  console.error(err.message);
  process.exit(1);
});
