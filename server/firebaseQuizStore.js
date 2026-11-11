import { createHash } from "node:crypto";
import { createPrivateFirebaseRef } from "./firebaseBackend.js";

const TTL = 48 * 60 * 60 * 1000;
const CLEANUP_INTERVAL = 5 * 60 * 1000;

// One transaction per attempt/actor/bucket, without downloading other learners' rounds.
export function createFirebaseQuizStore(env, {
  rootRef = createPrivateFirebaseRef(env, "quizRuntime"),
  clock = Date.now,
} = {}) {
  let cleanupAfter = 0;
  let cleaning;
  async function cleanup(root) {
    if (cleaning) return cleaning;
    if (clock() < cleanupAfter) return;
    cleanupAfter = clock() + CLEANUP_INTERVAL;
    cleaning = (async () => {
      for (const branch of ["attempts", "actors", "limits"]) {
        const snapshot = await root.child(branch).orderByChild("expiresAt")
          .endAt(clock()).limitToFirst(25).get();
        await Promise.all(Object.keys(snapshot.val() ?? {}).map((id) =>
          root.child(`${branch}/${id}`).transaction((entry) =>
            entry && entry.expiresAt <= clock() ? null : entry,
          undefined, false),
        ));
      }
    })().catch(() => {
      cleanupAfter = 0; // Logical expiry still excludes stale data if cleanup fails.
    }).finally(() => { cleaning = undefined; });
    await cleaning;
  }
  async function readAttempt(root, id) {
    const entry = (await root.child(`attempts/${id}`).get()).val();
    return entry && entry.expiresAt > clock() ? JSON.parse(entry.payload) : null;
  }
  return {
    // Legacy Redis question imports were not used by this new deployment.
    async getImportedQuestions() { return []; },
    async start(actor, attempt) {
      const root = await rootRef();
      await cleanup(root);
      const actorRef = root.child(`actors/${actor}`);
      const candidateRef = root.child(`attempts/${attempt.id}`);
      let candidate;
      for (let retry = 0; retry < 16; retry++) {
        const previous = (await actorRef.get()).val();
        if (previous && previous.expiresAt > clock()) {
          const existing = await readAttempt(root, previous.id);
          if (existing && !existing.finishedAt) {
            if (candidate) await candidateRef.remove();
            return existing;
          }
        }
        if (!candidate) {
          // JSON preserves null, {}, and [] which RTDB would otherwise remove.
          candidate = { expiresAt: clock() + TTL, payload: JSON.stringify(attempt) };
          await candidateRef.set(candidate);
        }
        const changed = await actorRef.transaction((current) => {
          if ((current?.id ?? null) !== (previous?.id ?? null) ||
              (current?.expiresAt ?? null) !== (previous?.expiresAt ?? null)) return current;
          return { id: attempt.id, expiresAt: candidate.expiresAt };
        }, undefined, false);
        if (changed.committed && changed.snapshot.val()?.id === attempt.id)
          return structuredClone(attempt);
      }
      if (candidate) await candidateRef.remove();
      throw new Error("Quiz session is busy; retry the request");
    },
    async get(id) { return readAttempt(await rootRef(), id); },
    async active(actor) {
      const root = await rootRef();
      const entry = (await root.child(`actors/${actor}`).get()).val();
      return entry && entry.expiresAt > clock() && await readAttempt(root, entry.id)
        ? entry.id : null;
    },
    async compareAndSet(id, revision, value) {
      const root = await rootRef();
      let accepted = false;
      const result = await root.child(`attempts/${id}`).transaction((entry) => {
        accepted = false;
        if (!entry || entry.expiresAt <= clock() ||
            JSON.parse(entry.payload).revision !== revision) return entry;
        accepted = true;
        return { expiresAt: entry.expiresAt, payload: JSON.stringify(value) };
      }, undefined, false);
      return result.committed && accepted;
    },
    async limit(key, max, seconds) {
      const root = await rootRef();
      await cleanup(root);
      const bucket = createHash("sha256").update(key).digest("hex");
      const result = await root.child(`limits/${bucket}`).transaction((entry) => {
        if (!entry || entry.expiresAt <= clock())
          return { count: 1, expiresAt: clock() + seconds * 1000 };
        return { ...entry, count: entry.count + 1 };
      }, undefined, false);
      if (!result.committed) throw new Error("Quiz rate limit transaction aborted");
      return result.snapshot.val().count <= max;
    },
  };
}
