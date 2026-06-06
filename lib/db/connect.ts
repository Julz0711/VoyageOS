import 'server-only';
import mongoose from 'mongoose';
import path from 'node:path';
import fs from 'node:fs';

/**
 * Mongoose connection with a keyless dev fallback.
 *
 * - If `MONGODB_URI` is set → connect to it (Atlas / real MongoDB).
 * - Otherwise, in development → start an on-disk `mongodb-memory-server` whose data lives in
 *   `.voyageos/mongo-data`, so trips persist across restarts with zero setup.
 * - In production with no URI → throw (never start an in-memory DB in prod).
 *
 * The connection and dev server are cached on `globalThis` so Next's HMR doesn't open a new
 * connection (or spawn a new mongod) on every reload.
 */

const DB_NAME = 'voyageos';

interface MongoCache {
  conn: typeof mongoose | null;
  promise: Promise<typeof mongoose> | null;
  memoryUri: string | null;
}

const globalForMongo = globalThis as unknown as { __vosMongo?: MongoCache };
const cache: MongoCache =
  globalForMongo.__vosMongo ?? (globalForMongo.__vosMongo = { conn: null, promise: null, memoryUri: null });

async function resolveUri(): Promise<string> {
  if (process.env.MONGODB_URI) return process.env.MONGODB_URI;

  if (process.env.NODE_ENV === 'production') {
    throw new Error('MONGODB_URI is required in production.');
  }

  if (cache.memoryUri) return cache.memoryUri;

  // Dev only: spin up a persistent on-disk in-memory MongoDB.
  const { MongoMemoryServer } = await import('mongodb-memory-server');
  const dbPath = path.join(process.cwd(), '.voyageos', 'mongo-data');
  fs.mkdirSync(dbPath, { recursive: true });

  const server = await MongoMemoryServer.create({
    instance: { dbPath, storageEngine: 'wiredTiger', dbName: DB_NAME },
  });
  cache.memoryUri = server.getUri();
  console.log('[voyageos] Started local in-memory MongoDB (no MONGODB_URI set).');
  return cache.memoryUri;
}

export async function connectToDatabase(): Promise<typeof mongoose> {
  if (cache.conn) return cache.conn;

  if (!cache.promise) {
    cache.promise = resolveUri().then((uri) =>
      mongoose.connect(uri, { dbName: DB_NAME, bufferCommands: false }),
    );
  }

  try {
    cache.conn = await cache.promise;
  } catch (err) {
    cache.promise = null;
    throw err;
  }
  return cache.conn;
}
