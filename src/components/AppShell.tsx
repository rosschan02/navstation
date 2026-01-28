'use client';

import React, { useState } from 'react';
import { AuthProvider } from '@/contexts/AuthContext';
import { Sidebar } from './Sidebar';
import { LoginModal } from './LoginModal';
import { AddSiteModal } from './AddSiteModal';

export function AppShell({ children }: { children: React.ReactNode }) {
  const [isLoginModalOpen, setIsLoginModalOpen] = useState(false);
  const [isAddSiteModalOpen, setIsAddSiteModalOpen] = useState(false);

  return (
    <AuthProvider>
      <div className="flex h-screen w-full overflow-hidden bg-background-light">
        <Sidebar
          onLoginClick={() => setIsLoginModalOpen(true)}
          onAddSite={() => setIsAddSiteModalOpen(true)}
        />
        {children}
      </div>

      <LoginModal
        isOpen={isLoginModalOpen}
        onClose={() => setIsLoginModalOpen(false)}
      />

      <AddSiteModal
        isOpen={isAddSiteModalOpen}
        onClose={() => setIsAddSiteModalOpen(false)}
        onSaved={() => {
          // Trigger a page refresh to reload data
          window.location.reload();
        }}
      />
    </AuthProvider>
  );
}
