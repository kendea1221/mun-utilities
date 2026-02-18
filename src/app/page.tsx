import Link from 'next/link';

export default function Home() {
  return (
    <div className="min-h-screen bg-white">
      {/* Header */}
      <header className="border-b border-slate-100">
        <div className="mx-auto max-w-6xl px-8 py-6">
          <h1 className="text-2xl font-semibold text-slate-900">MUN-utilities</h1>
          <p className="mt-1 text-sm text-slate-500">模擬国連のための便利ツール集</p>
        </div>
      </header>

      {/* Main Content */}
      <main className="mx-auto max-w-6xl px-8 py-12">
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {/* Motion Manager Card */}
          <Link href="/motionmanager">
            <div className="group rounded-md border border-slate-200 bg-white p-6 transition-all hover:bg-slate-50">
              <div className="mb-3 text-2xl">📋</div>
              <h2 className="text-lg font-semibold text-slate-900">Motion Manager</h2>
              <p className="mt-2 text-sm text-slate-600">
                会議と動議を一元管理。投影用画面でリアルタイム表示。
              </p>
              <div className="mt-4 text-xs text-slate-400">動議管理システム</div>
            </div>
          </Link>

          {/* Placeholder for future tools */}
          <div className="rounded-md border border-dashed border-slate-200 bg-slate-50/30 p-6">
            <div className="mb-3 text-2xl opacity-30">⏱️</div>
            <h2 className="text-lg font-semibold text-slate-400">Timer</h2>
            <p className="mt-2 text-sm text-slate-400">Coming soon...</p>
          </div>

          <div className="rounded-md border border-dashed border-slate-200 bg-slate-50/30 p-6">
            <div className="mb-3 text-2xl opacity-30">🗳️</div>
            <h2 className="text-lg font-semibold text-slate-400">Voting System</h2>
            <p className="mt-2 text-sm text-slate-400">Coming soon...</p>
          </div>
        </div>
      </main>
    </div>
  );
}
