import { requireActiveTrip } from '@/lib/trips/active';
import { loadChatMessages } from '@/lib/chat/persistence';
import { getAiInfo } from '@/lib/ai/userSettings';
import { ChatPanel } from '@/components/chat/ChatPanel';
import { NoActiveTrip } from '@/components/NoActiveTrip';

export const metadata = { title: 'Travel assistant' };

export default async function ChatPage() {
  const { userId, trip } = await requireActiveTrip();
  if (!trip) return <NoActiveTrip />;

  const [messages, aiInfo] = await Promise.all([
    loadChatMessages(userId, trip.id),
    getAiInfo(userId),
  ]);

  return (
    <div className="space-y-6">
      <div>
        <p className="eyebrow mb-1 text-muted">Plan with AI</p>
        <h1 className="font-display text-3xl font-semibold text-ink">Chat</h1>
      </div>
      <ChatPanel initialMessages={messages} aiInfo={aiInfo} />
    </div>
  );
}
