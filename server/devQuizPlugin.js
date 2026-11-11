import { randomBytes } from "node:crypto";
import { createQuizHandler } from "./quizHttp.js";
import { createQuizService } from "./quizService.js";
import { createMemoryStore } from "./quizStore.js";
import { createFirebaseQuizStore } from "./firebaseQuizStore.js";
import { topics } from "../src/data/quiz.js";
import { createFirebaseQuestionBank } from "./firebaseQuestionBank.js";
import { createQuizBank } from "./quizBank.js";

export function devQuizPlugin(env = {}) {
  return {
    name: "vnr202-development-quiz-api",
    configureServer(server) {
      const durable = Boolean(
        env.QUIZ_FIREBASE_DATABASE_URL && env.QUIZ_FIREBASE_SERVICE_ACCOUNT,
      );
      const store = durable
        ? createFirebaseQuizStore(env)
        : createMemoryStore();
      const questionBank = createQuizBank(createFirebaseQuestionBank(env), topics);
      const handler = createQuizHandler({
        service: createQuizService({ store, questionBank, topics }),
        store,
        questionBank,
        secret: env.QUIZ_SESSION_SECRET || randomBytes(32).toString("hex"),
        importSecret: env.QUIZ_IMPORT_SECRET,
        studyEnabled: env.QUIZ_STUDY_ENABLED !== "false",
        development: true,
      });
      server.middlewares.use("/api/quiz", handler);
      server.middlewares.use((req, res, next) => {
        let path;
        try {
          path = decodeURIComponent(
            String(req.url || "").split("?")[0],
          ).replaceAll("\\", "/");
        } catch {
          res.statusCode = 400;
          res.end("Invalid path");
          return;
        }
        if (/\/(server|tests)\//.test(path)) {
          res.statusCode = 403;
          res.end("Private server module");
          return;
        }
        next();
      });
    },
  };
}
