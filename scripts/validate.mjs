// 問題データの形式チェック。`node scripts/validate.mjs` で実行する。
import { readFileSync, readdirSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import vm from "node:vm";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const dataDir = join(root, "js", "data");

export function loadQuiz() {
  const context = { window: {} };
  vm.createContext(context);
  for (const file of readdirSync(dataDir).filter((f) => f.endsWith(".js")).sort()) {
    vm.runInContext(readFileSync(join(dataDir, file), "utf8"), context, { filename: file });
    if (!context.QUIZ) context.QUIZ = context.window.QUIZ;
  }
  return context.window.QUIZ;
}

const REQUIRED_TEXT = ["id", "cat", "q", "rule", "why", "ifNot"];
const OPTIONAL_TEXT = ["scene", "num", "trap", "tag"];

export function validate(quiz) {
  const errors = [];
  const catIds = new Set(quiz.categories.map((c) => c.id));
  const seen = new Set();

  for (const [i, q] of quiz.questions.entries()) {
    const where = q.id || `#${i}`;
    for (const key of REQUIRED_TEXT) {
      if (typeof q[key] !== "string" || q[key].trim() === "") errors.push(`${where}: ${key} がありません`);
    }
    for (const key of OPTIONAL_TEXT) {
      if (key in q && (typeof q[key] !== "string" || q[key].trim() === "")) errors.push(`${where}: ${key} が空です`);
    }
    if (typeof q.a !== "boolean") errors.push(`${where}: a（正解）は true/false で指定してください`);
    if (!Array.isArray(q.src) || q.src.length === 0 || q.src.some((s) => typeof s !== "string" || !s.trim())) {
      errors.push(`${where}: src（根拠）が必要です`);
    }
    if (!catIds.has(q.cat)) errors.push(`${where}: 未定義のカテゴリ ${q.cat}`);
    if (q.id && !q.id.startsWith(`${q.cat}-`)) errors.push(`${where}: id はカテゴリ名で始めてください`);
    if (seen.has(q.id)) errors.push(`${where}: id が重複しています`);
    seen.add(q.id);
    const allowed = new Set([...REQUIRED_TEXT, ...OPTIONAL_TEXT, "a", "src"]);
    for (const key of Object.keys(q)) if (!allowed.has(key)) errors.push(`${where}: 不明なフィールド ${key}`);
  }
  for (const c of quiz.categories) {
    if (!quiz.questions.some((q) => q.cat === c.id)) errors.push(`カテゴリ ${c.id} に問題がありません`);
  }
  return errors;
}

if (import.meta.url === `file://${process.argv[1]}`) {
  const quiz = loadQuiz();
  const errors = validate(quiz);
  const total = quiz.questions.length;
  const trues = quiz.questions.filter((q) => q.a).length;
  console.log(`問題数: ${total}（○ ${trues} / ✕ ${total - trues}）`);
  for (const c of quiz.categories) {
    console.log(`  ${c.name}: ${quiz.questions.filter((q) => q.cat === c.id).length}`);
  }
  if (errors.length) {
    console.error(`\n${errors.length} 件のエラー:`);
    for (const e of errors) console.error(`  - ${e}`);
    process.exit(1);
  }
  console.log("\nOK");
}
