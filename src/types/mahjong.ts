export interface MahjongRecord {
  id: string;
  date: string;
  baseScore: number;
  pointScore: number;
  rounds: number;
  amount: number;
  location: string;
  tags: string[];
  notes?: string;
  createdAt: number;
}

export interface MahjongStats {
  totalProfit: number;
  totalMatches: number;
  totalRounds: number;
  winMatches: number;
  lossMatches: number;
  drawMatches: number;
  winRate: number;
  expectedValuePerRound: number;
  maxWin: number;
  maxLoss: number;
  currentStreak: number;
  bestStreak: number;
}

export type WindType = '東' | '南' | '西' | '北';

export interface Player {
  id: number;
  name: string;
  score: number;
}

export interface FanRule {
  id: string;
  name: string;
  fan: number;
  enabled: boolean;
  isCustom?: boolean;
}

export interface RoundLog {
  id: string;
  windDesc: string;
  dealerIndex: number;
  dealerStreak: number;
  winnerIndex: number;
  loserIndex: number; // -1: 自摸, 0~3: 放槍者
  isSelfDrawn: boolean;
  isBaoPai?: boolean; // 是否為包牌（一人承擔全額）
  baseScore: number;
  pointScore: number;
  fanCount: number;
  amountWon: number;
  details: string;
  prevScores: number[];
  prevWindIndex: number;
  prevDealerIndex: number;
  prevDealerStreak: number;
}

export interface UserProfile {
  id: string;
  display_name: string;
  avatar_url?: string;
  preferred_base: number;
  preferred_point: number;
}