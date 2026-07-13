/**
 * スケジュール一覧（週表示・職員別）テーブルの解析。
 *
 * 実際のDOM構造（ユーザーがdevtoolsで確認した実物）:
 * - #weeklyShifts 内のヘッダーテーブルに、日付ごとの <a href=".../monthlyShiftsList?...&day=YYYYMMDD">
 * - #scheduleShifts 内の本体テーブルは <tr staff-id="..."> が1スタッフ=1行、
 *   その中に日付の数だけ <td> が並ぶ（ヘッダーと同じ並び順）
 * - 各訪問予定は <a> の中に <span class="targetTime">開始～終了</span> と
 *   <span class="targetPerson">利用者名</span> を持つ
 */

const { navigateToDate } = require("../navigation");

class TableError extends Error {
  constructor(message) {
    super(message);
    this.name = "TableError";
  }
}

async function resolveDayColumnIndex(page, visitDate) {
  await navigateToDate(page, visitDate);

  const dayParam = visitDate.replace(/-/g, ""); // "2026-07-15" -> "20260715"
  const headerLinks = page.locator("#weeklyShifts thead th a");
  const count = await headerLinks.count();
  for (let i = 0; i < count; i++) {
    const href = await headerLinks.nth(i).getAttribute("href");
    if (href && href.includes(`day=${dayParam}`)) {
      return i;
    }
  }
  throw new TableError(`指定日 (${visitDate}) の週へ移動しましたが、該当する列が見つかりませんでした。`);
}

/**
 * 指定の利用者名・時刻に一致する訪問予定のリンクを返す（0件・複数件どちらもあり得る）。
 * timeField は item のうちどのプロパティを開始時刻として使うか（スケジュール変更は
 * originalStartTime、スタッフ割当は startTime）。
 */
async function findVisitLinks(page, item, timeField) {
  const colIndex = await resolveDayColumnIndex(page, item.visitDate);
  const cells = page.locator(`#scheduleShifts table tbody tr td:nth-of-type(${colIndex + 1})`);
  return cells
    .locator("a")
    .filter({ has: page.locator(".targetPerson", { hasText: item.clientName }) })
    .filter({ has: page.locator(".targetTime", { hasText: item[timeField] }) });
}

module.exports = { resolveDayColumnIndex, findVisitLinks, TableError };
