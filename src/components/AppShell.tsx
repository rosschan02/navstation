'use client';

import React, { useState } from 'react';
import { AuthProvider } from '@/contexts/AuthContext';
import { Sidebar } from './Sidebar';
import { LoginModal } from './LoginModal';

export function AppShell({ children }: { children: React.ReactNode }) {
  const [isLoginModalOpen, setIsLoginModalOpen] = useState(false);

  return (
    <AuthProvider>
      <div className="flex h-screen w-full overflow-hidden bg-background-light">
        <Sidebar onLoginClick={() => setIsLoginModalOpen(true)} />
        {children}
      </div>

      <LoginModal
        isOpen={isLoginModalOpen}
        onClose={() => setIsLoginModalOpen(false)}
      />
    </AuthProvider>
  );
}
