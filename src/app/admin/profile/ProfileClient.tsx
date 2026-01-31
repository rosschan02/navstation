'use client';

import React, { useState, useRef, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';

export function ProfileClient() {
  const router = useRouter();
  const { user, refreshUser } = useAuth();
  const [avatar, setAvatar] = useState<string>('');
  const [avatarPreview, setAvatarPreview] = useState<string>('');
  const avatarInputRef = useRef<HTMLInputElement>(null);

  const [passwords, setPasswords] = useState({
    old_password: '',
    new_password: '',
    confirm_password: '',
  });

  const [isSavingAvatar, setIsSavingAvatar] = useState(false);
  const [isSavingPassword, setIsSavingPassword] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  useEffect(() => {
    if (user?.avatar) {
      setAvatar(user.avatar);
      setAvatarPreview(user.avatar);
    }
  }, [user]);

  const handleAvatarUpload = async (file: File) => {
    const formData = new FormData();
    formData.append('file', file);
    formData.append('type', 'logo');

    try {
      const res = await fetch('/api/upload', {
        method: 'POST',
        body: formData,
      });

      if (res.ok) {
        const data = await res.json();
        const path = `/api/uploads/logos/${data.filename}`;
        setAvatarPreview(path);
        setAvatar(path);
      } else {
        setMessage({ type: 'error', text: '上传失败' });
      }
    } catch (error) {
      console.error('Upload failed:', error);
      setMessage({ type: 'error', text: '上传失败' });
    }
  };

  const handleSaveAvatar = async () => {
    setIsSavingAvatar(true);
    setMessage(null);

    try {
      const res = await fetch('/api/auth/profile', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ avatar }),
      });

      if (res.ok) {
        setMessage({ type: 'success', text: '头像已保存' });
        refreshUser?.();
        router.refresh();
      } else {
        const data = await res.json();
        setMessage({ type: 'error', text: data.error || '保存失败' });
      }
    } catch (error) {
      console.error('Failed to save avatar:', error);
      setMessage({ type: 'error', text: '保存失败' });
    } finally {
      setIsSavingAvatar(false);
    }
  };

  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setMessage(null);

    if (passwords.new_password !== passwords.confirm_password) {
      setMessage({ type: 'error', text: '两次输入的新密码不一致' });
      return;
    }

    if (passwords.new_password.length < 4) {
      setMessage({ type: 'error', text: '新密码长度至少4位' });
      return;
    }

    setIsSavingPassword(true);

    try {
      const res = await fetch('/api/auth/password', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          old_password: passwords.old_password,
          new_password: passwords.new_password,
        }),
      });

      if (res.ok) {
        setMessage({ type: 'success', text: '密码修改成功' });
        setPasswords({ old_password: '', new_password: '', confirm_password: '' });
      } else {
        const data = await res.json();
        setMessage({ type: 'error', text: data.error || '修改失败' });
      }
    } catch (error) {
      console.error('Failed to change password:', error);
      setMessage({ type: 'error', text: '修改失败' });
    } finally {
      setIsSavingPassword(false);
    }
  };

  return (
    <div className="flex-1 flex flex-col h-full overflow-hidden relative bg-background-light">
      <div className="flex-1 overflow-y-auto p-6 md:p-8 lg:px-12">
        {/* Header */}
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight">账号设置</h1>
          <p className="text-slate-500 mt-1">修改头像和密码</p>
        </div>

        {/* Message */}
        {message && (
          <div className={`mb-6 p-4 rounded-lg ${
            message.type === 'success'
              ? 'bg-green-50 text-green-700 border border-green-200'
              : 'bg-red-50 text-red-700 border border-red-200'
          }`}>
            <div className="flex items-center gap-2">
              <span className="material-symbols-outlined text-[20px]">
                {message.type === 'success' ? 'check_circle' : 'error'}
              </span>
              {message.text}
            </div>
          </div>
        )}

        <div className="max-w-2xl space-y-6">
          {/* Avatar Section */}
          <div className="bg-white rounded-xl border border-slate-200 p-6">
            <h2 className="text-lg font-semibold text-slate-900 mb-4 flex items-center gap-2">
              <span className="material-symbols-outlined text-primary">account_circle</span>
              头像
            </h2>

            <div className="flex items-center gap-6">
              <div
                onClick={() => avatarInputRef.current?.click()}
                className="size-20 rounded-full border-2 border-dashed border-slate-200 hover:border-primary/50 flex items-center justify-center cursor-pointer transition-colors overflow-hidden bg-slate-100"
              >
                {avatarPreview ? (
                  <img src={avatarPreview} alt="头像" className="size-20 object-cover" />
                ) : (
                  <span className="material-symbols-outlined text-slate-400 text-[32px]">person</span>
                )}
              </div>
              <input
                ref={avatarInputRef}
                type="file"
                accept="image/*"
                className="hidden"
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (file) handleAvatarUpload(file);
                }}
              />
              <div className="flex-1">
                <p className="text-sm text-slate-600">点击上传新头像</p>
                <p className="text-xs text-slate-400 mt-1">支持 PNG, JPG，建议 200x200px</p>
              </div>
              <button
                onClick={handleSaveAvatar}
                disabled={isSavingAvatar || avatar === user?.avatar}
                className="px-4 py-2 text-sm font-medium text-white bg-primary hover:bg-blue-600 rounded-lg transition-colors disabled:opacity-50 flex items-center gap-2"
              >
                {isSavingAvatar && (
                  <span className="material-symbols-outlined text-[18px] animate-spin">progress_activity</span>
                )}
                保存头像
              </button>
            </div>
          </div>

          {/* Password Section */}
          <div className="bg-white rounded-xl border border-slate-200 p-6">
            <h2 className="text-lg font-semibold text-slate-900 mb-4 flex items-center gap-2">
              <span className="material-symbols-outlined text-primary">lock</span>
              修改密码
            </h2>

            <form onSubmit={handleChangePassword} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">
                  当前密码
                </label>
                <input
                  type="password"
                  value={passwords.old_password}
                  onChange={(e) => setPasswords({ ...passwords, old_password: e.target.value })}
                  className="w-full px-4 py-2 border border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-primary/20 focus:border-primary"
                  placeholder="请输入当前密码"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">
                  新密码
                </label>
                <input
                  type="password"
                  value={passwords.new_password}
                  onChange={(e) => setPasswords({ ...passwords, new_password: e.target.value })}
                  className="w-full px-4 py-2 border border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-primary/20 focus:border-primary"
                  placeholder="请输入新密码（至少4位）"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">
                  确认新密码
                </label>
                <input
                  type="password"
                  value={passwords.confirm_password}
                  onChange={(e) => setPasswords({ ...passwords, confirm_password: e.target.value })}
                  className="w-full px-4 py-2 border border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-primary/20 focus:border-primary"
                  placeholder="请再次输入新密码"
                  required
                />
              </div>

              <div className="flex justify-end pt-2">
                <button
                  type="submit"
                  disabled={isSavingPassword}
                  className="px-6 py-2 text-sm font-medium text-white bg-primary hover:bg-blue-600 rounded-lg transition-colors disabled:opacity-50 flex items-center gap-2"
                >
                  {isSavingPassword && (
                    <span className="material-symbols-outlined text-[18px] animate-spin">progress_activity</span>
                  )}
                  修改密码
                </button>
              </div>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
}
