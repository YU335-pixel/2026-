/**
 * スケジュール変更操作（同一日内の開始・終了時刻の変更）。
 */

const fs = require("fs");
const path = require("path");

const { findVisitLinks } = require("./scheduleTable");
const visitPopup = require("./visitPopup");

class AmbiguousMatchError extends Error {
  constructor(message) {
    super(message);
    this.name = "AmbiguousMatchError";
  }
}

class OperationError extends Error {
  constructor(message) {
    super(message);
    this.name = "OperationError";
  }
}

async function findEntry(page, item) {
  const links = await findVisitLinks(page, item, "originalStartTime");
  const count = await links.count();

  if (count === 0) {
    throw new OperationError(
      `対象が見つかりませんでした: ${item.clientName} / ${item.visitDate} ${item.originalStartTime}`
    );
  }
  if (count > 1) {
    throw new AmbiguousMatchError(
      `対象が複数見つかりました（${count}件）: ${item.clientName} / ${item.visitDate} ${item.originalStartTime}`
    );
  }
  return links.first();
}

async function applyChange(page, item, { dryRun, diagnosticsDir } = {}) {
  const link = await findEntry(page, item);
  await link.click();

  await visitPopup.setTime(page, item.newStartTime, item.newEndTime);

  if (dryRun) {
    if (diagnosticsDir) {
      fs.mkdirSync(diagnosticsDir, { recursive: true });
      const file = path.join(
        diagnosticsDir,
        `dry-run-schedule-${item.clientName}-${item.visitDate}-${Date.now()}.png`
      );
      await page.screenshot({ path: file });
    }
    return { status: "dry-run-verified" };
  }

  await visitPopup.save(page);

  const confirmItem = { ...item, originalStartTime: item.newStartTime };
  const confirmLinks = await findVisitLinks(page, confirmItem, "originalStartTime");
  const confirmed = (await confirmLinks.count()) > 0;
  if (!confirmed) {
    throw new OperationError(
      `保存後に変更後の時刻（${item.newStartTime}）で対象を確認できませんでした: ` +
        `${item.clientName} / ${item.visitDate}`
    );
  }

  return { status: "applied" };
}

module.exports = { findEntry, applyChange, AmbiguousMatchError, OperationError };
