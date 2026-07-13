/**
 * スタッフ訪問スケジュール組み操作。
 *
 * SELECTORS はプレースホルダーです。docs/RECORDING_WORKFLOWS.md の手順に従って
 * playwright codegen で実際の操作を記録し、値を置き換えてください。
 */

const fs = require("fs");
const path = require("path");

// 各値は (page) => Locator を返す関数として設定する。
const SELECTORS = {
  // TODO: 利用者名・訪問日で対象の訪問枠を検索する入力欄
  visitSearchInput: null,
  // TODO: 検索結果から利用者名+訪問日+開始時刻に一致する行を返す
  //       (page, item) => Locator  形式。複数マッチする場合は呼び出し側で検知します。
  matchingRows: null,
  // TODO: 検索結果行を開いてスタッフ割当画面に入る操作 (page, rowLocator) => Promise<void>
  openAssignForm: null,
  // TODO: 既に別スタッフが割り当て済みの場合に表示される要素（replaceExistingStaff判定用、なければnullのまま）
  existingStaffIndicator: null,
  // TODO: スタッフ名の入力/選択欄
  staffSearchInput: null,
  // TODO: スタッフ検索結果から一致する候補を選ぶ操作 (page, staffName) => Promise<void>
  selectStaffOption: null,
  // TODO: 保存ボタン
  saveButton: null,
  // TODO: 保存成功を示す要素（トースト、確認ダイアログ等）
  successIndicator: null,
};

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

function assertSelectorsConfigured() {
  const missing = Object.entries(SELECTORS)
    .filter(([key, value]) => value === null && key !== "existingStaffIndicator")
    .map(([key]) => key);
  if (missing.length > 0) {
    throw new OperationError(
      `src/operations/staffAssignment.js の SELECTORS が未設定です: ${missing.join(", ")}\n` +
        `docs/RECORDING_WORKFLOWS.md の手順に従って実際のセレクタを設定してください。`
    );
  }
}

async function findVisitSlot(page, item) {
  assertSelectorsConfigured();
  await SELECTORS.visitSearchInput(page).fill(item.clientName);

  const rows = SELECTORS.matchingRows(page, item);
  const count = await rows.count();

  if (count === 0) {
    throw new OperationError(
      `対象の訪問枠が見つかりませんでした: ${item.clientName} / ${item.visitDate} ${item.startTime}`
    );
  }
  if (count > 1) {
    throw new AmbiguousMatchError(
      `対象の訪問枠が複数見つかりました（${count}件）。clientId を指定して一意に特定してください: ` +
        `${item.clientName} / ${item.visitDate} ${item.startTime}`
    );
  }
  return rows.first();
}

async function applyAssignment(page, item, { dryRun, diagnosticsDir } = {}) {
  const row = await findVisitSlot(page, item);
  await SELECTORS.openAssignForm(page, row);

  if (SELECTORS.existingStaffIndicator) {
    const hasExisting = await SELECTORS.existingStaffIndicator(page)
      .isVisible()
      .catch(() => false);
    if (hasExisting && !item.replaceExistingStaff) {
      throw new OperationError(
        `既に別のスタッフが割り当て済みです。上書きする場合は replaceExistingStaff: true を指定してください: ` +
          `${item.clientName} / ${item.visitDate} ${item.startTime}`
      );
    }
  }

  await SELECTORS.staffSearchInput(page).fill(item.staffName);
  await SELECTORS.selectStaffOption(page, item.staffName);

  if (dryRun) {
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

  await SELECTORS.saveButton(page).click();

  try {
    await SELECTORS.successIndicator(page).waitFor({ timeout: 10000 });
  } catch {
    throw new OperationError(
      `保存後に成功表示が確認できませんでした: ${item.clientName} / ${item.visitDate}`
    );
  }

  return { status: "applied" };
}

module.exports = { findVisitSlot, applyAssignment, AmbiguousMatchError, OperationError, SELECTORS };
