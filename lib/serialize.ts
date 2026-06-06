/**
 * Converts a Mongoose lean document into a plain, client-serializable object: ObjectIds and
 * Dates become strings, and top-level `_id` is renamed to `id`. Use before passing DB data to
 * Client Components.
 */
export function serializeDoc<T = Record<string, unknown>>(doc: unknown): T {
  const plain = JSON.parse(JSON.stringify(doc)) as Record<string, unknown>;
  if (plain && typeof plain === 'object' && '_id' in plain) {
    plain.id = plain._id;
    delete plain._id;
  }
  return plain as T;
}

export function serializeDocs<T = Record<string, unknown>>(docs: unknown[]): T[] {
  return docs.map((d) => serializeDoc<T>(d));
}
