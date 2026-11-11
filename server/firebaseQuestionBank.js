import { createPrivateFirebaseRef } from "./firebaseBackend.js";

export function createFirebaseQuestionBank(env) {
  const bankRef = createPrivateFirebaseRef(env, "quizBank");

  return {
    async read() {
      const snapshot = await (await bankRef()).get();
      return snapshot.val() ?? {};
    },
    async transact(change) {
      let result;
      const transaction = await (await bankRef()).transaction((value) => {
        const next = change(value ?? {});
        result = next.result;
        // Return the current value on a no-op so Firebase can retry if its
        // initial local snapshot was empty or stale.
        return next.questions ?? value;
      }, undefined, false);
      if (!transaction.committed) throw new Error("Quiz bank transaction aborted");
      return result;
    },
  };
}
