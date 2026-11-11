import test from "node:test";
import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { createFirebaseQuizStore } from "../server/firebaseQuizStore.js";
import { createPrivateFirebaseRef } from "../server/firebaseBackend.js";
import { createQuizService } from "../server/quizService.js";
import { questions, topics } from "./fixtures/quizQuestions.js";

// Model RTDB's atomic transactions and initial cold-cache null callback.
function database() {
  const entries = new Map();
  const snapshot = (value) => ({ val: () => structuredClone(value ?? null) });
  function ref(path = "", query = {}) {
    return {
      child: (part) => ref(path ? `${path}/${part}` : part),
      orderByChild: (field) => ref(path, { ...query, field }),
      endAt: (end) => ref(path, { ...query, end }),
      limitToFirst: (limit) => ref(path, { ...query, limit }),
      async get() {
        if (!query.field) return snapshot(entries.get(path));
        const found = [...entries].filter(([key, value]) =>
          key.startsWith(`${path}/`) && value[query.field] <= query.end,
        ).sort((a, b) => a[1][query.field] - b[1][query.field]).slice(0, query.limit);
        return snapshot(Object.fromEntries(found.map(([key, value]) => [key.slice(path.length + 1), value])));
      },
      async set(value) { entries.set(path, structuredClone(value)); },
      async remove() { entries.delete(path); },
      async transaction(change) {
        if (change(null) === undefined) return { committed: false, snapshot: snapshot(null) };
        const current = structuredClone(entries.get(path) ?? null);
        const value = change(current);
        if (value === undefined) return { committed: false, snapshot: snapshot(current) };
        if (value === null) entries.delete(path);
        else entries.set(path, structuredClone(value));
        return { committed: true, snapshot: snapshot(value) };
      },
    };
  }
  let now = 100000;
  const options = { rootRef: async () => ref(), clock: () => now };
  return { entries, store: () => createFirebaseQuizStore({}, options), advance: (ms) => { now += ms; }, clock: options.clock };
}

const attempt = (actor, extra = {}) => ({
  id: randomUUID(), actor, revision: 0, finishedAt: null, deadline: null,
  answers: {}, focusEvents: [], round: [{ source: null }], ...extra,
});

test("Firebase attempts preserve empty/null fields and survive independent store instances", async () => {
  const db = database(), actor = randomUUID(), input = attempt(actor);
  const first = db.store(), restarted = db.store();
  assert.deepEqual(await first.start(actor, input), input);
  assert.deepEqual(await restarted.get(input.id), input);
  assert.equal(await restarted.active(actor), input.id);
  assert.equal(await restarted.active(randomUUID()), null);
});

test("concurrent Firebase starts keep one active attempt per actor without affecting other actors", async () => {
  const db = database(), actor = randomUUID(), other = randomUUID();
  const inputs = Array.from({ length: 10 }, () => attempt(actor));
  const results = await Promise.all(inputs.map((input) => db.store().start(actor, input)));
  assert.equal(new Set(results.map(({ id }) => id)).size, 1);
  assert.equal([...db.entries.keys()].filter((key) => key.startsWith("attempts/")).length, 1);
  const independent = await db.store().start(other, attempt(other));
  assert.notEqual(independent.id, results[0].id);
});

test("Firebase compare-and-set accepts one conflicting answer, preserves TTL, and never revives expired attempts", async () => {
  const db = database(), actor = randomUUID(), input = attempt(actor), first = db.store();
  await first.start(actor, input);
  const expires = db.entries.get(`attempts/${input.id}`).expiresAt;
  const results = await Promise.all(["A", "B"].map((answer) =>
    db.store().compareAndSet(input.id, 0, { ...input, revision: 1, answers: { 0: answer } }),
  ));
  assert.deepEqual(results.sort(), [false, true]);
  assert.equal(db.entries.get(`attempts/${input.id}`).expiresAt, expires);
  assert.equal((await first.get(input.id)).revision, 1);
  assert.equal(await first.compareAndSet("missing", 0, input), false);
  db.advance(48 * 60 * 60 * 1000);
  assert.equal(await first.get(input.id), null);
  assert.equal(await first.active(actor), null);
  assert.equal(await first.compareAndSet(input.id, 1, { ...input, revision: 2 }), false);
  const replacement = attempt(actor);
  assert.equal((await first.start(actor, replacement)).id, replacement.id);
  assert.equal(db.entries.has(`attempts/${input.id}`), false);
});

test("finished Firebase attempts remain reviewable while the same learner starts another round", async () => {
  const db = database(), actor = randomUUID(), store = db.store(), input = attempt(actor);
  await store.start(actor, input);
  await store.compareAndSet(input.id, 0, { ...input, revision: 1, finishedAt: db.clock() });
  const next = attempt(actor);
  assert.equal((await db.store().start(actor, next)).id, next.id);
  assert.equal((await store.get(input.id)).finishedAt, db.clock());
});

test("Firebase rate limits are atomic across instances, expire, and handle unsafe path characters", async () => {
  const db = database();
  const results = await Promise.all(Array.from({ length: 12 }, () => db.store().limit("ip:[::1]/a.#$", 5, 60)));
  assert.equal(results.filter(Boolean).length, 5);
  db.advance(60_000);
  assert.equal(await db.store().limit("ip:[::1]/a.#$", 5, 60), true);
});

test("Quiz using Firebase storage resumes, locks answers, and finishes with the original question snapshot", async () => {
  const db = database(), actor = randomUUID(), clientId = randomUUID();
  const service = () => createQuizService({ store: db.store(), questionBank: {
    list: async () => questions.map((question) => ({ ...question, enabled: true })),
  }, topics, clock: db.clock });
  const started = await service().start(actor, {
    name: "Kiểm tra", mode: "practice", topicIds: ["unity"], count: 10, clientId, requestId: randomUUID(),
  });
  const answer = { attemptId: started.id, clientId, questionId: started.question.id, optionId: started.question.options[0].id };
  const saved = await service().act(actor, "answer", answer);
  assert.equal(saved.answered, 1);
  assert.ok(saved.feedback.explanation);
  assert.equal((await service().active(actor, clientId)).answered, 1);
  await assert.rejects(service().act(actor, "answer", { ...answer, optionId: started.question.options[1].id }), { code: "ANSWER_LOCKED" });
  const finished = await service().act(actor, "finish", answer);
  assert.equal(finished.result.review.length, 10);
  assert.equal(finished.result.answered, 1);
  assert.equal(finished.result.skipped, 9);
});

test("Firebase backend refuses the original database or a service account from another project", async () => {
  const credentials = JSON.stringify({ project_id: "vnr-game-20261111" });
  for (const env of [
    {},
    { QUIZ_FIREBASE_DATABASE_URL: "https://mln122-704c5-default-rtdb.firebaseio.com", QUIZ_FIREBASE_SERVICE_ACCOUNT: credentials },
    { QUIZ_FIREBASE_DATABASE_URL: "https://vnr-game-20261111-default-rtdb.asia-southeast1.firebasedatabase.app", QUIZ_FIREBASE_SERVICE_ACCOUNT: JSON.stringify({ project_id: "other" }) },
  ]) await assert.rejects(createPrivateFirebaseRef(env, "quizRuntime")(), { code: "BANK_NOT_CONFIGURED" });
});
