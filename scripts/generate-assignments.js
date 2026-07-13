#!/usr/bin/env node

/**
 * 曜日ごとの訪問パターン（週次テンプレート）を、指定した期間の日付ごとの
 * スタッフ割当リストに展開する。ブラウザ操作は行わない、純粋なローカル変換。
 *
 * 生成結果はそのまま scripts/assign-staff.js の入力として使えるが、
 * 実行前に必ず内容を見直し、イレギュラーな週はここで手直しすること。
 */

const fs = require("fs");
const path = require("path");

const { weeklyPatternFileSchema } = require("../src/schemas/weeklyPattern.schema");

const WEEKDAY_LABELS = ["日", "月", "火", "水", "木", "金", "土"]; // Date#getDay(): 0=日,...,6=土

function parseArgs(argv) {
  const args = argv.slice(2);
  const positional = [];
  const flags = {};
  for (let i = 0; i < args.length; i++) {
    if (args[i].startsWith("--")) {
      flags[args[i].slice(2)] = args[i + 1];
      i++; // 値を消費してスキップ
    } else {
      positional.push(args[i]);
    }
  }
  if (positional.length !== 1 || !flags.from || !flags.to || !flags.out) {
    throw new Error(
      "使い方: node scripts/generate-assignments.js <週次パターンJSON> --from YYYY-MM-DD --to YYYY-MM-DD --out <出力先パス>"
    );
  }
  return { patternPath: positional[0], from: flags.from, to: flags.to, out: flags.out };
}

function* dateRange(from, to) {
  const cur = new Date(`${from}T00:00:00`);
  const end = new Date(`${to}T00:00:00`);
  if (Number.isNaN(cur.getTime()) || Number.isNaN(end.getTime())) {
    throw new Error("--from / --to は YYYY-MM-DD 形式で指定してください");
  }
  while (cur <= end) {
    yield new Date(cur);
    cur.setDate(cur.getDate() + 1);
  }
}

function formatDate(d) {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

function main() {
  const args = parseArgs(process.argv);
  const raw = JSON.parse(fs.readFileSync(args.patternPath, "utf8"));
  const { pattern } = weeklyPatternFileSchema.parse(raw);

  const assignments = [];
  for (const date of dateRange(args.from, args.to)) {
    const weekdayLabel = WEEKDAY_LABELS[date.getDay()];
    const visitDate = formatDate(date);
    for (const rule of pattern) {
      if (rule.weekday !== weekdayLabel) continue;
      assignments.push({
        staffName: rule.staffName,
        clientName: rule.clientName,
        visitDate,
        startTime: rule.startTime,
        endTime: rule.endTime,
        visitType: rule.visitType,
        // イレギュラー（既に別スタッフが入っている等）を無自覚に上書きしないよう、
        // デフォルトはfalse。パターン通りに強制上書きしたい場合は生成後に編集する。
        replaceExistingStaff: false,
      });
    }
  }

  fs.mkdirSync(path.dirname(args.out), { recursive: true });
  fs.writeFileSync(args.out, JSON.stringify({ assignments }, null, 2), "utf8");

  console.log(`${assignments.length}件の割当を生成しました: ${args.out}`);
  console.log("内容を確認・イレギュラー分を手直ししてから、以下で実行してください:");
  console.log(`  node scripts/assign-staff.js ${args.out} --dry-run`);
}

main();
