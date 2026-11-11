import { cert, getApps, initializeApp } from "firebase-admin/app";
import { getDatabase } from "firebase-admin/database";
import { QuizError } from "./quizError.js";

const PROJECT = "vnr-game-20261111";
const DATABASE = `https://${PROJECT}-default-rtdb.asia-southeast1.firebasedatabase.app`;

// Both private branches use the new project's service account and server-only rules.
export function createPrivateFirebaseRef(env, path) {
  let reference;
  let checkedUntil = 0;
  return async () => {
    if (!env.QUIZ_FIREBASE_DATABASE_URL || !env.QUIZ_FIREBASE_SERVICE_ACCOUNT)
      throw new QuizError(503, "BANK_NOT_CONFIGURED", "Chưa cấu hình Firebase cho Quiz.");
    let database, credentials;
    try {
      database = new URL(env.QUIZ_FIREBASE_DATABASE_URL);
      credentials = JSON.parse(env.QUIZ_FIREBASE_SERVICE_ACCOUNT);
    } catch {
      throw new QuizError(503, "BANK_NOT_CONFIGURED", "Cấu hình Firebase không hợp lệ.");
    }
    if (database.origin !== DATABASE || database.pathname !== "/" ||
        database.search || database.hash || database.username || database.password ||
        credentials.project_id !== PROJECT)
      throw new QuizError(503, "BANK_NOT_CONFIGURED", "Quiz cần sử dụng đúng project Firebase riêng của vnr-game.");
    if (Date.now() >= checkedUntil) {
      const response = await fetch(new URL(`/${path}.json?shallow=true`, database), {
        signal: AbortSignal.timeout(5000),
      });
      if (response.status !== 401 && response.status !== 403)
        throw new QuizError(503, "BANK_RULES_REQUIRED", "Hãy triển khai Firebase Rules bảo vệ dữ liệu Quiz trước khi sử dụng.");
      checkedUntil = Date.now() + 60_000;
    }
    if (!reference) {
      const name = "vnr-game-quiz-server";
      const app = getApps().find((item) => item.name === name) ?? initializeApp({
        credential: cert(credentials),
        databaseURL: database.origin,
        databaseAuthVariableOverride: { uid: "vnr202-quiz-server" },
      }, name);
      reference = getDatabase(app).ref(path);
    }
    return reference;
  };
}
