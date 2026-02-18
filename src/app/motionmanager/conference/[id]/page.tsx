'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import {
  Conference,
  Motion,
  MotionType,
  MotionStatus,
  Country,
  RollCallStatus,
  MOTION_TYPE_LABELS,
  STATUS_LABELS,
  ROLL_CALL_LABELS,
  TimerState,
} from '@/types';
import { useLocalStorage } from '@/hooks/useLocalStorage';

export default function ConferencePage() {
  const params = useParams();
  const router = useRouter();
  const conferenceId = params.id as string;

  const [conferences, setConferences, isInitialized] = useLocalStorage<Conference[]>(
    'mun-conferences',
    []
  );
  const [conference, setConference] = useState<Conference | null>(null);

  const [motionType, setMotionType] = useState<MotionType>('moderated_caucus');
  const [proposedBy, setProposedBy] = useState('');
  const [description, setDescription] = useState('');
  const [duration, setDuration] = useState('');
  const [speakingTime, setSpeakingTime] = useState('');

  // Timer modal state
  const [showTimerModal, setShowTimerModal] = useState(false);
  const [timerMotion, setTimerMotion] = useState<Motion | null>(null);

  // Roll Call state
  const [showRollCall, setShowRollCall] = useState(false);
  const [countryName, setCountryName] = useState('');

  // Load conference data
  useEffect(() => {
    if (isInitialized) {
      const found = conferences.find((c) => c.id === conferenceId);
      if (!found) {
        router.push('/motionmanager');
        return;
      }
      // Ensure countries array exists (for backward compatibility)
      if (!found.countries) {
        const updatedConference = { ...found, countries: [] };
        const updatedConferences = conferences.map((c) =>
          c.id === conferenceId ? updatedConference : c
        );
        setConferences(updatedConferences);
        // eslint-disable-next-line react-hooks/set-state-in-effect
        setConference(updatedConference);
      } else {
        // eslint-disable-next-line react-hooks/set-state-in-effect
        setConference(found);
      }
    }
  }, [conferences, conferenceId, isInitialized, router, setConferences]);

  // Real-time sync with localStorage changes (for projector screen)
  useEffect(() => {
    const handleStorageChange = (e: StorageEvent) => {
      if (e.key === 'mun-conferences' && e.newValue) {
        const updatedConferences = JSON.parse(e.newValue);
        const found = updatedConferences.find((c: Conference) => c.id === conferenceId);
        if (found) {
          setConference(found);
        }
      }
    };

    window.addEventListener('storage', handleStorageChange);
    return () => window.removeEventListener('storage', handleStorageChange);
  }, [conferenceId]);

  const handleAddMotion = () => {
    if (!conference || !proposedBy.trim()) {
      return;
    }

    const newMotion: Motion = {
      id: Date.now().toString(),
      type: motionType,
      proposedBy: proposedBy.trim(),
      description: description.trim(),
      duration: duration ? parseInt(duration) : undefined,
      speakingTime: speakingTime ? parseInt(speakingTime) : undefined,
      status: 'pending',
      createdAt: Date.now(),
    };

    const updatedConference = {
      ...conference,
      motions: [...conference.motions, newMotion],
    };

    const updatedConferences = conferences.map((c) =>
      c.id === conferenceId ? updatedConference : c
    );

    setConferences(updatedConferences);

    // Reset form
    setProposedBy('');
    setDescription('');
    setDuration('');
    setSpeakingTime('');
  };

  const handleUpdateMotionStatus = (motionId: string, status: MotionStatus) => {
    if (!conference) return;

    const motion = conference.motions.find((m) => m.id === motionId);
    const previousStatus = motion?.status;

    const updatedMotion = { ...motion!, status };

    const updatedConference = {
      ...conference,
      motions: conference.motions.map((m) => (m.id === motionId ? updatedMotion : m)),
    };

    const updatedConferences = conferences.map((c) =>
      c.id === conferenceId ? updatedConference : c
    );

    setConferences(updatedConferences);

    // Show timer modal when status changes from pending to passed
    if (previousStatus !== 'passed' && status === 'passed' && updatedMotion.duration) {
      setTimerMotion(updatedMotion);
      setShowTimerModal(true);
    }
  };

  const handleUpdateVotes = (
    motionId: string,
    votesFor: number,
    votesAgainst: number,
    abstentions: number
  ) => {
    if (!conference) return;

    const motion = conference.motions.find((m) => m.id === motionId);
    const previousStatus = motion?.status;

    // Auto-determine status based on votes
    let newStatus: MotionStatus = 'pending';
    if (conference.totalCountries && votesFor + votesAgainst + abstentions > 0) {
      const totalVotes = votesFor + votesAgainst;
      const requiredVotes = Math.floor(totalVotes / 2) + 1;

      if (votesFor >= requiredVotes) {
        newStatus = 'passed';
      } else if (votesAgainst >= requiredVotes) {
        newStatus = 'failed';
      }
    }

    const updatedMotion = { ...motion!, votesFor, votesAgainst, abstentions, status: newStatus };

    const updatedConference = {
      ...conference,
      motions: conference.motions.map((m) => (m.id === motionId ? updatedMotion : m)),
    };

    const updatedConferences = conferences.map((c) =>
      c.id === conferenceId ? updatedConference : c
    );

    setConferences(updatedConferences);

    // Show timer modal when status changes from pending to passed
    if (previousStatus !== 'passed' && newStatus === 'passed' && updatedMotion.duration) {
      setTimerMotion(updatedMotion);
      setShowTimerModal(true);
    }
  };

  const handleDeleteMotion = (motionId: string) => {
    if (!conference) return;

    if (confirm('この動議を削除してもよろしいですか？')) {
      const updatedConference = {
        ...conference,
        motions: conference.motions.filter((m) => m.id !== motionId),
      };

      const updatedConferences = conferences.map((c) =>
        c.id === conferenceId ? updatedConference : c
      );

      setConferences(updatedConferences);
    }
  };

  // Roll Call functions
  const handleAddCountry = () => {
    if (!conference || !countryName.trim()) return;

    const newCountry: Country = {
      id: Date.now().toString(),
      name: countryName.trim(),
      rollCallStatus: undefined,
    };

    const updatedConference = {
      ...conference,
      countries: [...conference.countries, newCountry],
    };

    const updatedConferences = conferences.map((c) =>
      c.id === conferenceId ? updatedConference : c
    );

    setConferences(updatedConferences);
    setCountryName('');
  };

  const handleUpdateRollCall = (countryId: string, status: RollCallStatus) => {
    if (!conference) return;

    const updatedConference = {
      ...conference,
      countries: conference.countries.map((c) =>
        c.id === countryId ? { ...c, rollCallStatus: status } : c
      ),
    };

    const updatedConferences = conferences.map((c) =>
      c.id === conferenceId ? updatedConference : c
    );

    setConferences(updatedConferences);
  };

  const handleDeleteCountry = (countryId: string) => {
    if (!conference) return;

    const updatedConference = {
      ...conference,
      countries: conference.countries.filter((c) => c.id !== countryId),
    };

    const updatedConferences = conferences.map((c) =>
      c.id === conferenceId ? updatedConference : c
    );

    setConferences(updatedConferences);
  };

  // Timer functions
  const startTimer = () => {
    if (!timerMotion) return;

    const totalSeconds = (timerMotion.duration || 0) * 60;
    const timerState: TimerState = {
      isRunning: true,
      conferenceId,
      motionId: timerMotion.id,
      totalSeconds,
      remainingSeconds: totalSeconds,
      isPaused: false,
      startedAt: Date.now(),
    };

    localStorage.setItem('mun-timer', JSON.stringify(timerState));
    setShowTimerModal(false);
  };

  if (!isInitialized || !conference) {
    return null;
  }

  const passedMotions = conference.motions.filter((m) => m.status === 'passed');
  const pendingMotions = conference.motions.filter((m) => m.status === 'pending');
  const failedMotions = conference.motions.filter((m) => m.status === 'failed');

  return (
    <div className="min-h-screen bg-white">
      {/* Header */}
      <header className="border-b border-slate-100">
        <div className="mx-auto max-w-[1800px] px-8 py-5">
          <div className="flex items-center justify-between">
            <div>
              <div className="flex items-center gap-2 text-xs text-slate-400">
                <Link href="/" className="hover:text-slate-600 transition-colors">
                  MUN-utilities
                </Link>
                <span>/</span>
                <Link href="/motionmanager" className="hover:text-slate-600 transition-colors">
                  Motion Manager
                </Link>
                <span>/</span>
                <span className="text-slate-600">{conference.name}</span>
              </div>
              <h1 className="mt-2 text-xl font-semibold text-slate-900">{conference.name}</h1>
              <p className="mt-1 text-sm text-slate-500">
                {conference.committee} • {conference.topic}
                {conference.totalCountries && (
                  <span className="ml-2 rounded bg-slate-100 px-2 py-0.5 text-xs font-medium text-slate-700">
                    参加国数: {conference.totalCountries}
                  </span>
                )}
              </p>
            </div>
            <div>
              <a
                href={`/motionmanager/conference/${conferenceId}/projector`}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 rounded-md border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-700 transition-all hover:bg-slate-50"
              >
                <span>📺</span>
                <span>プロジェクター画面を開く</span>
              </a>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content - 2 Column Layout */}
      <main className="mx-auto max-w-[1800px] px-8 py-6">
        <div className="grid gap-6 lg:grid-cols-2">
          {/* Left Column - Motion Entry Form */}
          <div className="space-y-4">
            <div className="rounded-md border border-slate-200 bg-white p-5">
              <h2 className="mb-5 text-base font-semibold text-slate-900">動議を提出</h2>

              <div className="space-y-4">
                <div>
                  <label className="mb-1.5 block text-xs font-medium text-slate-600">
                    動議の種類
                  </label>
                  <select
                    value={motionType}
                    onChange={(e) => setMotionType(e.target.value as MotionType)}
                    className="w-full rounded-md border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 transition-colors focus:border-slate-400 focus:outline-none"
                  >
                    <option value="moderated_caucus">
                      {MOTION_TYPE_LABELS.moderated_caucus.ja}
                    </option>
                    <option value="unmoderated_caucus">
                      {MOTION_TYPE_LABELS.unmoderated_caucus.ja}
                    </option>
                    <option value="extend_debate">{MOTION_TYPE_LABELS.extend_debate.ja}</option>
                    <option value="close_debate">{MOTION_TYPE_LABELS.close_debate.ja}</option>
                    <option value="table_topic">{MOTION_TYPE_LABELS.table_topic.ja}</option>
                    <option value="adjourn_meeting">{MOTION_TYPE_LABELS.adjourn_meeting.ja}</option>
                    <option value="other">{MOTION_TYPE_LABELS.other.ja}</option>
                  </select>
                </div>

                <div>
                  <label className="mb-1.5 block text-xs font-medium text-slate-600">
                    提案国 <span className="text-red-600">*</span>
                  </label>
                  <input
                    type="text"
                    value={proposedBy}
                    onChange={(e) => setProposedBy(e.target.value)}
                    placeholder="国名を入力"
                    className="w-full rounded-md border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 placeholder-slate-400 transition-colors focus:border-slate-400 focus:outline-none"
                  />
                </div>

                <div>
                  <label className="mb-1.5 block text-xs font-medium text-slate-600">詳細</label>
                  <textarea
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    placeholder="追加情報..."
                    rows={3}
                    className="w-full rounded-md border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 placeholder-slate-400 transition-colors focus:border-slate-400 focus:outline-none"
                  />
                </div>

                <div className="grid gap-4 sm:grid-cols-2">
                  <div>
                    <label className="mb-1.5 block text-xs font-medium text-slate-600">
                      所要時間（分）
                    </label>
                    <input
                      type="number"
                      value={duration}
                      onChange={(e) => setDuration(e.target.value)}
                      placeholder="15"
                      className="w-full rounded-md border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 placeholder-slate-400 transition-colors focus:border-slate-400 focus:outline-none"
                    />
                  </div>

                  <div>
                    <label className="mb-1.5 block text-xs font-medium text-slate-600">
                      発言時間（秒）
                    </label>
                    <input
                      type="number"
                      value={speakingTime}
                      onChange={(e) => setSpeakingTime(e.target.value)}
                      placeholder="60"
                      className="w-full rounded-md border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 placeholder-slate-400 transition-colors focus:border-slate-400 focus:outline-none"
                    />
                  </div>
                </div>

                <button
                  onClick={handleAddMotion}
                  disabled={!proposedBy.trim()}
                  className="w-full rounded-md bg-slate-900 px-4 py-2 text-sm font-medium text-white transition-all hover:bg-slate-800 disabled:bg-slate-200 disabled:text-slate-400"
                >
                  動議を追加
                </button>
              </div>
            </div>

            {/* Motion Management List */}
            <div className="rounded-md border border-slate-200 bg-white p-5">
              <h3 className="mb-4 text-base font-semibold text-slate-900">全ての動議</h3>
              <div className="space-y-2">
                {conference.motions.length === 0 ? (
                  <p className="py-8 text-center text-sm text-slate-500">まだ動議がありません</p>
                ) : (
                  conference.motions.map((motion) => (
                    <div
                      key={motion.id}
                      className="rounded-md border border-slate-200 bg-slate-50/50 p-3"
                    >
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <div className="flex items-center gap-2">
                            <span className="text-sm font-medium text-slate-700">
                              {MOTION_TYPE_LABELS[motion.type].ja}
                            </span>
                            <span
                              className={`rounded px-2 py-0.5 text-xs font-medium ${
                                motion.status === 'passed'
                                  ? 'bg-green-50 text-green-700'
                                  : motion.status === 'failed'
                                    ? 'bg-red-50 text-red-700'
                                    : 'bg-yellow-50 text-yellow-700'
                              }`}
                            >
                              {STATUS_LABELS[motion.status].ja}
                            </span>
                          </div>
                          <p className="mt-1 text-xs text-slate-600">{motion.proposedBy}</p>
                          {motion.description && (
                            <p className="mt-2 text-xs text-slate-500">{motion.description}</p>
                          )}
                          {(motion.duration || motion.speakingTime) && (
                            <div className="mt-2 flex gap-3 text-xs text-slate-500">
                              {motion.duration && <span>{motion.duration}分</span>}
                              {motion.speakingTime && <span>{motion.speakingTime}秒</span>}
                            </div>
                          )}

                          {/* Voting Section */}
                          {conference.totalCountries && (
                            <div className="mt-3 rounded border border-slate-200 bg-white p-2">
                              <div className="mb-2 text-xs font-medium text-slate-600">
                                投票結果
                              </div>
                              <div className="grid grid-cols-3 gap-2">
                                <div>
                                  <label className="mb-1 block text-xs text-slate-500">賛成</label>
                                  <input
                                    type="number"
                                    min="0"
                                    max={conference.totalCountries}
                                    value={motion.votesFor || ''}
                                    onChange={(e) => {
                                      const value = parseInt(e.target.value) || 0;
                                      handleUpdateVotes(
                                        motion.id,
                                        value,
                                        motion.votesAgainst || 0,
                                        motion.abstentions || 0
                                      );
                                    }}
                                    className="w-full rounded border border-slate-200 px-2 py-1 text-xs"
                                    placeholder="0"
                                  />
                                </div>
                                <div>
                                  <label className="mb-1 block text-xs text-slate-500">反対</label>
                                  <input
                                    type="number"
                                    min="0"
                                    max={conference.totalCountries}
                                    value={motion.votesAgainst || ''}
                                    onChange={(e) => {
                                      const value = parseInt(e.target.value) || 0;
                                      handleUpdateVotes(
                                        motion.id,
                                        motion.votesFor || 0,
                                        value,
                                        motion.abstentions || 0
                                      );
                                    }}
                                    className="w-full rounded border border-slate-200 px-2 py-1 text-xs"
                                    placeholder="0"
                                  />
                                </div>
                                <div>
                                  <label className="mb-1 block text-xs text-slate-500">棄権</label>
                                  <input
                                    type="number"
                                    min="0"
                                    max={conference.totalCountries}
                                    value={motion.abstentions || ''}
                                    onChange={(e) => {
                                      const value = parseInt(e.target.value) || 0;
                                      handleUpdateVotes(
                                        motion.id,
                                        motion.votesFor || 0,
                                        motion.votesAgainst || 0,
                                        value
                                      );
                                    }}
                                    className="w-full rounded border border-slate-200 px-2 py-1 text-xs"
                                    placeholder="0"
                                  />
                                </div>
                              </div>
                              {(motion.votesFor !== undefined ||
                                motion.votesAgainst !== undefined) && (
                                <div className="mt-2 text-xs text-slate-600">
                                  合計:{' '}
                                  {(motion.votesFor || 0) +
                                    (motion.votesAgainst || 0) +
                                    (motion.abstentions || 0)}{' '}
                                  / {conference.totalCountries}
                                </div>
                              )}
                            </div>
                          )}
                        </div>
                        <button
                          onClick={() => handleDeleteMotion(motion.id)}
                          className="ml-3 rounded px-2 py-1 text-xs text-slate-400 transition-all hover:bg-red-50 hover:text-red-600"
                        >
                          削除
                        </button>
                      </div>

                      {/* Manual Status Buttons - only show if no voting enabled */}
                      {!conference.totalCountries && (
                        <div className="mt-2 flex gap-2">
                          <button
                            onClick={() => handleUpdateMotionStatus(motion.id, 'passed')}
                            className="rounded bg-green-600 px-2 py-1 text-xs font-medium text-white transition-colors hover:bg-green-700"
                          >
                            可決
                          </button>
                          <button
                            onClick={() => handleUpdateMotionStatus(motion.id, 'pending')}
                            className="rounded bg-yellow-600 px-2 py-1 text-xs font-medium text-white transition-colors hover:bg-yellow-700"
                          >
                            保留
                          </button>
                          <button
                            onClick={() => handleUpdateMotionStatus(motion.id, 'failed')}
                            className="rounded bg-red-600 px-2 py-1 text-xs font-medium text-white transition-colors hover:bg-red-700"
                          >
                            否決
                          </button>
                        </div>
                      )}
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>

          {/* Right Column - Roll Call & Projector */}
          <div className="space-y-4">
            {/* Roll Call Section */}
            <div className="rounded-md border border-slate-200 bg-white p-5">
              <div className="mb-4 flex items-center justify-between">
                <h3 className="text-base font-semibold text-slate-900">Roll Call</h3>
                <button
                  onClick={() => setShowRollCall(!showRollCall)}
                  className="text-xs text-slate-500 hover:text-slate-700"
                >
                  {showRollCall ? '閉じる' : '管理'}
                </button>
              </div>

              {showRollCall && (
                <div className="mb-4 space-y-3">
                  <div>
                    <label className="mb-1.5 block text-xs font-medium text-slate-600">
                      参加国を追加
                    </label>
                    <div className="flex gap-2">
                      <input
                        type="text"
                        value={countryName}
                        onChange={(e) => setCountryName(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') {
                            e.preventDefault();
                            handleAddCountry();
                          }
                        }}
                        placeholder="例: アメリカ合衆国"
                        className="flex-1 rounded-md border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 placeholder-slate-400 transition-colors focus:border-slate-400 focus:outline-none"
                      />
                      <button
                        onClick={handleAddCountry}
                        disabled={!countryName.trim()}
                        className="rounded-md bg-slate-900 px-4 py-2 text-sm font-medium text-white transition-all hover:bg-slate-800 disabled:bg-slate-200 disabled:text-slate-400"
                      >
                        追加
                      </button>
                    </div>
                  </div>
                </div>
              )}

              {/* Country List */}
              <div className="space-y-2">
                {conference.countries.length === 0 ? (
                  <p className="py-4 text-center text-sm text-slate-500">
                    参加国を追加してください
                  </p>
                ) : (
                  conference.countries.map((country) => (
                    <div
                      key={country.id}
                      className="flex items-center justify-between rounded border border-slate-200 bg-slate-50/50 p-2"
                    >
                      <span className="text-sm font-medium text-slate-700">{country.name}</span>
                      <div className="flex items-center gap-2">
                        {showRollCall && (
                          <>
                            <button
                              onClick={() => handleUpdateRollCall(country.id, 'present')}
                              className={`rounded px-2 py-1 text-xs font-medium transition-colors ${
                                country.rollCallStatus === 'present'
                                  ? 'bg-blue-600 text-white'
                                  : 'bg-white text-slate-600 hover:bg-blue-50'
                              }`}
                            >
                              P
                            </button>
                            <button
                              onClick={() => handleUpdateRollCall(country.id, 'present_and_voting')}
                              className={`rounded px-2 py-1 text-xs font-medium transition-colors ${
                                country.rollCallStatus === 'present_and_voting'
                                  ? 'bg-green-600 text-white'
                                  : 'bg-white text-slate-600 hover:bg-green-50'
                              }`}
                            >
                              P&V
                            </button>
                            <button
                              onClick={() => handleUpdateRollCall(country.id, 'absent')}
                              className={`rounded px-2 py-1 text-xs font-medium transition-colors ${
                                country.rollCallStatus === 'absent'
                                  ? 'bg-slate-600 text-white'
                                  : 'bg-white text-slate-600 hover:bg-slate-50'
                              }`}
                            >
                              A
                            </button>
                            <button
                              onClick={() => handleDeleteCountry(country.id)}
                              className="ml-2 rounded px-2 py-1 text-xs text-red-600 hover:bg-red-50"
                            >
                              ×
                            </button>
                          </>
                        )}
                        {!showRollCall && country.rollCallStatus && (
                          <span
                            className={`rounded px-2 py-1 text-xs font-medium ${
                              country.rollCallStatus === 'present'
                                ? 'bg-blue-100 text-blue-700'
                                : country.rollCallStatus === 'present_and_voting'
                                  ? 'bg-green-100 text-green-700'
                                  : 'bg-slate-100 text-slate-600'
                            }`}
                          >
                            {ROLL_CALL_LABELS[country.rollCallStatus].short}
                          </span>
                        )}
                      </div>
                    </div>
                  ))
                )}
              </div>

              {/* Summary */}
              {conference.countries.length > 0 && (
                <div className="mt-4 border-t border-slate-200 pt-3 text-xs text-slate-500">
                  <div className="flex justify-between">
                    <span>総数: {conference.countries.length}</span>
                    <span>
                      出席:{' '}
                      {
                        conference.countries.filter(
                          (c) =>
                            c.rollCallStatus === 'present' ||
                            c.rollCallStatus === 'present_and_voting'
                        ).length
                      }
                    </span>
                  </div>
                </div>
              )}
            </div>

            <div className="sticky top-6">
              <div className="rounded-md border border-slate-200 bg-white p-8">
                <div className="mb-6 border-b border-slate-200 pb-4">
                  <h2 className="text-xl font-bold text-slate-900">MOTION BOARD</h2>
                </div>

                {/* Motion List - Simple Format */}
                <div className="space-y-8">
                  {/* Passed Motions */}
                  {passedMotions.length > 0 && (
                    <div>
                      <div className="mb-3 text-xs font-semibold uppercase tracking-wider text-green-700">
                        PASSED
                      </div>
                      <div className="space-y-2">
                        {passedMotions.map((motion, index) => (
                          <div
                            key={motion.id}
                            className="flex items-baseline gap-3 border-b border-green-200 bg-green-50 px-4 py-3"
                          >
                            <div className="text-base font-mono font-bold text-slate-400">
                              {index + 1}.
                            </div>
                            <div className="flex-1">
                              <div className="flex items-baseline gap-2 text-lg">
                                <span className="font-semibold uppercase text-slate-900">
                                  {motion.proposedBy}
                                </span>
                                <span className="text-slate-400">·</span>
                                <span className="font-bold text-green-700">
                                  {MOTION_TYPE_LABELS[motion.type].short}
                                </span>
                                {motion.duration && (
                                  <span className="font-semibold text-slate-700">
                                    {motion.duration}m
                                  </span>
                                )}
                                {motion.speakingTime && (
                                  <span className="text-sm text-slate-600">
                                    ({motion.speakingTime}s)
                                  </span>
                                )}
                              </div>
                              {motion.description && (
                                <div className="mt-1 text-sm text-slate-600">
                                  {motion.description}
                                </div>
                              )}
                            </div>
                            <div className="rounded bg-green-600 px-2 py-1 text-xs font-bold text-white">
                              PASSED
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Pending Motions */}
                  {pendingMotions.length > 0 && (
                    <div>
                      <div className="mb-3 text-xs font-semibold uppercase tracking-wider text-slate-600">
                        PENDING
                      </div>
                      <div className="space-y-2">
                        {pendingMotions.map((motion, index) => (
                          <div
                            key={motion.id}
                            className="flex items-baseline gap-3 border-b border-slate-200 px-4 py-3"
                          >
                            <div className="text-base font-mono font-bold text-slate-400">
                              {passedMotions.length + index + 1}.
                            </div>
                            <div className="flex-1">
                              <div className="flex items-baseline gap-2 text-lg">
                                <span className="font-semibold uppercase text-slate-900">
                                  {motion.proposedBy}
                                </span>
                                <span className="text-slate-400">·</span>
                                <span className="font-bold text-slate-900">
                                  {MOTION_TYPE_LABELS[motion.type].short}
                                </span>
                                {motion.duration && (
                                  <span className="font-semibold text-slate-700">
                                    {motion.duration}m
                                  </span>
                                )}
                                {motion.speakingTime && (
                                  <span className="text-sm text-slate-600">
                                    ({motion.speakingTime}s)
                                  </span>
                                )}
                              </div>
                              {motion.description && (
                                <div className="mt-1 text-sm text-slate-600">
                                  {motion.description}
                                </div>
                              )}
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Failed Motions */}
                  {failedMotions.length > 0 && (
                    <div>
                      <div className="mb-3 text-xs font-semibold uppercase tracking-wider text-red-600">
                        FAILED
                      </div>
                      <div className="space-y-1">
                        {failedMotions.map((motion, index) => (
                          <div
                            key={motion.id}
                            className="flex items-baseline gap-3 px-4 py-2 opacity-50"
                          >
                            <div className="text-sm font-mono text-slate-400">
                              {passedMotions.length + pendingMotions.length + index + 1}.
                            </div>
                            <div className="flex-1">
                              <div className="flex items-baseline gap-2 text-sm line-through">
                                <span className="font-semibold uppercase text-slate-600">
                                  {motion.proposedBy}
                                </span>
                                <span className="text-slate-400">·</span>
                                <span className="font-bold text-slate-600">
                                  {MOTION_TYPE_LABELS[motion.type].short}
                                </span>
                                {motion.duration && (
                                  <span className="text-slate-500">{motion.duration}m</span>
                                )}
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {conference.motions.length === 0 && (
                    <div className="py-16 text-center">
                      <p className="text-lg text-slate-400">No motions submitted</p>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      </main>

      {/* Timer Start Modal */}
      {showTimerModal && timerMotion && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50">
          <div className="w-full max-w-md rounded-lg bg-white p-6 shadow-xl">
            <h2 className="mb-4 text-xl font-bold text-slate-900">タイマーを開始しますか？</h2>
            <div className="mb-6 rounded-md bg-slate-50 p-4">
              <div className="mb-2 text-sm text-slate-600">動議が承認されました</div>
              <div className="font-semibold text-slate-900">
                {timerMotion.proposedBy} · {MOTION_TYPE_LABELS[timerMotion.type].ja}
              </div>
              <div className="mt-3 flex items-baseline gap-2 text-2xl font-bold text-blue-600">
                <span>{timerMotion.duration}分</span>
                {timerMotion.speakingTime && (
                  <span className="text-sm font-normal text-slate-500">
                    (1国あたり {timerMotion.speakingTime}秒)
                  </span>
                )}
              </div>
            </div>
            <div className="flex gap-3">
              <button
                onClick={() => {
                  setShowTimerModal(false);
                  setTimerMotion(null);
                }}
                className="flex-1 rounded-md border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-700 transition-colors hover:bg-slate-50"
              >
                キャンセル
              </button>
              <button
                onClick={startTimer}
                className="flex-1 rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-blue-700"
              >
                タイマー開始
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
