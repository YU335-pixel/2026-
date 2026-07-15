/**
 * カイポケへのログイン処理。
 *
 * SELECTORS の値はまだプレースホルダーです。docs/RECORDING_WORKFLOWS.md の手順に
 * 従って `playwright codegen` でログインフローを記録し、実際のセレクタに置き換えてください。
 */

const LOGIN_URL = "https://r.kaipoke.biz/kaipokebiz/login/COM020102.do?code=login/";

// 各値は (page) => Locator を返す関数として設定する。
const SELECTORS = {
  corpIdInput: (page) => page.locator('[id="form:corporation_id"]'),
  userIdInput: (page) => page.locator('[id="form:member_login_id"]'),
  passwordInput: (page) => page.locator('[id="form:password"]'),
  submitButton: (page) => page.getByRole("button", { name: "Submit" }),
  // ログイン後に必ず表示される要素として「レセプト」リンクを仮採用。
  // 他にもっと確実な要素があれば教えてください。
  loggedInIndicator: (page) => page.getByRole("link", { name: "レセプト" }),
};

class LoginError extends Error {
  constructor(message) {
    super(message);
    this.name = "LoginError";
  }
}

function assertSelectorsConfigured() {
  const missing = Object.entries(SELECTORS)
    .filter(([, value]) => value === null)
    .map(([key]) => key);
  if (missing.length > 0) {
    throw new LoginError(
      `src/auth.js の SELECTORS が未設定です: ${missing.join(", ")}\n` +
        `docs/RECORDING_WORKFLOWS.md の手順に従って実際のセレクタを記録・設定してください。`
    );
  }
}

async function isLoggedIn(page, { timeoutMs = 8000 } = {}) {
  assertSelectorsConfigured();
  try {
    await SELECTORS.loggedInIndicator(page).waitFor({ timeout: timeoutMs });
    return true;
  } catch {
    return false;
  }
}

async function login(page, config, logger) {
  assertSelectorsConfigured();

  await page.goto(LOGIN_URL);

  // storageState再利用により、ログインページへ遷移しても既にログイン済みで
  // 別画面へリダイレクトされることがある。その場合はフォーム入力をスキップする。
  const alreadyLoggedIn = await isLoggedIn(page, { timeoutMs: 3000 });
  if (alreadyLoggedIn) {
    logger?.info("already logged in (session reused)");
    return;
  }

  await SELECTORS.corpIdInput(page).fill(config.corpId);
  await SELECTORS.userIdInput(page).fill(config.userId);
  await SELECTORS.passwordInput(page).fill(config.password);

  logger?.info(`login attempt for corp ${config.corpId.slice(0, 2)}***`);

  await SELECTORS.submitButton(page).click();

  const ok = await isLoggedIn(page, { timeoutMs: 10000 });
  if (!ok) {
    throw new LoginError(
      "ログインに失敗しました。認証情報を確認するか、カイポケ側でログインフォームや" +
        "2段階認証が変更されていないか確認してください。"
    );
  }
  logger?.info("login succeeded");
}

module.exports = { login, isLoggedIn, LoginError, SELECTORS, LOGIN_URL };
