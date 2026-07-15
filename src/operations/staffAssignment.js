/**
 * スタッフ訪問スケジュール組み操作（訪問予定への担当スタッフの割当・変更）。
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

async function findVisitSlot(page, item) {
  const links = await findVisitLinks(page, item, "startTime");
  const count = await links.count();

  if (count === 0) {
    throw new OperationError(
      `対象の訪問枠が見つかりませんでした: ${item.clientName} / ${item.visitDate} ${item.startTime}`
    );
  }
  if (count > 1) {
    throw new AmbiguousMatchError(
      `対象の訪問枠が複数見つかりました（${count}件）: ${item.clientName} / ${item.visitDate} ${item.startTime}`
    );
  }
  return links.first();
}

async function applyAssignment(page, item, { dryRun, diagnosticsDir } = {}) {
  const link = await findVisitSlot(page, item);
  await link.click();

  if (dryRun) {
    // dry-runでは職員情報入力ボタンまでは押すが、選択肢の確定・保存はしない。
    await visitPopup.openStaffEntry(page);
    if (diagnosticsDir) {
      fs.mkdirSync(diagnosticsDir, { recursive: true });
      const file = path.join(
        diagnosticsDir,
        `dry-run-assignment-${item.clientName}-${item.visitDate}-${Date.now()}.png`
      );
      await page.screenshot({ path: file });
    }
    return { status: "dry-run-verified" };
  }

  await visitPopup.assignStaff(page, item.staffName, { replaceExisting: item.replaceExistingStaff });
  await visitPopup.save(page);

  return { status: "applied" };
}

module.exports = { findVisitSlot, applyAssignment, AmbiguousMatchError, OperationError };
