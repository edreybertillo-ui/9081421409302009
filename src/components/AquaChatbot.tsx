import { useState, useRef, useEffect, useCallback } from 'react';
import { MessageCircle, X, Send, Droplets, Bot, Sparkles, AlertTriangle, Gauge, TrendingUp, Minimize2, Plus, History, Trash2, MessageSquare, ChevronLeft } from 'lucide-react';
import { useChatbot } from '../context/ChatbotContext';
import { useChatHistory, type ChatSession, type ChatMessage } from '../hooks/useData';

const AQUA_RESPONSES: Record<string, { response: string; suggestions?: string[] }> = {
  pressure: {
    response: "Water pressure is monitored across all floors using pressure sensors located in the riser pipes. Normal operating range is 2.0-5.0 bar. If pressure drops below 2.0 bar, it indicates low pressure which may affect water supply to upper floors. Pressure above 5.0 bar may indicate pump issues or valve problems.",
    suggestions: ['What is current pressure status?', 'How to fix low pressure?', 'Show pressure trends'],
  },
  tank: {
    response: "The main water tank is located on the 7th floor with a capacity of 5,000 liters. Tank levels are monitored in real-time. Critical level is below 15%, and low level warning triggers at 30%. The tank supplies water to all floors through gravity-fed distribution.",
    suggestions: ['Current tank level?', 'How is water distributed?', 'Tank maintenance schedule'],
  },
  alerts: {
    response: "Alerts are generated automatically when sensor readings exceed threshold values. Active alerts require immediate attention. You can view all alerts in the Alerts page, where you can acknowledge or resolve them. Critical alerts indicate urgent issues that need prompt action.",
    suggestions: ['Show active alerts', 'How to resolve alerts?', 'Alert notification settings'],
  },
  sensors: {
    response: "The system uses three types of sensors: pressure sensors in riser pipes, tank level sensors for storage monitoring, and flow sensors for consumption tracking. Sensors report every 5 seconds and have battery backup. You can view all sensor statuses on the Sensor Status page.",
    suggestions: ['Sensor health status', 'How to replace sensor battery?', 'Sensor calibration'],
  },
  maintenance: {
    response: "Regular maintenance includes: weekly sensor calibration checks, monthly pump inspections, quarterly tank cleaning, and annual pipe inspections. Preventive maintenance helps avoid unexpected failures and extends equipment lifespan.",
    suggestions: ['Maintenance schedule', 'Report maintenance issue', 'View maintenance logs'],
  },
  efficiency: {
    response: "To improve water efficiency, consider: installing leak detection systems, using pressure-regulating valves, implementing water recycling for non-potable uses, and scheduling high-consumption activities during off-peak hours. The Analytics page shows consumption patterns.",
    suggestions: ['View consumption analytics', 'Leak detection tips', 'Water conservation tips'],
  },
  dashboard: {
    response: "The dashboard provides a real-time overview of your water distribution network. It displays system status, connected sensors, active alerts, pressure monitoring charts, main tank level, sensor health distribution, and floor-by-floor monitoring data.",
    suggestions: ['Explain pressure chart', 'How to read tank level?', 'Navigate to other pages'],
  },
  floor: {
    response: "Each floor has pressure sensors monitoring the water pressure in riser pipes. The 7th floor houses the main storage tank. Pressure typically decreases slightly on upper floors due to elevation. All floors are monitored for real-time status.",
    suggestions: ['View floor details', 'Pressure by floor', 'Tank locations'],
  },
  emergency: {
    response: "In case of water emergency: 1) Check the Alerts page for critical issues, 2) For leaks, shut off the main valve and contact maintenance, 3) For pressure issues, check pump status, 4) For contamination concerns, stop water usage immediately and contact authorities.",
    suggestions: ['Emergency contacts', 'Shut-off valve locations', 'Report emergency'],
  },
  settings: {
    response: "System settings allow administrators to configure pressure thresholds (min/max), tank warning levels, auto-refresh intervals, and emergency mode. Thresholds determine when alerts are generated. Changes to settings are logged for audit purposes.",
    suggestions: ['Change pressure thresholds', 'Adjust tank levels', 'View audit logs'],
  },
  help: {
    response: "I'm Aqua, your water management assistant. I can help you understand: pressure monitoring, tank levels, sensor status, alerts and their meanings, maintenance recommendations, efficiency tips, and dashboard navigation. What would you like to know?",
    suggestions: ['Explain dashboard', 'Current system status', 'Maintenance tips'],
  },
};

const QUICK_ACTIONS = [
  { icon: Gauge, label: 'Pressure Status', key: 'pressure' },
  { icon: Droplets, label: 'Tank Level', key: 'tank' },
  { icon: AlertTriangle, label: 'Active Alerts', key: 'alerts' },
  { icon: TrendingUp, label: 'Efficiency Tips', key: 'efficiency' },
];

function generateResponse(userMessage: string): { response: string; suggestions?: string[] } {
  const lowerMsg = userMessage.toLowerCase();

  if (lowerMsg.includes('pressure') || lowerMsg.includes('bar') || lowerMsg.includes('psi')) {
    return AQUA_RESPONSES.pressure;
  }
  if (lowerMsg.includes('tank') || lowerMsg.includes('level') || lowerMsg.includes('storage') || lowerMsg.includes('capacity')) {
    return AQUA_RESPONSES.tank;
  }
  if (lowerMsg.includes('alert') || lowerMsg.includes('warning') || lowerMsg.includes('critical') || lowerMsg.includes('issue')) {
    return AQUA_RESPONSES.alerts;
  }
  if (lowerMsg.includes('sensor') || lowerMsg.includes('device') || lowerMsg.includes('reading')) {
    return AQUA_RESPONSES.sensors;
  }
  if (lowerMsg.includes('maintain') || lowerMsg.includes('repair') || lowerMsg.includes('fix') || lowerMsg.includes('schedule')) {
    return AQUA_RESPONSES.maintenance;
  }
  if (lowerMsg.includes('efficiency') || lowerMsg.includes('save') || lowerMsg.includes('consumption') || lowerMsg.includes('usage')) {
    return AQUA_RESPONSES.efficiency;
  }
  if (lowerMsg.includes('dashboard') || lowerMsg.includes('overview') || lowerMsg.includes('home')) {
    return AQUA_RESPONSES.dashboard;
  }
  if (lowerMsg.includes('floor') || lowerMsg.includes('building') || lowerMsg.includes('level')) {
    return AQUA_RESPONSES.floor;
  }
  if (lowerMsg.includes('emergency') || lowerMsg.includes('urgent') || lowerMsg.includes('leak')) {
    return AQUA_RESPONSES.emergency;
  }
  if (lowerMsg.includes('setting') || lowerMsg.includes('config') || lowerMsg.includes('threshold')) {
    return AQUA_RESPONSES.settings;
  }
  if (lowerMsg.includes('help') || lowerMsg.includes('what can') || lowerMsg.includes('who are')) {
    return AQUA_RESPONSES.help;
  }

  return {
    response: "I can help you with water management questions about pressure monitoring, tank levels, sensors, alerts, maintenance, and efficiency. You can also ask about the dashboard features or system settings. What would you like to know?",
    suggestions: ['System overview', 'Current alerts', 'Maintenance tips', 'Efficiency recommendations'],
  };
}

function generateChatTitle(firstMessage: string): string {
  const lowerMsg = firstMessage.toLowerCase();

  if (lowerMsg.includes('pressure')) return 'Pressure Inquiry';
  if (lowerMsg.includes('tank')) return 'Tank Discussion';
  if (lowerMsg.includes('alert')) return 'Alert Help';
  if (lowerMsg.includes('sensor')) return 'Sensor Support';
  if (lowerMsg.includes('maintenance') || lowerMsg.includes('repair')) return 'Maintenance Chat';
  if (lowerMsg.includes('efficiency') || lowerMsg.includes('save')) return 'Efficiency Tips';
  if (lowerMsg.includes('dashboard')) return 'Dashboard Overview';
  if (lowerMsg.includes('emergency') || lowerMsg.includes('leak')) return 'Emergency Support';
  if (lowerMsg.includes('help')) return 'Getting Help';

  // Default: use first 25 chars of message
  return firstMessage.slice(0, 25) + (firstMessage.length > 25 ? '...' : '');
}

interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  suggestions?: string[];
}

export function AquaChatbot() {
  const { isOpen, setIsOpen } = useChatbot();
  const { sessions, loading: sessionsLoading, createSession, updateSessionTitle, deleteSession, getMessages, addMessage, refetchSessions } = useChatHistory();

  const [currentSessionId, setCurrentSessionId] = useState<string | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const [showHistory, setShowHistory] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Load messages when session changes
  useEffect(() => {
    if (currentSessionId) {
      getMessages(currentSessionId).then((dbMessages) => {
        setMessages(dbMessages.map((m) => ({
          id: m.id,
          role: m.role,
          content: m.content,
          suggestions: m.suggestions || undefined,
        })));
      });
    } else {
      // New chat - show welcome message
      setMessages([
        {
          id: 'welcome',
          role: 'assistant',
          content: "Hello! I'm Aqua, your water management assistant. I can help you understand your water distribution system, answer questions about sensors and alerts, and provide recommendations. How can I help you today?",
          suggestions: ['Dashboard overview', 'Current pressure status', 'Tank level', 'Active alerts'],
        },
      ]);
    }
  }, [currentSessionId, getMessages]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const startNewChat = useCallback(async () => {
    setCurrentSessionId(null);
    setShowHistory(false);
    setMessages([
      {
        id: 'welcome',
        role: 'assistant',
        content: "Hello! I'm Aqua, your water management assistant. How can I help you today?",
        suggestions: ['Dashboard overview', 'Current pressure status', 'Tank level', 'Active alerts'],
      },
    ]);
  }, []);

  const loadSession = useCallback(async (session: ChatSession) => {
    setCurrentSessionId(session.id);
    setShowHistory(false);
  }, []);

  const handleSend = async (text: string) => {
    if (!text.trim()) return;

    const userMessage: Message = {
      id: `temp-user-${Date.now()}`,
      role: 'user',
      content: text.trim(),
    };

    setMessages((prev) => [...prev, userMessage]);
    setInput('');
    setIsTyping(true);

    // Create session if needed
    let sessionId = currentSessionId;
    if (!sessionId) {
      const title = generateChatTitle(text.trim());
      const session = await createSession(title);
      if (session) {
        sessionId = session.id;
        setCurrentSessionId(session.id);
      }
    }

    // Save user message
    if (sessionId) {
      await addMessage(sessionId, 'user', text.trim());
    }

    // Simulate typing delay
    await new Promise((r) => setTimeout(r, 800 + Math.random() * 400));

    const { response, suggestions } = generateResponse(text);

    const assistantMessage: Message = {
      id: `temp-assistant-${Date.now()}`,
      role: 'assistant',
      content: response,
      suggestions,
    };

    setIsTyping(false);
    setMessages((prev) => [...prev, assistantMessage]);

    // Save assistant message
    if (sessionId) {
      await addMessage(sessionId, 'assistant', response, suggestions);
    }
  };

  const handleDeleteSession = async (e: React.MouseEvent, sessionId: string) => {
    e.stopPropagation();
    await deleteSession(sessionId);
    if (currentSessionId === sessionId) {
      startNewChat();
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    handleSend(input);
  };

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

    if (diffDays === 0) return 'Today';
    if (diffDays === 1) return 'Yesterday';
    if (diffDays < 7) return `${diffDays} days ago`;
    return date.toLocaleDateString();
  };

  return (
    <>
      {/* Floating action button - very visible */}
      {!isOpen && (
        <button
          onClick={() => setIsOpen(true)}
          className="fixed bottom-6 right-6 z-50 flex items-center gap-3 px-5 py-4 rounded-2xl bg-gradient-to-r from-cyan-500 via-primary-500 to-primary-600 text-white shadow-2xl hover:shadow-primary-500/30 transition-all duration-300 group animate-bounce-subtle"
        >
          <div className="relative">
            <MessageCircle className="w-6 h-6" />
            <span className="absolute -top-1 -right-1 w-3 h-3 bg-success-400 rounded-full border-2 border-white">
              <span className="absolute inset-0 rounded-full bg-success-400 animate-ping" />
            </span>
          </div>
          <div className="flex flex-col items-start">
            <span className="font-semibold text-base">Chat with Aqua</span>
            <span className="text-xs text-white/80">Get instant help</span>
          </div>
          <Sparkles className="w-5 h-5 text-white/60 group-hover:text-white transition-colors" />
        </button>
      )}

      {/* Minimize button when open */}
      {isOpen && (
        <button
          onClick={() => setIsOpen(false)}
          className="fixed bottom-6 right-6 z-50 flex items-center gap-2 px-4 py-3 rounded-xl bg-slate-800 dark:bg-slate-700 text-white shadow-lg hover:bg-slate-700 dark:hover:bg-slate-600 transition-all duration-300"
          title="Minimize Aqua"
        >
          <Minimize2 className="w-4 h-4" />
          <span className="text-sm font-medium">Minimize</span>
        </button>
      )}

      {/* Chat panel - fixed right side */}
      <div
        className={`fixed top-0 right-0 bottom-0 w-full sm:w-[420px] z-40 bg-white dark:bg-slate-900 shadow-2xl border-l border-slate-200 dark:border-slate-800 flex flex-col transition-transform duration-300 ease-in-out ${
          isOpen ? 'translate-x-0' : 'translate-x-full'
        }`}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 bg-gradient-to-r from-cyan-500 via-primary-500 to-primary-600 text-white flex-shrink-0">
          <div className="flex items-center gap-3">
            {showHistory ? (
              <button
                onClick={() => setShowHistory(false)}
                className="w-10 h-10 rounded-xl hover:bg-white/20 flex items-center justify-center transition-colors"
              >
                <ChevronLeft className="w-5 h-5" />
              </button>
            ) : (
              <div className="w-12 h-12 rounded-xl bg-white/20 flex items-center justify-center backdrop-blur-sm">
                <Droplets className="w-6 h-6" />
              </div>
            )}
            <div>
              <h3 className="font-bold text-lg">{showHistory ? 'Chat History' : 'Aqua'}</h3>
              <p className="text-sm text-white/80">{showHistory ? `${sessions.length} conversations` : 'Water Management Assistant'}</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {!showHistory && (
              <button
                onClick={() => setShowHistory(true)}
                className="w-10 h-10 rounded-xl hover:bg-white/20 flex items-center justify-center transition-colors"
                title="Chat History"
              >
                <History className="w-5 h-5" />
              </button>
            )}
            <button
              onClick={() => setIsOpen(false)}
              className="w-10 h-10 rounded-xl hover:bg-white/20 flex items-center justify-center transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* History view */}
        {showHistory ? (
          <div className="flex-1 overflow-y-auto bg-slate-50 dark:bg-slate-950">
            <div className="p-4">
              <button
                onClick={startNewChat}
                className="w-full flex items-center justify-center gap-2 px-4 py-3 rounded-xl bg-gradient-to-r from-cyan-500 to-primary-600 text-white font-medium hover:shadow-lg transition-all"
              >
                <Plus className="w-5 h-5" />
                Start New Chat
              </button>
            </div>

            <div className="px-4 space-y-2 pb-4">
              {sessionsLoading ? (
                <div className="flex justify-center py-8">
                  <div className="w-6 h-6 border-2 border-slate-300 dark:border-slate-600 border-t-primary-500 rounded-full animate-spin" />
                </div>
              ) : sessions.length === 0 ? (
                <div className="text-center py-8 text-slate-500 dark:text-slate-400">
                  <MessageSquare className="w-12 h-12 mx-auto mb-2 opacity-50" />
                  <p className="text-sm">No previous chats</p>
                </div>
              ) : (
                sessions.map((session) => (
                  <div
                    key={session.id}
                    onClick={() => loadSession(session)}
                    className={`group flex items-center gap-3 p-3 rounded-xl cursor-pointer transition-all ${
                      currentSessionId === session.id
                        ? 'bg-primary-50 dark:bg-primary-950 border border-primary-200 dark:border-primary-800'
                        : 'bg-white dark:bg-slate-900 hover:bg-slate-100 dark:hover:bg-slate-800 border border-slate-200 dark:border-slate-800'
                    }`}
                  >
                    <div className={`w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0 ${
                      currentSessionId === session.id
                        ? 'bg-primary-100 dark:bg-primary-900'
                        : 'bg-slate-100 dark:bg-slate-800'
                    }`}>
                      <MessageSquare className={`w-5 h-5 ${
                        currentSessionId === session.id
                          ? 'text-primary-600 dark:text-primary-400'
                          : 'text-slate-500 dark:text-slate-400'
                      }`} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className={`font-medium text-sm truncate ${
                        currentSessionId === session.id
                          ? 'text-primary-700 dark:text-primary-300'
                          : 'text-slate-900 dark:text-slate-100'
                      }`}>{session.title}</p>
                      <p className="text-xs text-slate-500 dark:text-slate-400">{formatDate(session.updated_at)}</p>
                    </div>
                    <button
                      onClick={(e) => handleDeleteSession(e, session.id)}
                      className="w-8 h-8 rounded-lg flex items-center justify-center opacity-0 group-hover:opacity-100 hover:bg-error-100 dark:hover:bg-error-950 text-error-500 transition-all"
                      title="Delete chat"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                ))
              )}
            </div>
          </div>
        ) : (
          <>
            {/* Messages */}
            <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-slate-50 dark:bg-slate-950">
              {messages.map((msg) => (
                <div
                  key={msg.id}
                  className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
                >
                  <div
                    className={`max-w-[85%] ${
                      msg.role === 'user'
                        ? 'bg-primary-600 text-white rounded-2xl rounded-br-md'
                        : 'bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 rounded-2xl rounded-bl-md shadow-sm border border-slate-200 dark:border-slate-800'
                    } px-4 py-3`}
                  >
                    <div className="flex items-start gap-2 mb-1">
                      {msg.role === 'assistant' && <Bot className="w-4 h-4 text-cyan-500 flex-shrink-0 mt-0.5" />}
                      <p className="text-sm leading-relaxed">{msg.content}</p>
                    </div>
                    {msg.suggestions && (
                      <div className="flex flex-wrap gap-2 mt-3 pt-3 border-t border-slate-100 dark:border-slate-800">
                        {msg.suggestions.map((s, i) => (
                          <button
                            key={i}
                            onClick={() => handleSend(s)}
                            className="text-xs px-3 py-1.5 rounded-lg bg-cyan-50 dark:bg-cyan-950 text-cyan-700 dark:text-cyan-300 hover:bg-cyan-100 dark:hover:bg-cyan-900 transition-colors"
                          >
                            {s}
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              ))}

              {isTyping && (
                <div className="flex justify-start">
                  <div className="bg-white dark:bg-slate-900 rounded-2xl rounded-bl-md shadow-sm border border-slate-200 dark:border-slate-800 px-4 py-3">
                    <div className="flex items-center gap-2">
                      <Bot className="w-4 h-4 text-cyan-500" />
                      <div className="flex gap-1">
                        <span className="w-2 h-2 rounded-full bg-slate-400 animate-bounce" style={{ animationDelay: '0ms' }} />
                        <span className="w-2 h-2 rounded-full bg-slate-400 animate-bounce" style={{ animationDelay: '150ms' }} />
                        <span className="w-2 h-2 rounded-full bg-slate-400 animate-bounce" style={{ animationDelay: '300ms' }} />
                      </div>
                    </div>
                  </div>
                </div>
              )}
              <div ref={messagesEndRef} />
            </div>

            {/* Quick actions */}
            {messages.length <= 2 && !currentSessionId && (
              <div className="px-4 py-3 border-t border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 flex-shrink-0">
                <p className="text-xs text-slate-500 dark:text-slate-400 mb-2 flex items-center gap-1">
                  <Sparkles className="w-3 h-3" /> Quick actions
                </p>
                <div className="grid grid-cols-2 gap-2">
                  {QUICK_ACTIONS.map((action) => (
                    <button
                      key={action.key}
                      onClick={() => handleSend(action.label)}
                      className="flex items-center gap-2 px-3 py-2.5 rounded-lg bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 text-xs font-medium hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors"
                    >
                      <action.icon className="w-3.5 h-3.5 text-cyan-500" />
                      {action.label}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Input */}
            <form onSubmit={handleSubmit} className="flex items-center gap-2 p-4 border-t border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 flex-shrink-0">
              <input
                type="text"
                value={input}
                onChange={(e) => setInput(e.target.value)}
                placeholder="Ask Aqua anything..."
                className="flex-1 px-4 py-3 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-900 dark:text-slate-100 placeholder-slate-400 dark:placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-cyan-500/40 text-sm"
              />
              <button
                type="submit"
                disabled={!input.trim()}
                className="w-12 h-12 rounded-xl bg-gradient-to-br from-cyan-500 to-primary-600 text-white flex items-center justify-center disabled:opacity-50 disabled:cursor-not-allowed hover:shadow-lg transition-all flex-shrink-0"
              >
                <Send className="w-5 h-5" />
              </button>
            </form>
          </>
        )}
      </div>
    </>
  );
}
