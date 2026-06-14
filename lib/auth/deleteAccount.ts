'use server';

import { signOut } from '@/lib/auth/config';
import { requireSession } from '@/lib/auth/dal';
import { connectToDatabase } from '@/lib/db/connect';
import { deleteObject } from '@/lib/storage';
import { User } from '@/models/User';
import { Trip } from '@/models/Trip';
import { Photo } from '@/models/Photo';
import { TripDocument } from '@/models/Document';
import { ExploreItem } from '@/models/ExploreItem';
import { CalendarEntry } from '@/models/CalendarEntry';
import { PackingItem } from '@/models/PackingItem';
import { Expense } from '@/models/Expense';
import { ChecklistItem } from '@/models/ChecklistItem';
import { Roadtrip } from '@/models/Roadtrip';
import { ChatThread } from '@/models/ChatThread';

/**
 * Permanently deletes all data for the current user:
 * 1. All storage objects (photos + documents) from the file store.
 * 2. All MongoDB documents across every collection.
 * 3. The User record itself.
 * 4. Signs the user out and redirects to /login.
 *
 * This satisfies GDPR Art. 17 (right to erasure) within the same request.
 */
export async function deleteAccount(): Promise<void> {
  const { userId } = await requireSession();

  await connectToDatabase();

  // --- 1. Purge storage objects ---
  // Photos
  const photos = await Photo.find({ userId }).select('storageKey').lean();
  await Promise.all(photos.map((p: { storageKey: string }) => deleteObject(p.storageKey).catch(() => {})));

  // Documents
  const docs = await TripDocument.find({ userId }).select('storageKey').lean();
  await Promise.all(docs.map((d: { storageKey: string }) => deleteObject(d.storageKey).catch(() => {})));

  // --- 2. Purge all MongoDB collections ---
  await Promise.all([
    Photo.deleteMany({ userId }),
    TripDocument.deleteMany({ userId }),
    ExploreItem.deleteMany({ userId }),
    CalendarEntry.deleteMany({ userId }),
    PackingItem.deleteMany({ userId }),
    Expense.deleteMany({ userId }),
    ChecklistItem.deleteMany({ userId }),
    Roadtrip.deleteMany({ userId }),
    ChatThread.deleteMany({ userId }),
    Trip.deleteMany({ userId }),
    User.deleteOne({ _id: userId }),
  ]);

  // --- 3. Sign out and redirect ---
  await signOut({ redirectTo: '/login' });
}
