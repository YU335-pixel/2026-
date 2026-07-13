/**
 * 訪問予定を開くと表示される編集ポップアップの共通操作。
 * スケジュール変更・スタッフ割当の両方がこのポップアップを使って保存する。
 */

const SELECTORS = {
  // 日付選択（月表示のカレンダーではなく、日番号のリンク一覧のようです）
  dayLink: (page, day) =>
    page.locator("#simple-select-days-range").getByRole("link", { name: String(day), exact: true }),
  startHourSelect: (page) => page.locator("#inPopupStartHour"),
  startMinuteSelect: (page) => page.locator("#inPopupStartMinute1"),
  endHourSelect: (page) => page.locator("#inPopupEndHour"),
  endMinuteSelect: (page) => page.locator("#inPopupEndMinute1"),
  staffEntryButton: (page) => page.getByRole("button", { name: "職員情報入力" }),
  staffSelect: (page) => page.locator('select[name="chargeStaff1Id1"]'),
  saveButton: (page) => page.getByRole("button", { name: "登録する" }),
};

class PopupError extends Error {
  constructor(message) {
    super(message);
    this.name = "PopupError";
  }
}

async function setDate(page, visitDate) {
  const day = Number(visitDate.split("-")[2]);
  await SELECTORS.dayLink(page, day).click();
}

async function setTime(page, startTime, endTime) {
  const [startHour, startMinute] = startTime.split(":");
  const [endHour, endMinute] = endTime.split(":");
  await SELECTORS.startHourSelect(page).selectOption(String(Number(startHour)));
  await SELECTORS.startMinuteSelect(page).selectOption(String(Number(startMinute)));
  await SELECTORS.endHourSelect(page).selectOption(String(Number(endHour)));
  await SELECTORS.endMinuteSelect(page).selectOption(String(Number(endMinute)));
}

async function assignStaff(page, staffName, { replaceExisting = false } = {}) {
  await SELECTORS.staffEntryButton(page).click();
  const select = SELECTORS.staffSelect(page);
  const currentLabel = await select.evaluate((el) => el.options[el.selectedIndex]?.text?.trim() || "");
  if (currentLabel && currentLabel !== staffName && !replaceExisting) {
    throw new PopupError(
      `既に別のスタッフ（${currentLabel}）が割り当てられています。上書きする場合は replaceExistingStaff: true を指定してください。`
    );
  }
  await select.selectOption({ label: staffName });
}

async function save(page) {
  const button = SELECTORS.saveButton(page);
  await button.click();
  // 明示的な成功メッセージが無いため、ポップアップが閉じる（保存ボタンがDOMから
  // 消える/非表示になる）ことを保存成功の代理指標とする。
  await button.waitFor({ state: "hidden", timeout: 10000 });
}

module.exports = { SELECTORS, setDate, setTime, assignStaff, save, PopupError };
