export interface MahjongRecord {
  id: string;
  date: string;            // YYYY-MM-DDTHH:mm
  baseScore: number;       // 底 (e.g. 50, 100)
  pointScore: number;      // 台 (e.g. 20, 30)
  rounds: number;          // 將數 (e.g. 1, 2)
  amount: number;          // 淨勝負金額 (+1200, -500)
  location: string;        // 地點標籤
  tags: string[];          // 特殊標籤
  notes?: string;          // 備忘
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
  id: number;              // 0: 東, 1: 南, 2: 西, 3: 北
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