const prompts = require("prompts");

function parseArgs(argv) {
  const args = argv.slice(2);
  const positional = args.filter((a) => !a.startsWith("--"));
  const flags = new Set(args.filter((a) => a.startsWith("--")));

  if (positional.length !== 1) {
    throw new Error(
      "使い方: <script> <入力JSONファイル> [--dry-run] [--yes] [--headed|--headless] [--continue-on-error]"
    );
  }

  return {
    inputPath: positional[0],
    dryRun: flags.has("--dry-run"),
    yes: flags.has("--yes"),
    // v1 は画面を目視して信頼を積むため headed をデフォルトにする。--headless で明示的に切り替える。
    headless: flags.has("--headless") && !flags.has("--headed"),
    continueOnError: flags.has("--continue-on-error"),
  };
}

async function confirmChange(diffText) {
  const response = await prompts({
    type: "confirm",
    name: "proceed",
    message: `この変更を適用しますか?\n  ${diffText}`,
    initial: false,
  });
  return response.proceed === true;
}

module.exports = { parseArgs, confirmChange };
