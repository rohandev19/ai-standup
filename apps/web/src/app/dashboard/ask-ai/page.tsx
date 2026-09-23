'use client';
import { useState, useRef, useEffect } from 'react';
import { useWorkspace } from '@/contexts/WorkspaceContext';
import { Send, Bot, User, Loader2 } from 'lucide-react';
import { api } from '@/lib/api';
import styles from './ask-ai.module.css';

type Message = {
  id: string;
  role: 'user' | 'assistant';
  content: string;
};

export default function AskAiPage() {
  const { activeWorkspace } = useWorkspace();
  const [messages, setMessages] = useState<Message[]>([
    {
      id: 'welcome',
      role: 'assistant',
      content: 'Halo! Saya AI Asisten untuk workspace ini. Anda bisa bertanya tentang riwayat standup tim selama 30 hari terakhir. Apa yang ingin Anda ketahui?',
    },
  ]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || isLoading || !activeWorkspace) return;

    const userMessage: Message = {
      id: Date.now().toString(),
      role: 'user',
      content: input.trim(),
    };

    setMessages((prev) => [...prev, userMessage]);
    setInput('');
    setIsLoading(true);

    try {
      const response = await api.post(`/workspaces/${activeWorkspace.id}/ask-ai`, {
        question: userMessage.content,
        days: 30,
      });

      const aiMessage: Message = {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: response.data.answer,
      };

      setMessages((prev) => [...prev, aiMessage]);
    } catch (error: any) {
      const errorMessage: Message = {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: error.response?.data?.message || 'Maaf, terjadi kesalahan saat menghubungi AI.',
      };
      setMessages((prev) => [...prev, errorMessage]);
    } finally {
      setIsLoading(false);
    }
  };

  if (!activeWorkspace) {
    return (
      <div style={{ padding: '2rem', color: 'white' }}>
        Please select a workspace first.
      </div>
    );
  }

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <div className={styles.headerIcon}>
          <Bot size={24} color="white" />
        </div>
        <div>
          <h2 className={styles.headerTitle}>Ask AI</h2>
          <p className={styles.headerSubtitle}>
            Query 30 days of standup history
          </p>
        </div>
      </div>

      <div className={styles.messageList}>
        {messages.map((msg) => {
          const isUser = msg.role === 'user';
          return (
            <div key={msg.id} className={`${styles.messageRow} ${isUser ? styles.user : styles.assistant}`}>
              <div className={`${styles.avatar} ${isUser ? styles.user : styles.assistant}`}>
                {isUser ? <User size={20} /> : <Bot size={20} />}
              </div>
              <div className={`${styles.bubble} ${isUser ? styles.user : styles.assistant}`}>
                {msg.content}
              </div>
            </div>
          );
        })}
        {isLoading && (
          <div className={`${styles.messageRow} ${styles.assistant}`}>
            <div className={`${styles.avatar} ${styles.assistant}`}>
              <Bot size={20} />
            </div>
            <div className={`${styles.bubble} ${styles.assistant} ${styles.loadingBubble}`}>
              <Loader2 className={styles.animateSpin} size={16} /> Memikirkan jawaban...
            </div>
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      <div className={styles.inputArea}>
        <form onSubmit={handleSubmit} className={styles.form}>
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Tanyakan sesuatu tentang tim..."
            className={styles.input}
            disabled={isLoading}
          />
          <button 
            type="submit" 
            className={styles.sendBtn}
            disabled={!input.trim() || isLoading}
          >
            <Send size={18} />
          </button>
        </form>
      </div>
    </div>
  );
}
