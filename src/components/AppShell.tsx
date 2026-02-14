'use client';

import React, { useState, Suspense } from 'react';
import { AuthProvider } from '@/contexts/AuthContext';
import { MessageProvider } from '@/contexts/MessageContext';
import { Sidebar } from './Sidebar';
import { LoginModal } from './LoginModal';

export function AppShell({ children }: { children: React.ReactNode }) {
  const [isLoginModalOpen, setIsLoginModalOpen] = useState(false);

  return (
    <AuthProvider>
      <MessageProvider>
        <div className="flex h-screen w-full overflow-hidden bg-background-light">
          <Suspense fallback={<div className="w-64 h-full bg-white border-r border-slate-200 shrink-0" />}>
            <Sidebar onLoginClick={() => setIsLoginModalOpen(true)} />
          </Suspense>
          {children}
        </div>

        <LoginModal
          isOpen={isLoginModalOpen}
          onClose={() => setIsLoginModalOpen(false)}
        />
      </MessageProvider>
    </AuthProvider>
  );
}
