// 個人記帳模型
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

// 牌桌即時對戰模型
export type WindType = '東' | '南' | '西' | '北';

export interface Player {
  id: number;
  name: string;
  score: number;
}

// 自訂台數役種規則
export interface FanRule {
  id: string;
  name: string;
  fan: number;
  enabled: boolean;
  isCustom?: boolean; // 是否為使用者自行新增的牌型
}

export interface RoundLog {
  id: string;
  windDesc: string;
  dealerIndex: number;
  dealerStreak: number;
  winnerIndex: number;
  loserIndex: number;
  isSelfDrawn: boolean;
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