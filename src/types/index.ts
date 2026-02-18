// Motion Types (動議の種類)
export type MotionType =
  | 'moderated_caucus' // 公式討議
  | 'unmoderated_caucus' // 非公式討議
  | 'extend_debate' // 討議時間延長
  | 'close_debate' // 討議終了
  | 'table_topic' // 議題の棚上げ
  | 'adjourn_meeting' // 会議休憩
  | 'other'; // その他

// Motion Status
export type MotionStatus = 'pending' | 'passed' | 'failed';

// Roll Call Status
export type RollCallStatus = 'present' | 'present_and_voting' | 'absent';

// Country (参加国)
export interface Country {
  id: string;
  name: string;
  rollCallStatus?: RollCallStatus;
}

// Motion (動議)
export interface Motion {
  id: string;
  type: MotionType;
  proposedBy: string; // 提案国
  description: string; // 詳細説明
  duration?: number; // 所要時間（分）
  speakingTime?: number; // 発言時間（秒）- Moderated Caucusで使用
  status: MotionStatus;
  votesFor?: number; // 賛成票数
  votesAgainst?: number; // 反対票数
  abstentions?: number; // 棄権票数
  createdAt: number; // タイムスタンプ
}

// Conference (会議)
export interface Conference {
  id: string;
  name: string; // 会議名（例: "UNSC Session 1"）
  committee: string; // 委員会名（例: "Security Council"）
  topic: string; // 議題
  totalCountries?: number; // 参加国数
  countries: Country[]; // 参加国リスト
  createdAt: number;
  motions: Motion[];
}

// Motion Type Labels (日英対応)
export const MOTION_TYPE_LABELS: Record<MotionType, { en: string; ja: string; short: string }> = {
  moderated_caucus: { en: 'Moderated Caucus', ja: '公式討議', short: 'M' },
  unmoderated_caucus: { en: 'Unmoderated Caucus', ja: '非公式討議', short: 'U' },
  extend_debate: { en: 'Extend Debate Time', ja: '討議時間延長', short: 'ED' },
  close_debate: { en: 'Close Debate', ja: '討議終了', short: 'CD' },
  table_topic: { en: 'Table the Topic', ja: '議題の棚上げ', short: 'TT' },
  adjourn_meeting: { en: 'Adjourn the Meeting', ja: '会議休憩', short: 'ADJ' },
  other: { en: 'Other', ja: 'その他', short: 'O' },
};

// Status Labels
export const STATUS_LABELS: Record<MotionStatus, { en: string; ja: string }> = {
  pending: { en: 'Pending', ja: '保留中' },
  passed: { en: 'Passed', ja: '可決' },
  failed: { en: 'Failed', ja: '否決' },
};

// Roll Call Status Labels
export const ROLL_CALL_LABELS: Record<RollCallStatus, { en: string; ja: string; short: string }> = {
  present: { en: 'Present', ja: '出席', short: 'P' },
  present_and_voting: { en: 'Present and Voting', ja: '出席・投票権あり', short: 'P&V' },
  absent: { en: 'Absent', ja: '欠席', short: 'A' },
};

// Timer State (タイマー状態)
export interface TimerState {
  isRunning: boolean;
  conferenceId: string;
  motionId: string;
  totalSeconds: number;
  remainingSeconds: number;
  isPaused: boolean;
  startedAt: number;
}
