'use client';

import React, { useState, useRef, useEffect } from 'react';
import { useTranslations } from 'next-intl';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import { useMessage } from '@/contexts/MessageContext';

export function ProfileClient() {
  const t = useTranslations('profile');
  const tm = useTranslations('messages');
  const router = useRouter();
  const message = useMessage();
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
        message.error(tm('上传失败'));
      }
    } catch (error) {
      console.error('Upload failed:', error);
      message.error(tm('上传失败'));
    }
  };

  const handleSaveAvatar = async () => {
    setIsSavingAvatar(true);

    try {
      const res = await fetch('/api/auth/profile', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ avatar }),
      });

      if (res.ok) {
        message.success(tm('头像已保存'));
        refreshUser?.();
        router.refresh();
      } else {
        const data = await res.json();
        message.error(data.error || tm('保存失败'));
      }
    } catch (error) {
      console.error('Failed to save avatar:', error);
      message.error(tm('保存失败'));
    } finally {
      setIsSavingAvatar(false);
    }
  };

  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();

    if (passwords.new_password !== passwords.confirm_password) {
      message.error(tm('两次输入的新密码不一致'));
      return;
    }

    if (passwords.new_password.length < 4) {
      message.error(tm('新密码长度至少4位'));
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
        message.success(tm('密码修改成功'));
        setPasswords({ old_password: '', new_password: '', confirm_password: '' });
      } else {
        const data = await res.json();
        message.error(data.error || tm('修改失败'));
      }
    } catch (error) {
      console.error('Failed to change password:', error);
      message.error(tm('修改失败'));
    } finally {
      setIsSavingPassword(false);
    }
  };

  return (
    <div className="flex-1 flex flex-col h-full overflow-hidden relative bg-background-light">
      <div className="flex-1 overflow-y-auto p-6 md:p-8 lg:px-12">
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight">{t('title')}</h1>
          <p className="text-slate-500 mt-1">{t('subtitle')}</p>
        </div>

        <div className="max-w-2xl space-y-6">
          <div className="bg-white rounded-xl border border-slate-200 p-6">
            <h2 className="text-lg font-semibold text-slate-900 mb-4 flex items-center gap-2">
              <span className="material-symbols-outlined text-primary">account_circle</span>
              {t('avatar')}
            </h2>

            <div className="flex items-center gap-6">
              <div
                onClick={() => avatarInputRef.current?.click()}
                className="size-20 rounded-full border-2 border-dashed border-slate-200 hover:border-primary/50 flex items-center justify-center cursor-pointer transition-colors overflow-hidden bg-slate-100"
              >
                {avatarPreview ? (
                  <img src={avatarPreview} alt={t('avatar')} className="size-20 object-cover" />
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
                  if (file) void handleAvatarUpload(file);
                }}
              />
              <div className="flex-1">
                <p className="text-sm text-slate-600">{t('clickUploadAvatar')}</p>
                <p className="text-xs text-slate-400 mt-1">{t('avatarHint')}</p>
              </div>
              <button
                onClick={handleSaveAvatar}
                disabled={isSavingAvatar || avatar === user?.avatar}
                className="px-4 py-2 text-sm font-medium text-white bg-primary hover:bg-blue-600 rounded-lg transition-colors disabled:opacity-50 flex items-center gap-2"
              >
                {isSavingAvatar && (
                  <span className="material-symbols-outlined text-[18px] animate-spin">progress_activity</span>
                )}
                {t('saveAvatar')}
              </button>
            </div>
          </div>

          <div className="bg-white rounded-xl border border-slate-200 p-6">
            <h2 className="text-lg font-semibold text-slate-900 mb-4 flex items-center gap-2">
              <span className="material-symbols-outlined text-primary">lock</span>
              {t('changePassword')}
            </h2>

            <form onSubmit={handleChangePassword} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">
                  {t('currentPassword')}
                </label>
                <input
                  type="password"
                  value={passwords.old_password}
                  onChange={(e) => setPasswords({ ...passwords, old_password: e.target.value })}
                  className="w-full px-4 py-2 border border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-primary/20 focus:border-primary"
                  placeholder={t('currentPasswordPlaceholder')}
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">
                  {t('newPassword')}
                </label>
                <input
                  type="password"
                  value={passwords.new_password}
                  onChange={(e) => setPasswords({ ...passwords, new_password: e.target.value })}
                  className="w-full px-4 py-2 border border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-primary/20 focus:border-primary"
                  placeholder={t('newPasswordPlaceholder')}
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">
                  {t('confirmNewPassword')}
                </label>
                <input
                  type="password"
                  value={passwords.confirm_password}
                  onChange={(e) => setPasswords({ ...passwords, confirm_password: e.target.value })}
                  className="w-full px-4 py-2 border border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-primary/20 focus:border-primary"
                  placeholder={t('confirmNewPasswordPlaceholder')}
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
                  {t('submitPassword')}
                </button>
              </div>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
}
