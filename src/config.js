const path = require("path");
require("dotenv").config();

const REQUIRED_VARS = ["KAIPOKE_CORP_ID", "KAIPOKE_USER_ID", "KAIPOKE_PASSWORD"];

function loadConfig() {
  const missing = REQUIRED_VARS.filter((key) => !process.env[key]);
  if (missing.length > 0) {
    throw new Error(
      `.env に必須項目が設定されていません: ${missing.join(", ")}\n` +
        `.env.example をコピーして .env を作成し、値を埋めてください。`
    );
  }

  return {
    corpId: process.env.KAIPOKE_CORP_ID,
    userId: process.env.KAIPOKE_USER_ID,
    password: process.env.KAIPOKE_PASSWORD,
    paths: {
      authState: path.join(process.cwd(), ".auth", "storageState.json"),
      logsDir: path.join(process.cwd(), "logs"),
      diagnosticsDir: path.join(process.cwd(), "logs", "diagnostics"),
    },
  };
}

module.exports = { loadConfig };
