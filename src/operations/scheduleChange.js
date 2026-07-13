/**
 * スケジュール変更操作。
 *
 * SELECTORS はプレースホルダーです。docs/RECORDING_WORKFLOWS.md の手順に従って
 * playwright codegen で実際の操作を記録し、値を置き換えてください。
 */

const fs = require("fs");
const path = require("path");

// 各値は (page) => Locator を返す関数として設定する。
const SELECTORS = {
  // TODO: 利用者名で検索する入力欄
  clientSearchInput: null,
  // TODO: 検索結果の行を、利用者名+訪問日+開始時刻から一意に特定して返す
  //       (page, item) => Locator  形式。複数マッチする場合は呼び出し側で検知します。
  matchingRows: null,
  // TODO: 検索結果行を開いて編集画面に入る操作 (page, rowLocator) => Promise<void>
  openEditForm: null,
  // TODO: 開始時刻の入力欄
  startTimeInput: null,
  // TODO: 終了時刻の入力欄
  endTimeInput: null,
  // TODO: 備考欄（あれば）
  noteInput: null,
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
    .filter(([, value]) => value === null)
    .map(([key]) => key);
  if (missing.length > 0) {
    throw new OperationError(
      `src/operations/scheduleChange.js の SELECTORS が未設定です: ${missing.join(", ")}\n` +
        `docs/RECORDING_WORKFLOWS.md の手順に従って実際のセレクタを設定してください。`
    );
  }
}

async function findEntry(page, item) {
  assertSelectorsConfigured();
  await SELECTORS.clientSearchInput(page).fill(item.clientName);

  const rows = SELECTORS.matchingRows(page, item);
  const count = await rows.count();

  if (count === 0) {
    throw new OperationError(
      `対象が見つかりませんでした: ${item.clientName} / ${item.visitDate} ${item.originalStartTime}`
    );
  }
  if (count > 1) {
    throw new AmbiguousMatchError(
      `対象が複数見つかりました（${count}件）。clientId を指定して一意に特定してください: ` +
        `${item.clientName} / ${item.visitDate} ${item.originalStartTime}`
    );
  }
  return rows.first();
}

async function applyChange(page, item, { dryRun, diagnosticsDir } = {}) {
  const row = await findEntry(page, item);
  await SELECTORS.openEditForm(page, row);

  await SELECTORS.startTimeInput(page).fill(item.newStartTime);
  await SELECTORS.endTimeInput(page).fill(item.newEndTime);
  if (item.note) {
    await SELECTORS.noteInput(page).fill(item.note);
  }

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

module.exports = { findEntry, applyChange, AmbiguousMatchError, OperationError, SELECTORS };
