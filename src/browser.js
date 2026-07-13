const fs = require("fs");
const path = require("path");
const { chromium } = require("playwright");

/**
 * Launches chromium and a context that reuses a saved login session
 * (config.paths.authState) when one exists, so repeated runs don't
 * need to log in from scratch every time.
 */
async function launchContext(config, { headless = false } = {}) {
  const browser = await chromium.launch({ headless });
  const hasSavedState = fs.existsSync(config.paths.authState);
  const context = await browser.newContext(
    hasSavedState ? { storageState: config.paths.authState } : {}
  );
  await context.tracing.start({ screenshots: true, snapshots: true });
  return { browser, context };
}

async function saveSessionState(context, config) {
  fs.mkdirSync(path.dirname(config.paths.authState), { recursive: true });
  await context.storageState({ path: config.paths.authState });
}

/**
 * On success we discard the trace (avoid accumulating noise); on failure
 * we persist it so the user can inspect what the browser actually saw,
 * per the plan's "trace on failure only" rule.
 */
async function closeContext(browser, context, config, { failed, label } = {}) {
  if (failed) {
    fs.mkdirSync(config.paths.diagnosticsDir, { recursive: true });
    const tracePath = path.join(
      config.paths.diagnosticsDir,
      `trace-${label || "run"}-${Date.now()}.zip`
    );
    await context.tracing.stop({ path: tracePath });
  } else {
    await context.tracing.stop();
  }
  await browser.close();
}

module.exports = { launchContext, saveSessionState, closeContext };
