'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { Conference, MOTION_TYPE_LABELS, Motion, TimerState, ROLL_CALL_LABELS } from '@/types';
import { useLocalStorage } from '@/hooks/useLocalStorage';

export default function ProjectorPage() {
  const params = useParams();
  const router = useRouter();
  const conferenceId = params.id as string;

  const [conferences, , isInitialized] = useLocalStorage<Conference[]>('mun-conferences', []);
  const [conference, setConference] = useState<Conference | null>(null);

  // Timer states
  const [timerState, setTimerState] = useState<TimerState | null>(null);
  const [currentMotion, setCurrentMotion] = useState<Motion | null>(null);
  const [remainingSeconds, setRemainingSeconds] = useState(0);

  // Roll Call modal state
  const [showRollCallModal, setShowRollCallModal] = useState(false);

  // Load conference data
  useEffect(() => {
    if (isInitialized) {
      const found = conferences.find((c) => c.id === conferenceId);
      if (!found) {
        router.push('/motionmanager');
        return;
      }
      // Ensure countries array exists (for backward compatibility)
      const conferenceWithCountries = found.countries ? found : { ...found, countries: [] };
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setConference(conferenceWithCountries);
    }
  }, [conferences, conferenceId, isInitialized, router]);

  // Real-time sync with localStorage changes from other tabs
  useEffect(() => {
    const handleStorageChange = (e: StorageEvent) => {
      if (e.key === 'mun-conferences' && e.newValue) {
        const updatedConferences = JSON.parse(e.newValue);
        const found = updatedConferences.find((c: Conference) => c.id === conferenceId);
        if (found) {
          // Ensure countries array exists
          const conferenceWithCountries = found.countries ? found : { ...found, countries: [] };
          setConference(conferenceWithCountries);
        }
      }

      // Timer state changes
      if (e.key === 'mun-timer' && e.newValue) {
        const timer: TimerState = JSON.parse(e.newValue);
        if (timer.conferenceId === conferenceId) {
          setTimerState(timer);
          setRemainingSeconds(timer.remainingSeconds);
        }
      } else if (e.key === 'mun-timer' && !e.newValue) {
        // Timer stopped
        setTimerState(null);
        setCurrentMotion(null);
        setRemainingSeconds(0);
      }
    };

    window.addEventListener('storage', handleStorageChange);
    return () => window.removeEventListener('storage', handleStorageChange);
  }, [conferenceId]);

  // Load timer state on mount
  useEffect(() => {
    const timerData = localStorage.getItem('mun-timer');
    if (timerData) {
      const timer: TimerState = JSON.parse(timerData);
      if (timer.conferenceId === conferenceId && timer.isRunning) {
        // eslint-disable-next-line react-hooks/set-state-in-effect
        setTimerState(timer);
        // eslint-disable-next-line react-hooks/set-state-in-effect
        setRemainingSeconds(timer.remainingSeconds);
      }
    }
  }, [conferenceId]);

  // Update current motion when timer state or conference changes
  useEffect(() => {
    if (timerState && conference) {
      const motion = conference.motions.find((m) => m.id === timerState.motionId);
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setCurrentMotion(motion || null);
    }
  }, [timerState, conference]);

  // Timer countdown
  useEffect(() => {
    if (!timerState || !timerState.isRunning || timerState.isPaused) return;

    const interval = setInterval(() => {
      setRemainingSeconds((prev) => {
        const newRemaining = prev - 1;

        // Update localStorage
        const updatedTimer = {
          ...timerState,
          remainingSeconds: newRemaining,
        };
        localStorage.setItem('mun-timer', JSON.stringify(updatedTimer));

        // Play sound at each speaking time interval (for each country)
        if (currentMotion?.speakingTime && newRemaining > 0) {
          const speakingTime = currentMotion.speakingTime;
          const elapsed = timerState.totalSeconds - newRemaining;

          // Check if we just crossed a speaking time boundary
          if (elapsed > 0 && elapsed % speakingTime === 0) {
            // Play interval beep sound - clear, short "tick"
            const audioContext = new (window.AudioContext ||
              (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext)();
            const oscillator = audioContext.createOscillator();
            const gainNode = audioContext.createGain();

            oscillator.connect(gainNode);
            gainNode.connect(audioContext.destination);

            oscillator.frequency.value = 1200; // Higher frequency for clearer "tick"
            oscillator.type = 'square'; // Square wave for more distinct sound

            gainNode.gain.setValueAtTime(0.4, audioContext.currentTime);
            gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.08);

            oscillator.start(audioContext.currentTime);
            oscillator.stop(audioContext.currentTime + 0.08);
          }
        }

        if (newRemaining <= 0) {
          // Timer ended - play distinctive three-tone final sound
          const audioContext = new (window.AudioContext ||
            (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext)();
          
          // Three ascending tones for clear end signal
          const playTone = (frequency: number, startTime: number, duration: number) => {
            const oscillator = audioContext.createOscillator();
            const gainNode = audioContext.createGain();

            oscillator.connect(gainNode);
            gainNode.connect(audioContext.destination);

            oscillator.frequency.value = frequency;
            oscillator.type = 'sine';

            gainNode.gain.setValueAtTime(0.4, startTime);
            gainNode.gain.exponentialRampToValueAtTime(0.01, startTime + duration);

            oscillator.start(startTime);
            oscillator.stop(startTime + duration);
          };

          // Play three ascending tones: lower, middle, higher
          const now = audioContext.currentTime;
          playTone(600, now, 0.15);           // First tone
          playTone(800, now + 0.15, 0.15);    // Second tone
          playTone(1000, now + 0.3, 0.3);     // Final tone (longer)

          // Clear timer
          localStorage.removeItem('mun-timer');
          setTimerState(null);
          setCurrentMotion(null);
          return 0;
        }

        return newRemaining;
      });
    }, 1000);

    return () => clearInterval(interval);
  }, [timerState, currentMotion]);

  // Timer control functions
  const pauseTimer = () => {
    if (!timerState) return;
    const updatedTimer = { ...timerState, isPaused: true };
    localStorage.setItem('mun-timer', JSON.stringify(updatedTimer));
    setTimerState(updatedTimer);
  };

  const resumeTimer = () => {
    if (!timerState) return;
    const updatedTimer = { ...timerState, isPaused: false };
    localStorage.setItem('mun-timer', JSON.stringify(updatedTimer));
    setTimerState(updatedTimer);
  };

  const stopTimer = () => {
    localStorage.removeItem('mun-timer');
    setTimerState(null);
    setCurrentMotion(null);
    setRemainingSeconds(0);
  };

  // Format seconds to MM:SS
  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  if (!isInitialized || !conference) {
    return null;
  }

  const passedMotions = conference.motions.filter((m) => m.status === 'passed');
  const pendingMotions = conference.motions.filter((m) => m.status === 'pending');
  const failedMotions = conference.motions.filter((m) => m.status === 'failed');

  return (
    <div className="min-h-screen bg-white p-12">
      {/* Header */}
      <div className="mb-8 border-b-2 border-slate-300 pb-6">
        <div className="mb-3 flex items-center gap-3 text-sm text-slate-500">
          <span>
            {conference.committee} • {conference.topic}
          </span>
          {conference.totalCountries && (
            <span className="rounded bg-slate-100 px-2 py-1 text-xs font-medium text-slate-700">
              参加国数: {conference.totalCountries}
            </span>
          )}
        </div>
        <h1 className="text-4xl font-bold text-slate-900">{conference.name}</h1>
      </div>

      {/* Motion Board */}
      <div className="mx-auto max-w-5xl">
        {/* Roll Call Section */}
        {conference.countries.length > 0 && (
          <div className="mb-8">
            <button
              onClick={() => setShowRollCallModal(true)}
              className="group flex w-full items-center justify-between border-b border-slate-300 pb-4 transition-colors hover:border-slate-400"
            >
              <h2 className="text-3xl font-bold text-slate-900 group-hover:text-slate-700">
                ROLL CALL
              </h2>
              <span className="text-sm text-slate-500 group-hover:text-slate-700">
                {
                  conference.countries.filter(
                    (c) =>
                      c.rollCallStatus === 'present' || c.rollCallStatus === 'present_and_voting'
                  ).length
                }
                /{conference.countries.length} Present
              </span>
            </button>
          </div>
        )}

        <div className="mb-8 border-b border-slate-300 pb-4">
          <h2 className="text-3xl font-bold text-slate-900">MOTION BOARD</h2>
        </div>

        <div className="space-y-10">
          {/* Passed Motions */}
          {passedMotions.length > 0 && (
            <div>
              <div className="mb-4 text-sm font-bold uppercase tracking-wider text-green-700">
                PASSED
              </div>
              <div className="space-y-3">
                {passedMotions.map((motion, index) => (
                  <div
                    key={motion.id}
                    className="flex items-baseline gap-4 border-b-2 border-green-200 bg-green-50 px-6 py-4"
                  >
                    <div className="text-2xl font-mono font-bold text-slate-400">{index + 1}.</div>
                    <div className="flex-1">
                      <div className="flex items-baseline gap-3 text-2xl">
                        <span className="font-bold uppercase text-slate-900">
                          {motion.proposedBy}
                        </span>
                        <span className="text-slate-400">·</span>
                        <span className="font-bold text-green-700">
                          {MOTION_TYPE_LABELS[motion.type].short}
                        </span>
                        {motion.duration && motion.type !== 'withdraw' && (
                          <span className="font-bold text-slate-700">{motion.duration}m</span>
                        )}
                        {motion.speakingTime && motion.type !== 'withdraw' && (
                          <span className="text-lg text-slate-600">({motion.speakingTime}s)</span>
                        )}
                      </div>
                      {motion.description && (
                        <div className="mt-2 text-base text-slate-600">{motion.description}</div>
                      )}
                      {(motion.votesFor !== undefined ||
                        motion.votesAgainst !== undefined ||
                        motion.abstentions !== undefined) && (
                        <div className="mt-2 flex gap-4 text-sm font-medium text-slate-600">
                          <span>賛成: {motion.votesFor ?? 0}</span>
                          <span>反対: {motion.votesAgainst ?? 0}</span>
                          <span>棄権: {motion.abstentions ?? 0}</span>
                        </div>
                      )}
                    </div>
                    <div className="rounded bg-green-600 px-3 py-1.5 text-sm font-bold text-white">
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
              <div className="mb-4 text-sm font-bold uppercase tracking-wider text-slate-600">
                PENDING
              </div>
              <div className="space-y-3">
                {pendingMotions.map((motion, index) => (
                  <div
                    key={motion.id}
                    className="flex items-baseline gap-4 border-b-2 border-slate-300 px-6 py-4"
                  >
                    <div className="text-2xl font-mono font-bold text-slate-400">
                      {passedMotions.length + index + 1}.
                    </div>
                    <div className="flex-1">
                      <div className="flex items-baseline gap-3 text-2xl">
                        <span className="font-bold uppercase text-slate-900">
                          {motion.proposedBy}
                        </span>
                        <span className="text-slate-400">·</span>
                        <span className="font-bold text-slate-900">
                          {MOTION_TYPE_LABELS[motion.type].short}
                        </span>
                        {motion.duration && motion.type !== 'withdraw' && (
                          <span className="font-bold text-slate-700">{motion.duration}m</span>
                        )}
                        {motion.speakingTime && motion.type !== 'withdraw' && (
                          <span className="text-lg text-slate-600">({motion.speakingTime}s)</span>
                        )}
                      </div>
                      {motion.description && (
                        <div className="mt-2 text-base text-slate-600">{motion.description}</div>
                      )}
                      {(motion.votesFor !== undefined ||
                        motion.votesAgainst !== undefined ||
                        motion.abstentions !== undefined) && (
                        <div className="mt-2 flex gap-4 text-sm font-medium text-slate-600">
                          <span>賛成: {motion.votesFor ?? 0}</span>
                          <span>反対: {motion.votesAgainst ?? 0}</span>
                          <span>棄権: {motion.abstentions ?? 0}</span>
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
              <div className="mb-4 text-sm font-bold uppercase tracking-wider text-red-600">
                FAILED
              </div>
              <div className="space-y-2">
                {failedMotions.map((motion, index) => (
                  <div key={motion.id} className="flex items-baseline gap-4 px-6 py-3 opacity-50">
                    <div className="text-lg font-mono text-slate-400">
                      {passedMotions.length + pendingMotions.length + index + 1}.
                    </div>
                    <div className="flex-1">
                      <div className="flex items-baseline gap-3 text-lg line-through">
                        <span className="font-bold uppercase text-slate-600">
                          {motion.proposedBy}
                        </span>
                        <span className="text-slate-400">·</span>
                        <span className="font-bold text-slate-600">
                          {MOTION_TYPE_LABELS[motion.type].short}
                        </span>
                        {motion.duration && motion.type !== 'withdraw' && (
                          <span className="text-slate-500">{motion.duration}m</span>
                        )}
                      </div>
                      {(motion.votesFor !== undefined ||
                        motion.votesAgainst !== undefined ||
                        motion.abstentions !== undefined) && (
                        <div className="mt-1 flex gap-3 text-xs text-slate-500">
                          <span>賛成: {motion.votesFor ?? 0}</span>
                          <span>反対: {motion.votesAgainst ?? 0}</span>
                          <span>棄権: {motion.abstentions ?? 0}</span>
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {conference.motions.length === 0 && (
            <div className="py-24 text-center">
              <p className="text-2xl text-slate-400">No motions submitted</p>
            </div>
          )}
        </div>
      </div>

      {/* Footer - Return link */}
      <div className="mt-12 text-center">
        <Link
          href={`/motionmanager/conference/${conferenceId}`}
          className="text-sm text-slate-400 hover:text-slate-600"
        >
          ← 管理画面に戻る
        </Link>
      </div>

      {/* Timer Modal */}
      {timerState && timerState.isRunning && currentMotion && (
        <div className="fixed inset-0 z-50 flex items-center justify-center backdrop-blur-xl">
          <div className="relative w-full max-w-6xl rounded-lg border border-slate-200 bg-white p-16 shadow-lg">
            {/* Motion Info */}
            <div className="mb-10 border-b border-slate-100 pb-6">
              <div className="mb-2 text-sm font-medium uppercase tracking-wide text-slate-400">
                {MOTION_TYPE_LABELS[currentMotion.type].ja}
              </div>
              <div className="text-5xl font-semibold text-slate-900">
                {currentMotion.proposedBy}
              </div>
              {currentMotion.speakingTime && (
                <div className="mt-3 text-xl text-slate-500">
                  1国あたり {currentMotion.speakingTime}秒
                </div>
              )}
            </div>

            {/* Timer Display */}
            <div className="mb-10">
              <div
                className={`font-mono text-[180px] font-bold leading-none tabular-nums transition-colors ${
                  remainingSeconds <= 60
                    ? 'text-red-600'
                    : timerState.isPaused
                      ? 'text-slate-400'
                      : 'text-slate-900'
                }`}
              >
                {formatTime(remainingSeconds)}
              </div>
              {timerState.isPaused && (
                <div className="mt-4 text-xl font-medium text-slate-400">一時停止中</div>
              )}
            </div>

            {/* Progress Bar */}
            <div className="mb-10 h-2 overflow-hidden rounded-full bg-slate-100">
              <div
                className={`h-full transition-all duration-1000 ${
                  remainingSeconds <= 60 ? 'bg-red-600' : 'bg-slate-900'
                }`}
                style={{
                  width: `${(remainingSeconds / timerState.totalSeconds) * 100}%`,
                }}
              />
            </div>

            {/* Control Buttons */}
            <div className="flex gap-3">
              {timerState.isPaused ? (
                <button
                  onClick={resumeTimer}
                  className="flex-1 rounded-md border border-slate-200 bg-white px-6 py-4 text-lg font-medium text-slate-900 transition-colors hover:bg-slate-50"
                >
                  再開
                </button>
              ) : (
                <button
                  onClick={pauseTimer}
                  className="flex-1 rounded-md border border-slate-200 bg-white px-6 py-4 text-lg font-medium text-slate-900 transition-colors hover:bg-slate-50"
                >
                  一時停止
                </button>
              )}
              <button
                onClick={stopTimer}
                className="flex-1 rounded-md border border-red-200 bg-white px-6 py-4 text-lg font-medium text-red-600 transition-colors hover:bg-red-50"
              >
                停止
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Roll Call Modal */}
      {showRollCallModal && conference.countries.length > 0 && (
        <div className="fixed inset-0 z-50 flex items-center justify-center backdrop-blur-xl">
          <div className="relative w-full max-w-6xl rounded-lg border border-slate-200 bg-white p-12 shadow-lg">
            {/* Header */}
            <div className="mb-8 flex items-center justify-between border-b border-slate-200 pb-6">
              <h2 className="text-4xl font-bold text-slate-900">ROLL CALL BOARD</h2>
              <button
                onClick={() => setShowRollCallModal(false)}
                className="rounded-lg border border-slate-200 bg-white px-6 py-3 text-lg font-medium text-slate-600 transition-colors hover:bg-slate-50"
              >
                Close
              </button>
            </div>

            {/* Table */}
            <div className="overflow-hidden rounded-lg border border-slate-200">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-slate-200 bg-slate-50">
                    <th className="px-6 py-4 text-left text-sm font-semibold uppercase tracking-wider text-slate-600">
                      #
                    </th>
                    <th className="px-6 py-4 text-left text-sm font-semibold uppercase tracking-wider text-slate-600">
                      Country
                    </th>
                    <th className="px-6 py-4 text-center text-sm font-semibold uppercase tracking-wider text-slate-600">
                      Status
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200">
                  {conference.countries.map((country, index) => (
                    <tr
                      key={country.id}
                      className={`transition-colors ${
                        country.rollCallStatus === 'present_and_voting'
                          ? 'bg-green-50'
                          : country.rollCallStatus === 'present'
                            ? 'bg-blue-50'
                            : country.rollCallStatus === 'absent'
                              ? 'bg-slate-50'
                              : 'bg-white'
                      }`}
                    >
                      <td className="px-6 py-4 text-lg font-mono text-slate-500">{index + 1}</td>
                      <td className="px-6 py-4 text-2xl font-semibold text-slate-900">
                        {country.name}
                      </td>
                      <td className="px-6 py-4 text-center">
                        {country.rollCallStatus ? (
                          <span
                            className={`inline-flex items-center rounded-full px-4 py-2 text-lg font-semibold ${
                              country.rollCallStatus === 'present_and_voting'
                                ? 'bg-green-600 text-white'
                                : country.rollCallStatus === 'present'
                                  ? 'bg-blue-600 text-white'
                                  : 'bg-slate-400 text-white'
                            }`}
                          >
                            {ROLL_CALL_LABELS[country.rollCallStatus].en}
                          </span>
                        ) : (
                          <span className="text-lg text-slate-400">Not Confirmed</span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Summary */}
            <div className="mt-6 flex justify-between rounded-lg border border-slate-200 bg-slate-50 p-4 text-lg">
              <div className="flex gap-6">
                <span className="font-semibold text-slate-900">
                  Total: <span className="text-slate-600">{conference.countries.length}</span>
                </span>
                <span className="font-semibold text-green-700">
                  Present and Voting:{' '}
                  {
                    conference.countries.filter((c) => c.rollCallStatus === 'present_and_voting')
                      .length
                  }
                </span>
                <span className="font-semibold text-blue-700">
                  Present:{' '}
                  {conference.countries.filter((c) => c.rollCallStatus === 'present').length}
                </span>
                <span className="font-semibold text-slate-600">
                  Absent: {conference.countries.filter((c) => c.rollCallStatus === 'absent').length}
                </span>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
