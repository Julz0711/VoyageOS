import { handlers } from '@/lib/auth/config';

// Auth handlers touch Mongoose (Node APIs) — force the Node.js runtime.
export const runtime = 'nodejs';

export const { GET, POST } = handlers;
