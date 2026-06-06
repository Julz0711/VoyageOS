/**
 * Resets a user's account so the demo trip re-seeds on next app load.
 *
 *   npm run reset:dev                      # resets dev@voyageos.local
 *   npm run reset:dev -- someone@mail.com  # reset a specific user
 *   npm run reset:dev -- --purge           # also delete the user (fresh sign-in recreates it)
 *
 * Deletes the user's trips + all child records and clears `hasSeeded`. Keeps the user doc
 * (and saved AI key) unless --purge is passed. Requires MONGODB_URI (loaded via --env-file).
 *
 * Note: if you run keyless (no MONGODB_URI, on-disk in-memory DB), there's nothing to connect
 * to here — just delete the `.voyageos/mongo-data` folder to wipe local data.
 */
import { MongoClient } from 'mongodb';

const uri = process.env.MONGODB_URI;
if (!uri) {
  console.error(
    'No MONGODB_URI set. If you use the keyless in-memory DB, delete the .voyageos/mongo-data folder instead.',
  );
  process.exit(1);
}

const args = process.argv.slice(2);
const purge = args.includes('--purge');
const email = (args.find((a) => !a.startsWith('--')) ?? 'dev@voyageos.local').toLowerCase();

const CHILD_COLLECTIONS = [
  'trips',
  'exploreitems',
  'calendarentries',
  'packingitems',
  'documents',
  'chatthreads',
  'expenses',
  'checklistitems',
  'roadtrips',
];

const client = new MongoClient(uri);
try {
  await client.connect();
  const db = client.db('voyageos');

  const user = await db.collection('users').findOne({ email });
  if (!user) {
    console.error(`No user found with email "${email}".`);
    process.exit(1);
  }

  console.log(`Resetting ${email} (${user._id})…`);
  for (const name of CHILD_COLLECTIONS) {
    const { deletedCount } = await db.collection(name).deleteMany({ userId: user._id });
    if (deletedCount) console.log(`  - ${name}: deleted ${deletedCount}`);
  }

  if (purge) {
    await db.collection('users').deleteOne({ _id: user._id });
    console.log('  - users: deleted the user (next sign-in recreates it).');
  } else {
    await db.collection('users').updateOne({ _id: user._id }, { $set: { hasSeeded: false } });
    console.log('  - users: cleared hasSeeded (demo will re-seed on next app load).');
  }

  console.log('Done. Reload the app while signed in (or sign in again).');
} finally {
  await client.close();
}
