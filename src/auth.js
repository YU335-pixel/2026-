/**
 * カイポケへのログイン処理。
 *
 * SELECTORS の値はまだプレースホルダーです。docs/RECORDING_WORKFLOWS.md の手順に
 * 従って `playwright codegen` でログインフローを記録し、実際のセレクタに置き換えてください。
 */

const LOGIN_URL = "https://example.invalid/TODO-replace-with-real-kaipoke-login-url";

// 各値は (page) => Locator を返す関数として設定する。
// 例: corpIdInput: (page) => page.getByLabel("法人ID")
const SELECTORS = {
  // TODO: 法人IDの入力欄
  corpIdInput: null,
  // TODO: ユーザーIDの入力欄
  userIdInput: null,
  // TODO: パスワードの入力欄
  passwordInput: null,
  // TODO: ログインボタン
  submitButton: null,
  // TODO: ログイン成功後にのみ存在する要素（ログイン判定用）
  loggedInIndicator: null,
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
