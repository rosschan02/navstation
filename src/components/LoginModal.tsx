'use client';

import React, { useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';

interface LoginModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function LoginModal({ isOpen, onClose }: LoginModalProps) {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const { login } = useAuth();

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const result = await login(username, password);
    if (result.success) {
      setUsername('');
      setPassword('');
      setError('');
      onClose();
    } else {
      setError(result.error || '用户名或密码错误');
    }
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto" aria-labelledby="modal-title" role="dialog" aria-modal="true">
      <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm transition-opacity" onClick={onClose} />

      <div className="flex min-h-full items-center justify-center p-4 text-center">
        <div className="relative transform overflow-hidden rounded-2xl bg-white text-left shadow-xl transition-all w-full max-w-md">
          <div className="bg-primary/5 p-8 text-center border-b border-primary/10">
            <div className="inline-flex items-center justify-center size-16 rounded-2xl bg-gradient-to-br from-primary to-blue-600 text-white shadow-lg shadow-primary/30 mb-4">
              <span className="material-symbols-outlined" style={{ fontSize: 32 }}>lock</span>
            </div>
            <h2 className="text-2xl font-bold text-slate-900">管理员登录</h2>
            <p className="text-slate-500 mt-2 text-sm">请输入凭据以访问工作区</p>
          </div>

          <form onSubmit={handleSubmit} className="p-8 flex flex-col gap-5">
            {error && (
              <div className="bg-red-50 text-red-600 text-sm py-2 px-3 rounded-lg flex items-center gap-2">
                <span className="material-symbols-outlined text-[18px]">error</span>
                {error}
              </div>
            )}

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">账号</label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
                  <span className="material-symbols-outlined text-[20px]">person</span>
                </div>
                <input
                  type="text"
                  className="block w-full pl-10 pr-3 py-2.5 border border-slate-300 rounded-xl focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all text-sm outline-none"
                  placeholder="请输入用户名"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">密码</label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
                  <span className="material-symbols-outlined text-[20px]">key</span>
                </div>
                <input
                  type="password"
                  className="block w-full pl-10 pr-3 py-2.5 border border-slate-300 rounded-xl focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all text-sm outline-none"
                  placeholder="请输入密码"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                />
              </div>
            </div>

            <button
              type="submit"
              className="w-full bg-primary hover:bg-blue-600 text-white font-bold py-3 px-4 rounded-xl shadow-lg shadow-primary/20 transition-all active:scale-[0.98] mt-2"
            >
              登录
            </button>

            <div className="flex items-center justify-end text-xs text-slate-400 mt-2">
              <button type="button" onClick={onClose} className="hover:text-slate-600">取消</button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
