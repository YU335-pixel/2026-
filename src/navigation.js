/**
 * ログイン後、スケジュール一覧（週表示・職員別）画面まで遷移する処理。
 *
 * 「訪問看護/2860991096」はこの事業所固有の画面リンク（サービス種別+事業所ID）。
 * 他の事業所で使う場合はここを実際のリンク文言に置き換える必要がある。
 */

const SELECTORS = {
  receiptLink: (page) => page.getByRole("link", { name: "レセプト" }),
  visitNursingLink: (page) => page.getByRole("link", { name: "訪問看護/2860991096" }),
  groupMembersSelect: (page) => page.locator("#lsGroupMembersSelected"),
  // 週送りボタン。«/»はさらに大きい単位の移動の可能性があるため、確実な
  // 1週間単位である < / > のみを使う。
  prevWeekButton: (page) => page.getByRole("button", { name: "<" }),
  nextWeekButton: (page) => page.getByRole("button", { name: ">" }),
};

const STAFF_SCHEDULE_URL = "https://r.kaipoke.biz/bizhnc/staffSchedule/searchScheduleStaff/";

class NavigationError extends Error {
  constructor(message) {
    super(message);
    this.name = "NavigationError";
  }
}

async function goToStaffSchedule(page) {
  await SELECTORS.receiptLink(page).click();
  await SELECTORS.visitNursingLink(page).click();

  // findVisitLinks は表示中のスタッフの行しか探せないため、対象の訪問がどの
  // スタッフの行にあっても見つかるよう、選択可能な職員を全員表示対象にする。
  const groupSelect = SELECTORS.groupMembersSelect(page);
  const allValues = await groupSelect.locator("option").evaluateAll((opts) => opts.map((o) => o.value));
  await groupSelect.selectOption(allValues);

  // selectOptionがカイポケ側の画面更新（ポストバック）を引き起こすことがあり、
  // それが終わる前に次のgoto()を発行すると ERR_ABORTED になる。落ち着くまで待つ。
  await page.waitForLoadState("networkidle").catch(() => {});

  await page.goto(STAFF_SCHEDULE_URL);
}

async function getDisplayedDayParams(page) {
  const hrefs = await page
    .locator("#weeklyShifts thead th a")
    .evaluateAll((links) => links.map((a) => a.getAttribute("href") || ""));
  return hrefs
    .map((href) => {
      const match = href.match(/day=(\d{8})/);
      return match ? match[1] : null;
    })
    .filter(Boolean);
}

/**
 * 週送りボタンをクリックし、対象日が表示される週まで移動する。
 * ボタンクリックはページ遷移ではなくAJAX的な再描画のため、ヘッダーの日付が
 * 変わるのを待ってから次の判定を行う。
 */
async function navigateToDate(page, visitDate) {
  const targetDayParam = visitDate.replace(/-/g, "");
  const MAX_WEEK_JUMPS = 60; // 安全のための上限（約1年強）

  for (let i = 0; i < MAX_WEEK_JUMPS; i++) {
    const displayed = await getDisplayedDayParams(page);
    if (displayed.includes(targetDayParam)) {
      return;
    }
    const firstDisplayed = displayed[0];
    if (!firstDisplayed) {
      throw new NavigationError("表示中の週の日付を取得できませんでした。");
    }

    const button =
      targetDayParam < firstDisplayed ? SELECTORS.prevWeekButton(page) : SELECTORS.nextWeekButton(page);
    await button.click();

    await page.waitForFunction(
      (prevFirst) => {
        const a = document.querySelector("#weeklyShifts thead th a");
        const href = a && a.getAttribute("href");
        return !!href && !href.includes(`day=${prevFirst}`);
      },
      firstDisplayed,
      { timeout: 10000 }
    );
  }

  throw new NavigationError(`週の移動が上限回数(${MAX_WEEK_JUMPS}回)に達しました（対象日: ${visitDate}）。`);
}

module.exports = { goToStaffSchedule, navigateToDate, SELECTORS, STAFF_SCHEDULE_URL, NavigationError };
