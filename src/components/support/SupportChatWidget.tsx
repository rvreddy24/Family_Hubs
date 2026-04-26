/**
 * FamilyHubs.in — Support chat widget
 *
 * Amazon-style floating help bubble for family and provider apps.
 * - Family mode: FAQ-first (canned answers). "Talk to a human" escalates the
 *   thread to admin via socket and surfaces it in the admin support console.
 * - Provider mode: direct live chat (no FAQ gate) — partners get instant
 *   access to a hub admin for dispatch / payout / verification questions.
 *
 * Mounts once at the app root and renders nothing for unauthenticated users
 * or for admins (admins use the in-dashboard `SupportConsole`).
 */
import { useEffect, useMemo, useRef, useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  ChevronLeft,
  HelpCircle,
  Loader2,
  MessageSquare,
  Send,
  Sparkles,
  X,
} from 'lucide-react';
import { useApp } from '../../context/AppContext';
import type { ChatKind, ChatMessage, ChatThread } from '../../types';

interface FaqItem {
  id: string;
  q: string;
  a: string;
}

const FAMILY_FAQS: FaqItem[] = [
  {
    id: 'book',
    q: 'How do I book a service for my parent?',
    a: 'Open the Dashboard, tap “Book a service”, pick a category (medical, essentials, maintenance…), and confirm. The cost is held in escrow until the job is complete.',
  },
  {
    id: 'wallet',
    q: 'How does the wallet & escrow work?',
    a: 'Top up your wallet from the Wallet tab. When you book a job, the amount is locked in escrow. It only releases to the provider once you mark the task as settled.',
  },
  {
    id: 'track',
    q: 'Can I track my provider live?',
    a: 'Yes. Once a provider is assigned, the task card updates in real time — en-route, arrived, in-progress, completed — with photo evidence at each step.',
  },
  {
    id: 'sos',
    q: 'How do I trigger SOS in an emergency?',
    a: 'Tap the red SOS shield at the top of the app. The hub admin and on-call providers are alerted instantly with your parent’s location and details.',
  },
  {
    id: 'noshow',
    q: 'What if the provider doesn’t show up?',
    a: 'Tell us here and we’ll dispatch a replacement immediately. The escrowed amount is refunded automatically if the original provider doesn’t complete the job.',
  },
  {
    id: 'safety',
    q: 'Is my family data safe?',
    a: 'Your data is hub-scoped — only you and approved hub admins see it. Providers only ever see the specific task they are assigned, never your full profile.',
  },
];

const PROVIDER_QUICK_PROMPTS = [
  'I have a question about my next job',
  'My payout is missing or delayed',
  'I need to update my documents',
  'I want to mark myself unavailable today',
];

function PanelHeader({
  title,
  subtitle,
  onClose,
  onBack,
  onlineDot = true,
}: {
  title: string;
  subtitle?: string;
  onClose: () => void;
  onBack?: () => void;
  onlineDot?: boolean;
}) {
  return (
    <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100 bg-gradient-to-br from-primary to-primary/90 text-white rounded-t-2xl">
      <div className="flex items-center gap-2 min-w-0">
        {onBack && (
          <button
            onClick={onBack}
            aria-label="Back"
            className="w-8 h-8 grid place-items-center rounded-full hover:bg-white/15 active:bg-white/25 -ml-1"
          >
            <ChevronLeft className="w-5 h-5" />
          </button>
        )}
        <div className="min-w-0">
          <div className="font-black text-base leading-tight truncate">{title}</div>
          {subtitle && (
            <div className="flex items-center gap-1.5 text-[11px] font-semibold text-white/80 mt-0.5">
              {onlineDot && (
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-300 animate-pulse" />
              )}
              <span className="truncate">{subtitle}</span>
            </div>
          )}
        </div>
      </div>
      <button
        onClick={onClose}
        aria-label="Close support"
        className="w-8 h-8 grid place-items-center rounded-full hover:bg-white/15 active:bg-white/25"
      >
        <X className="w-4 h-4" />
      </button>
    </div>
  );
}

function MessageBubble({
  message,
  selfIsUser,
}: {
  message: ChatMessage;
  selfIsUser: boolean;
}) {
  const fromMe =
    (selfIsUser && (message.authorRole === 'family' || message.authorRole === 'provider')) ||
    (!selfIsUser && message.authorRole === 'admin');
  const isSystem = message.kind === 'system' || message.authorRole === 'bot';

  if (isSystem) {
    return (
      <div className="flex justify-center my-1.5">
        <div className="text-[10px] font-bold uppercase tracking-widest text-gray-400 bg-gray-50 border border-gray-100 px-2.5 py-1 rounded-full">
          {message.body}
        </div>
      </div>
    );
  }
  return (
    <div className={`flex ${fromMe ? 'justify-end' : 'justify-start'} my-1`}>
      <div
        className={`max-w-[78%] px-3 py-2 rounded-2xl text-sm leading-snug ${
          fromMe
            ? 'bg-primary text-white rounded-br-md'
            : 'bg-gray-100 text-gray-900 rounded-bl-md'
        }`}
      >
        {!fromMe && message.authorRole === 'admin' && (
          <div className="text-[10px] font-black uppercase tracking-widest text-gray-500 mb-0.5">
            Support · {message.authorName || 'Admin'}
          </div>
        )}
        <div className="whitespace-pre-wrap break-words">{message.body}</div>
      </div>
    </div>
  );
}

function ChatThreadView({
  thread,
  messages,
  onSend,
  onBack,
}: {
  thread: ChatThread | undefined;
  messages: ChatMessage[];
  onSend: (body: string) => void;
  onBack?: () => void;
}) {
  const [draft, setDraft] = useState('');
  const scrollRef = useRef<HTMLDivElement | null>(null);
  const inputRef = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    const el = scrollRef.current;
    if (!el) return;
    el.scrollTop = el.scrollHeight;
  }, [messages.length]);

  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  const submit = () => {
    const trimmed = draft.trim();
    if (!trimmed) return;
    onSend(trimmed);
    setDraft('');
  };

  return (
    <>
      <PanelHeader
        title={thread?.kind === 'provider' ? 'Partner Support' : 'FamilyHubs Help'}
        subtitle={
          thread?.status === 'awaiting_human'
            ? 'Connecting you to a hub admin…'
            : 'Hub admins reply in minutes'
        }
        onClose={() => onBack && onBack()}
        onBack={onBack}
      />
      <div
        ref={scrollRef}
        className="flex-1 overflow-y-auto px-4 py-3 bg-white"
      >
        {thread === undefined ? (
          <div className="grid place-items-center h-full text-gray-400 gap-2">
            <Loader2 className="w-5 h-5 animate-spin" />
            <span className="text-xs font-bold uppercase tracking-widest">Opening chat…</span>
          </div>
        ) : messages.length === 0 ? (
          <div className="text-center text-gray-500 py-6 px-4">
            <Sparkles className="w-5 h-5 text-primary mx-auto mb-2" />
            <div className="text-sm font-bold text-gray-700">You’re connected</div>
            <div className="text-xs text-gray-500 mt-1">
              Send a message and a hub admin will pick it up.
            </div>
          </div>
        ) : (
          messages.map(m => <MessageBubble key={m.id} message={m} selfIsUser />)
        )}
      </div>
      <div className="px-3 py-2.5 border-t border-gray-100 bg-white rounded-b-2xl">
        <div className="flex items-center gap-2">
          <input
            ref={inputRef}
            value={draft}
            onChange={e => setDraft(e.target.value)}
            onKeyDown={e => {
              if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                submit();
              }
            }}
            placeholder="Type your message…"
            disabled={!thread}
            className="flex-1 bg-gray-50 border border-gray-200 rounded-full px-4 py-2 text-sm focus:outline-none focus:border-primary focus:bg-white disabled:opacity-50"
          />
          <button
            onClick={submit}
            disabled={!thread || !draft.trim()}
            className="w-9 h-9 grid place-items-center rounded-full bg-primary text-white hover:bg-primary/90 disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors"
            aria-label="Send"
          >
            <Send className="w-4 h-4" />
          </button>
        </div>
      </div>
    </>
  );
}

function FaqView({
  userName,
  selected,
  onSelect,
  onClose,
  onEscalate,
}: {
  userName: string;
  selected: FaqItem | null;
  onSelect: (item: FaqItem | null) => void;
  onClose: () => void;
  onEscalate: () => void;
}) {
  return (
    <>
      <PanelHeader
        title="FamilyHubs Help"
        subtitle="Common questions answered instantly"
        onClose={onClose}
        onBack={selected ? () => onSelect(null) : undefined}
      />
      <div className="flex-1 overflow-y-auto px-4 py-4 bg-white">
        {!selected ? (
          <>
            <div className="mb-3">
              <div className="text-base font-black text-gray-900">
                Hi {userName.split(' ')[0] || 'there'} 👋
              </div>
              <div className="text-xs text-gray-500 mt-1">
                Pick a topic — or chat with our team if you need a human.
              </div>
            </div>
            <div className="space-y-1.5">
              {FAMILY_FAQS.map(item => (
                <button
                  key={item.id}
                  onClick={() => onSelect(item)}
                  className="w-full text-left px-3 py-2.5 rounded-xl border border-gray-100 hover:border-primary/40 hover:bg-primary/[.03] transition-colors group flex items-center justify-between gap-3"
                >
                  <span className="flex items-center gap-2 min-w-0">
                    <HelpCircle className="w-4 h-4 text-primary/70 group-hover:text-primary flex-shrink-0" />
                    <span className="text-sm font-semibold text-gray-800 truncate">{item.q}</span>
                  </span>
                  <span className="text-[10px] font-black uppercase tracking-widest text-gray-300 group-hover:text-primary">
                    Read
                  </span>
                </button>
              ))}
            </div>
          </>
        ) : (
          <div>
            <div className="text-base font-black text-gray-900 mb-2">{selected.q}</div>
            <div className="text-sm text-gray-700 leading-relaxed bg-gray-50 border border-gray-100 rounded-xl p-3">
              {selected.a}
            </div>
            <div className="mt-4 text-xs text-gray-500">
              Was this helpful? You can keep browsing or talk to a human.
            </div>
          </div>
        )}
      </div>
      <div className="px-3 py-2.5 border-t border-gray-100 bg-white rounded-b-2xl">
        <button
          onClick={onEscalate}
          className="w-full flex items-center justify-center gap-2 bg-primary text-white text-sm font-black uppercase tracking-wider py-2.5 rounded-xl hover:bg-primary/90 transition-colors"
        >
          <MessageSquare className="w-4 h-4" />
          Talk to a human
        </button>
        <div className="text-center text-[10px] font-bold uppercase tracking-widest text-gray-400 mt-1.5">
          Average response · &lt; 5 min
        </div>
      </div>
    </>
  );
}

function ProviderQuickPrompts({ onPick }: { onPick: (text: string) => void }) {
  return (
    <div className="px-3 pt-2 pb-1 flex gap-1.5 overflow-x-auto bg-white border-b border-gray-50">
      {PROVIDER_QUICK_PROMPTS.map(p => (
        <button
          key={p}
          onClick={() => onPick(p)}
          className="flex-shrink-0 text-[11px] font-bold text-gray-700 bg-gray-50 hover:bg-primary/10 hover:text-primary border border-gray-100 px-2.5 py-1 rounded-full whitespace-nowrap transition-colors"
        >
          {p}
        </button>
      ))}
    </div>
  );
}

export default function SupportChatWidget() {
  const {
    user,
    session,
    chatThreads,
    chatMessages,
    openChat,
    sendChatMessage,
    markChatRead,
  } = useApp();

  const [open, setOpen] = useState(false);
  const [view, setView] = useState<'faq' | 'chat'>('faq');
  const [selectedFaq, setSelectedFaq] = useState<FaqItem | null>(null);
  const [pendingEscalation, setPendingEscalation] = useState<FaqItem | null>(null);

  const isAuthed = Boolean(session?.id);
  const role = user?.role || 'child';
  const widgetKind: ChatKind | null =
    role === 'child' ? 'family' : role === 'provider' ? 'provider' : null;

  const myThread = useMemo(() => {
    if (!widgetKind || !user?.id) return undefined;
    return chatThreads.find(t => t.userId === user.id && t.kind === widgetKind);
  }, [chatThreads, widgetKind, user?.id]);

  const messagesForThread = useMemo(
    () => (myThread ? chatMessages[myThread.id] || [] : []),
    [chatMessages, myThread]
  );

  const unread = myThread?.unreadForUser || 0;

  // Provider widget skips the FAQ screen entirely.
  useEffect(() => {
    if (open && widgetKind === 'provider') setView('chat');
  }, [open, widgetKind]);

  // Open / refresh thread when entering chat view.
  useEffect(() => {
    if (open && view === 'chat' && widgetKind && !myThread) {
      openChat(widgetKind);
    }
  }, [open, view, widgetKind, myThread, openChat]);

  // Mark as read when the panel is open and we have new admin messages.
  useEffect(() => {
    if (open && view === 'chat' && myThread && unread > 0) {
      markChatRead(myThread.id);
    }
  }, [open, view, myThread, unread, markChatRead]);

  // Once the escalation request has a real thread, fire the system note + context.
  useEffect(() => {
    if (!pendingEscalation || !myThread) return;
    sendChatMessage(myThread.id, 'I’d like to talk to a live agent please.', 'system');
    if (pendingEscalation.q) {
      sendChatMessage(myThread.id, `Context — last topic viewed: “${pendingEscalation.q}”`, 'text');
    }
    setPendingEscalation(null);
  }, [pendingEscalation, myThread, sendChatMessage]);

  if (!isAuthed || !widgetKind) return null;

  const escalate = () => {
    if (!widgetKind) return;
    openChat(widgetKind);
    setPendingEscalation(selectedFaq || { id: 'escalate', q: '', a: '' });
    setView('chat');
  };

  const onSend = (body: string) => {
    if (!myThread) return;
    sendChatMessage(myThread.id, body, 'text');
  };

  return (
    <>
      <AnimatePresence>
        {!open && (
          <motion.button
            key="bubble"
            initial={{ scale: 0.6, opacity: 0, y: 20 }}
            animate={{ scale: 1, opacity: 1, y: 0 }}
            exit={{ scale: 0.6, opacity: 0, y: 20 }}
            transition={{ type: 'spring', stiffness: 380, damping: 24 }}
            onClick={() => {
              setOpen(true);
              if (widgetKind === 'provider') {
                setView('chat');
              } else {
                // Family: skip the FAQ list when there's already a live conversation.
                setView(myThread ? 'chat' : 'faq');
              }
            }}
            aria-label="Open support chat"
            className="fixed bottom-5 right-5 z-50 w-14 h-14 rounded-full bg-primary text-white shadow-lg shadow-primary/30 grid place-items-center hover:bg-primary/90 active:scale-95 transition-colors"
          >
            <MessageSquare className="w-6 h-6" />
            {unread > 0 && (
              <span className="absolute -top-1 -right-1 min-w-[20px] h-5 px-1.5 rounded-full bg-red-500 text-white text-[10px] font-black grid place-items-center border-2 border-white">
                {unread > 9 ? '9+' : unread}
              </span>
            )}
          </motion.button>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {open && (
          <motion.div
            key="panel"
            initial={{ opacity: 0, y: 30, scale: 0.96 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 30, scale: 0.96 }}
            transition={{ type: 'spring', stiffness: 320, damping: 26 }}
            className="fixed bottom-5 right-5 z-50 w-[min(380px,calc(100vw-2rem))] h-[min(560px,calc(100vh-3rem))] bg-white rounded-2xl shadow-2xl shadow-black/20 border border-gray-100 flex flex-col overflow-hidden"
            role="dialog"
            aria-label="Support chat"
          >
            {widgetKind === 'family' && view === 'faq' ? (
              <FaqView
                userName={user.name || 'there'}
                selected={selectedFaq}
                onSelect={setSelectedFaq}
                onClose={() => setOpen(false)}
                onEscalate={escalate}
              />
            ) : (
              <>
                {widgetKind === 'provider' && myThread && (
                  <ProviderQuickPrompts onPick={onSend} />
                )}
                <ChatThreadView
                  thread={myThread}
                  messages={messagesForThread}
                  onSend={onSend}
                  onBack={
                    widgetKind === 'family'
                      ? () => {
                          setSelectedFaq(null);
                          setView('faq');
                        }
                      : () => setOpen(false)
                  }
                />
              </>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
