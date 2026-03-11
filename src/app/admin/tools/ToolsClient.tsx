'use client';

import React, { useState } from 'react';
import { useTranslations } from 'next-intl';

type ToolType = 'ping' | 'tracert';

interface ToolResult {
    output?: string;
    error?: string;
}

export function ToolsClient() {
    const t = useTranslations('tools');
    const [pingHost, setPingHost] = useState('');
    const [pingCount, setPingCount] = useState(4);
    const [pingResult, setPingResult] = useState<ToolResult | null>(null);
    const [pingLoading, setPingLoading] = useState(false);

    const [tracertHost, setTracertHost] = useState('');
    const [tracertResult, setTracertResult] = useState<ToolResult | null>(null);
    const [tracertLoading, setTracertLoading] = useState(false);

    const [activeTab, setActiveTab] = useState<ToolType>('ping');

    const handlePing = async () => {
        if (!pingHost.trim()) return;
        setPingLoading(true);
        setPingResult(null);
        try {
            const res = await fetch('/api/tools/ping', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ host: pingHost.trim(), count: pingCount }),
            });
            const data = await res.json();
            setPingResult(data);
        } catch {
            setPingResult({ error: t('requestFailed') });
        } finally {
            setPingLoading(false);
        }
    };

    const handleTracert = async () => {
        if (!tracertHost.trim()) return;
        setTracertLoading(true);
        setTracertResult(null);
        try {
            const res = await fetch('/api/tools/tracert', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ host: tracertHost.trim() }),
            });
            const data = await res.json();
            setTracertResult(data);
        } catch {
            setTracertResult({ error: t('requestFailed') });
        } finally {
            setTracertLoading(false);
        }
    };

    const handleKeyDown = (e: React.KeyboardEvent, action: () => void) => {
        if (e.key === 'Enter') action();
    };

    return (
        <div className="flex-1 flex flex-col h-full overflow-hidden relative bg-background-light">
            <div className="flex-1 overflow-y-auto p-6 md:p-8 lg:px-12">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
                    <div>
                        <h1 className="text-2xl font-bold text-slate-900 tracking-tight">{t('title')}</h1>
                        <p className="text-slate-500 mt-1">{t('subtitle')}</p>
                    </div>
                </div>

                <div className="flex gap-1 bg-slate-100 rounded-xl p-1 mb-6 w-fit">
                    <button
                        onClick={() => setActiveTab('ping')}
                        className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all ${activeTab === 'ping'
                            ? 'bg-white text-primary shadow-sm'
                            : 'text-slate-500 hover:text-slate-700'
                            }`}
                        >
                            <span className="material-symbols-outlined text-[18px]">network_ping</span>
                        {t('pingTab')}
                    </button>
                    <button
                        onClick={() => setActiveTab('tracert')}
                        className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all ${activeTab === 'tracert'
                            ? 'bg-white text-primary shadow-sm'
                            : 'text-slate-500 hover:text-slate-700'
                            }`}
                        >
                            <span className="material-symbols-outlined text-[18px]">route</span>
                        {t('tracerouteTab')}
                    </button>
                </div>

                {activeTab === 'ping' && (
                    <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
                        <div className="p-5 border-b border-slate-100">
                            <div className="flex flex-col sm:flex-row gap-3">
                                <div className="flex-1">
                                    <label className="text-xs font-medium text-slate-500 mb-1.5 block">{t('targetAddress')}</label>
                                    <input
                                        type="text"
                                        value={pingHost}
                                        onChange={(e) => setPingHost(e.target.value)}
                                        onKeyDown={(e) => handleKeyDown(e, handlePing)}
                                        placeholder={t('pingPlaceholder')}
                                        className="w-full px-3. py-2.5 rounded-lg border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all placeholder:text-slate-400"
                                        disabled={pingLoading}
                                    />
                                </div>
                                <div className="w-24">
                                    <label className="text-xs font-medium text-slate-500 mb-1.5 block">{t('count')}</label>
                                    <input
                                        type="number"
                                        value={pingCount}
                                        onChange={(e) => setPingCount(Number(e.target.value))}
                                        min={1}
                                        max={20}
                                        className="w-full px-3 py-2.5 rounded-lg border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all"
                                        disabled={pingLoading}
                                    />
                                </div>
                                <div className="flex items-end">
                                    <button
                                        onClick={handlePing}
                                        disabled={pingLoading || !pingHost.trim()}
                                        className="flex items-center gap-2 px-5 py-2.5 bg-primary text-white rounded-lg text-sm font-medium hover:bg-primary/90 disabled:opacity-50 disabled:cursor-not-allowed transition-all shadow-sm shadow-primary/20"
                                    >
                                        {pingLoading ? (
                                            <>
                                                <span className="material-symbols-outlined text-[18px] animate-spin">progress_activity</span>
                                                {t('running')}
                                            </>
                                        ) : (
                                            <>
                                                <span className="material-symbols-outlined text-[18px]">play_arrow</span>
                                                {t('runPing')}
                                            </>
                                        )}
                                    </button>
                                </div>
                            </div>
                        </div>

                        {(pingResult || pingLoading) && (
                            <div className="p-5">
                                <div className="flex items-center gap-2 mb-3">
                                    <span className="material-symbols-outlined text-[16px] text-slate-400">terminal</span>
                                    <span className="text-xs font-medium text-slate-500 uppercase tracking-wider">{t('output')}</span>
                                </div>
                                <div className="bg-slate-900 rounded-xl p-4 overflow-x-auto">
                                    {pingLoading ? (
                                        <div className="flex items-center gap-2 text-green-400 text-sm font-mono">
                                            <span className="material-symbols-outlined text-[16px] animate-spin">progress_activity</span>
                                            {t('pingRunningHint')}
                                        </div>
                                    ) : pingResult?.error ? (
                                        <pre className="text-red-400 text-sm font-mono whitespace-pre-wrap break-all">{pingResult.error}</pre>
                                    ) : (
                                        <pre className="text-green-400 text-sm font-mono whitespace-pre-wrap break-all">{pingResult?.output}</pre>
                                    )}
                                </div>
                            </div>
                        )}
                    </div>
                )}

                {activeTab === 'tracert' && (
                    <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
                        <div className="p-5 border-b border-slate-100">
                            <div className="flex flex-col sm:flex-row gap-3">
                                <div className="flex-1">
                                    <label className="text-xs font-medium text-slate-500 mb-1.5 block">{t('targetAddress')}</label>
                                    <input
                                        type="text"
                                        value={tracertHost}
                                        onChange={(e) => setTracertHost(e.target.value)}
                                        onKeyDown={(e) => handleKeyDown(e, handleTracert)}
                                        placeholder={t('traceroutePlaceholder')}
                                        className="w-full px-3 py-2.5 rounded-lg border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all placeholder:text-slate-400"
                                        disabled={tracertLoading}
                                    />
                                </div>
                                <div className="flex items-end">
                                    <button
                                        onClick={handleTracert}
                                        disabled={tracertLoading || !tracertHost.trim()}
                                        className="flex items-center gap-2 px-5 py-2.5 bg-primary text-white rounded-lg text-sm font-medium hover:bg-primary/90 disabled:opacity-50 disabled:cursor-not-allowed transition-all shadow-sm shadow-primary/20"
                                    >
                                        {tracertLoading ? (
                                            <>
                                                <span className="material-symbols-outlined text-[18px] animate-spin">progress_activity</span>
                                                {t('running')}
                                            </>
                                        ) : (
                                            <>
                                                <span className="material-symbols-outlined text-[18px]">play_arrow</span>
                                                {t('runTraceroute')}
                                            </>
                                        )}
                                    </button>
                                </div>
                            </div>
                            {tracertLoading && (
                                <p className="text-xs text-amber-600 mt-2 flex items-center gap-1">
                                    <span className="material-symbols-outlined text-[14px]">info</span>
                                    {t('tracerouteHint')}
                                </p>
                            )}
                        </div>

                        {(tracertResult || tracertLoading) && (
                            <div className="p-5">
                                <div className="flex items-center gap-2 mb-3">
                                    <span className="material-symbols-outlined text-[16px] text-slate-400">terminal</span>
                                    <span className="text-xs font-medium text-slate-500 uppercase tracking-wider">{t('output')}</span>
                                </div>
                                <div className="bg-slate-900 rounded-xl p-4 overflow-x-auto">
                                    {tracertLoading ? (
                                        <div className="flex items-center gap-2 text-green-400 text-sm font-mono">
                                            <span className="material-symbols-outlined text-[16px] animate-spin">progress_activity</span>
                                            {t('tracerouteRunningHint')}
                                        </div>
                                    ) : tracertResult?.error ? (
                                        <pre className="text-red-400 text-sm font-mono whitespace-pre-wrap break-all">{tracertResult.error}</pre>
                                    ) : (
                                        <pre className="text-green-400 text-sm font-mono whitespace-pre-wrap break-all">{tracertResult?.output}</pre>
                                    )}
                                </div>
                            </div>
                        )}
                    </div>
                )}
            </div>
        </div>
    );
}
