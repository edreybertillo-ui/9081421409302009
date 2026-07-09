import { createContext, useContext, useState, type ReactNode } from 'react';

interface ChatbotContextType {
  isOpen: boolean;
  setIsOpen: (open: boolean) => void;
  toggle: () => void;
}

const ChatbotContext = createContext<ChatbotContextType | null>(null);

export function ChatbotProvider({ children }: { children: ReactNode }) {
 const [isOpen, setIsOpen] = useState(() => {
  const saved = localStorage.getItem('chatbot_open');
  return saved ? JSON.parse(saved) : false;
});

useEffect(() => {
  localStorage.setItem('chatbot_open', JSON.stringify(isOpen));
}, [isOpen]);

  const toggle = () => setIsOpen((prev) => !prev);

  return (
    <ChatbotContext.Provider value={{ isOpen, setIsOpen, toggle }}>
      {children}
    </ChatbotContext.Provider>
  );
}

export function useChatbot() {
  const ctx = useContext(ChatbotContext);
  if (!ctx) throw new Error('useChatbot must be used within ChatbotProvider');
  return ctx;
}
