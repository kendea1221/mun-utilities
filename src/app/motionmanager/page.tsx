'use client';

import { useState } from 'react';
import Link from 'next/link';
import { Conference } from '@/types';
import { useLocalStorage } from '@/hooks/useLocalStorage';

export default function MotionManagerHome() {
  const [conferences, setConferences, isInitialized] = useLocalStorage<Conference[]>(
    'mun-conferences',
    []
  );
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    committee: '',
    topic: '',
    totalCountries: '',
  });

  const handleCreateConference = (e?: React.FormEvent) => {
    if (e) e.preventDefault();

    if (!formData.name.trim() || !formData.committee.trim() || !formData.topic.trim()) {
      return;
    }

    const newConference: Conference = {
      id: Date.now().toString(),
      name: formData.name,
      committee: formData.committee,
      topic: formData.topic,
      totalCountries: formData.totalCountries ? parseInt(formData.totalCountries) : undefined,
      countries: [],
      createdAt: Date.now(),
      motions: [],
    };

    setConferences([...conferences, newConference]);
    setFormData({ name: '', committee: '', topic: '', totalCountries: '' });
    setShowCreateForm(false);
  };

  const handleDeleteConference = (id: string) => {
    if (confirm('この会議を削除してもよろしいですか？全ての動議も削除されます。')) {
      setConferences(conferences.filter((c) => c.id !== id));
    }
  };

  if (!isInitialized) {
    return null; // Prevent hydration issues
  }

  return (
    <div className="min-h-screen bg-white">
      {/* Header */}
      <header className="border-b border-slate-100">
        <div className="mx-auto max-w-6xl px-8 py-6">
          <div className="flex items-center gap-2 text-xs text-slate-400">
            <Link href="/" className="hover:text-slate-600 transition-colors">
              MUN-utilities
            </Link>
            <span>/</span>
            <span className="text-slate-600">Motion Manager</span>
          </div>
          <h1 className="mt-2 text-2xl font-semibold text-slate-900">動議管理</h1>
          <p className="mt-1 text-sm text-slate-500">会議と動議を一元管理</p>
        </div>
      </header>

      {/* Main Content */}
      <main className="mx-auto max-w-6xl px-8 py-8">
        {/* Create Button */}
        <div className="mb-6">
          <button
            onClick={() => setShowCreateForm(!showCreateForm)}
            className="inline-flex items-center gap-2 rounded-md bg-slate-900 px-4 py-2 text-sm font-medium text-white transition-all hover:bg-slate-800"
          >
            {showCreateForm ? '✕ キャンセル' : '+ 新しい会議'}
          </button>
        </div>

        {/* Create Form */}
        {showCreateForm && (
          <div className="mb-8 rounded-lg border border-slate-200 bg-slate-50/50 p-6">
            <h2 className="mb-5 text-base font-semibold text-slate-900">新しい会議を作成</h2>
            <form onSubmit={handleCreateConference} className="space-y-4">
              <div>
                <label className="mb-1.5 block text-xs font-medium text-slate-600">会議名</label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  placeholder="例: 安全保障理事会 第1回会議"
                  className="w-full rounded-md border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 placeholder-slate-400 transition-colors focus:border-slate-400 focus:outline-none"
                />
              </div>
              <div>
                <label className="mb-1.5 block text-xs font-medium text-slate-600">委員会</label>
                <input
                  type="text"
                  value={formData.committee}
                  onChange={(e) => setFormData({ ...formData, committee: e.target.value })}
                  placeholder="例: 安全保障理事会"
                  className="w-full rounded-md border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 placeholder-slate-400 transition-colors focus:border-slate-400 focus:outline-none"
                />
              </div>
              <div>
                <label className="mb-1.5 block text-xs font-medium text-slate-600">議題</label>
                <input
                  type="text"
                  value={formData.topic}
                  onChange={(e) => setFormData({ ...formData, topic: e.target.value })}
                  placeholder="例: 中東情勢について"
                  className="w-full rounded-md border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 placeholder-slate-400 transition-colors focus:border-slate-400 focus:outline-none"
                />
              </div>
              <div>
                <label className="mb-1.5 block text-xs font-medium text-slate-600">
                  参加国数（任意）
                </label>
                <input
                  type="number"
                  value={formData.totalCountries}
                  onChange={(e) => setFormData({ ...formData, totalCountries: e.target.value })}
                  placeholder="例: 15"
                  className="w-full rounded-md border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 placeholder-slate-400 transition-colors focus:border-slate-400 focus:outline-none"
                />
              </div>
              <button
                type="submit"
                className="mt-2 inline-flex items-center gap-2 rounded-md bg-slate-900 px-4 py-2 text-sm font-medium text-white transition-all hover:bg-slate-800"
              >
                作成
              </button>
            </form>
          </div>
        )}

        {/* Conference List */}
        {conferences.length === 0 ? (
          <div className="rounded-lg border border-slate-100 bg-slate-50/30 px-12 py-20 text-center">
            <p className="text-sm text-slate-500">
              会議がまだありません。新しい会議を作成してください。
            </p>
          </div>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {conferences.map((conference) => (
              <div
                key={conference.id}
                className="group relative rounded-md border border-slate-200 bg-white p-5 transition-all hover:bg-slate-50"
              >
                <Link href={`/motionmanager/conference/${conference.id}`}>
                  <div>
                    <h3 className="text-base font-semibold text-slate-900">{conference.name}</h3>
                    <p className="mt-2 text-sm text-slate-600">{conference.committee}</p>
                    <p className="mt-1 text-xs text-slate-500">{conference.topic}</p>
                    <div className="mt-4 flex items-center gap-3 text-xs text-slate-400">
                      <span>{conference.motions.length}件の動議</span>
                      <span>•</span>
                      <span>{new Date(conference.createdAt).toLocaleDateString('ja-JP')}</span>
                    </div>
                  </div>
                </Link>
                <button
                  onClick={() => handleDeleteConference(conference.id)}
                  className="absolute right-3 top-3 rounded px-2 py-1 text-xs text-slate-400 opacity-0 transition-all hover:bg-red-50 hover:text-red-600 group-hover:opacity-100"
                >
                  削除
                </button>
              </div>
            ))}
          </div>
        )}
      </main>
    </div>
  );
}
