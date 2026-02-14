'use client';

import React, { createContext, useCallback, useContext, useMemo, useState } from 'react';

type MessageType = 'success' | 'error' | 'info' | 'warning';

interface ToastItem {
  id: number;
  type: MessageType;
  text: string;
}

interface MessageContextValue {
  showMessage: (type: MessageType, text: string) => void;
  success: (text: string) => void;
  error: (text: string) => void;
  info: (text: string) => void;
  warning: (text: string) => void;
}

const MessageContext = createContext<MessageContextValue>({
  showMessage: () => {},
  success: () => {},
  error: () => {},
  info: () => {},
  warning: () => {},
});

const AUTO_DISMISS_MS = 3200;

function toastClass(type: MessageType) {
  if (type === 'success') return 'border-green-200 bg-green-50 text-green-700';
  if (type === 'error') return 'border-red-200 bg-red-50 text-red-700';
  if (type === 'warning') return 'border-amber-200 bg-amber-50 text-amber-700';
  return 'border-slate-200 bg-slate-50 text-slate-700';
}

function toastIcon(type: MessageType) {
  if (type === 'success') return 'check_circle';
  if (type === 'error') return 'error';
  if (type === 'warning') return 'warning';
  return 'info';
}

export function MessageProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = useState<ToastItem[]>([]);

  const removeToast = useCallback((id: number) => {
    setToasts((prev) => prev.filter((item) => item.id !== id));
  }, []);

  const showMessage = useCallback((type: MessageType, text: string) => {
    const id = Date.now() + Math.floor(Math.random() * 1000);
    setToasts((prev) => [...prev, { id, type, text }]);
    window.setTimeout(() => removeToast(id), AUTO_DISMISS_MS);
  }, [removeToast]);

  const value = useMemo<MessageContextValue>(() => ({
    showMessage,
    success: (text: string) => showMessage('success', text),
    error: (text: string) => showMessage('error', text),
    info: (text: string) => showMessage('info', text),
    warning: (text: string) => showMessage('warning', text),
  }), [showMessage]);

  return (
    <MessageContext.Provider value={value}>
      {children}

      <div className="pointer-events-none fixed inset-0 z-[200] flex items-center justify-center p-4">
        <div className="flex w-[min(92vw,420px)] flex-col gap-2">
          {toasts.map((toast) => (
            <div
              key={toast.id}
              className={`pointer-events-auto rounded-xl border px-4 py-3 shadow-lg backdrop-blur-sm ${toastClass(toast.type)}`}
              role="status"
              aria-live="polite"
            >
              <div className="flex items-start gap-3">
                <span className="material-symbols-outlined text-[20px]">{toastIcon(toast.type)}</span>
                <p className="flex-1 text-sm font-medium leading-5">{toast.text}</p>
                <button
                  type="button"
                  onClick={() => removeToast(toast.id)}
                  className="rounded-md p-0.5 opacity-70 transition-opacity hover:opacity-100"
                  aria-label="关闭消息"
                >
                  <span className="material-symbols-outlined text-[18px]">close</span>
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>
    </MessageContext.Provider>
  );
}

export function useMessage() {
  return useContext(MessageContext);
}
