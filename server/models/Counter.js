import mongoose from 'mongoose';

/**
 * Atomic sequence generator — backs the human-readable, gapless-per-key order/bill numbers
 * (H2R-000001, SH-000001, ...) instead of the old timestamp+random IDs which looked random
 * and jumped around instead of counting up in order.
 */
const CounterSchema = new mongoose.Schema({
  key: { type: String, required: true, unique: true },
  seq: { type: Number, default: 0 },
});

const Counter = mongoose.model('Counter', CounterSchema);

/** Creates the counter seeded at `seed` only if it doesn't exist yet — safe to call every boot. */
export async function ensureCounterSeed(key, seed) {
  await Counter.findOneAndUpdate(
    { key },
    { $setOnInsert: { key, seq: seed } },
    { upsert: true }
  );
}

/** Atomically returns the next number in the sequence for `key`, starting at 1. */
export async function nextSequence(key) {
  const doc = await Counter.findOneAndUpdate(
    { key },
    { $inc: { seq: 1 } },
    { upsert: true, new: true, setDefaultsOnInsert: true }
  );
  return doc.seq;
}

export default Counter;
