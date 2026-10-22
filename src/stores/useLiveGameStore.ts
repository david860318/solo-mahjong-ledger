import { defineStore } from 'pinia';
import { ref, computed } from 'vue';
import type { Player, RoundLog, WindType, FanRule } from '../types/mahjong';

const WINDS: WindType[] = ['東', '南', '西', '北'];
const LIVE_TABLE_SETTINGS_KEY = 'live_mahjong_settings_v1';
const LIVE_FAN_RULES_KEY = 'live_mahjong_fan_rules_v1';

// 台灣十六張麻將官方預設牌型台數
export const DEFAULT_FAN_RULES: FanRule[] = [
  { id: 'menqing', name: '門清', fan: 1, enabled: true },
  { id: 'zimo', name: '自摸', fan: 1, enabled: true },
  { id: 'round_wind', name: '圈風牌', fan: 1, enabled: true },
  { id: 'door_wind', name: '門風牌', fan: 1, enabled: true },
  { id: 'dragons', name: '中發白', fan: 1, enabled: true },
  { id: 'flower', name: '花牌每台', fan: 1, enabled: true },
  { id: 'pinghu', name: '平胡', fan: 2, enabled: true },
  { id: 'haidi', name: '海底撈月', fan: 1, enabled: true },
  { id: 'gang_draw', name: '槓上開花', fan: 1, enabled: true },
  { id: 'rob_gang', name: '搶槓', fan: 1, enabled: true },
  { id: 'pengpeng', name: '碰碰胡', fan: 4, enabled: true },
  { id: 'hunyise', name: '混一色', fan: 4, enabled: true },
  { id: 'xiaosanyuan', name: '小三元', fan: 4, enabled: true },
  { id: 'qingyise', name: '清一色', fan: 8, enabled: true },
  { id: 'dasanyuan', name: '大三元', fan: 8, enabled: true },
  { id: 'xiaosixi', name: '小四喜', fan: 8, enabled: true },
  { id: 'dasixi', name: '大四喜', fan: 16, enabled: true },
  { id: 'tianhu', name: '天胡/地胡', fan: 16, enabled: true },
  { id: 'bahuadahe', name: '八仙過海/七搶一', fan: 8, enabled: true }
];

export const useLiveGameStore = defineStore('liveGame', () => {
  const baseScore = ref<number>(100);
  const pointScore = ref<number>(30);
  const players = ref<Player[]>([
    { id: 0, name: '東家 (我)', score: 0 },
    { id: 1, name: '南家', score: 0 },
    { id: 2, name: '西家', score: 0 },
    { id: 3, name: '北家', score: 0 }
  ]);

  // 台數規則表
  const fanRules = ref<FanRule[]>(JSON.parse(JSON.stringify(DEFAULT_FAN_RULES)));

  // 讀取本地儲存
  const savedSettings = localStorage.getItem(LIVE_TABLE_SETTINGS_KEY);
  if (savedSettings) {
    try {
      const parsed = JSON.parse(savedSettings);
      if (parsed.baseScore) baseScore.value = Number(parsed.baseScore);
      if (parsed.pointScore) pointScore.value = Number(parsed.pointScore);
      if (Array.isArray(parsed.playerNames)) {
        parsed.playerNames.forEach((name: string, i: number) => {
          if (players.value[i] && name) players.value[i].name = name;
        });
      }
    } catch (e) {
      console.error(e);
    }
  }

  const savedRules = localStorage.getItem(LIVE_FAN_RULES_KEY);
  if (savedRules) {
    try {
      const parsedRules = JSON.parse(savedRules);
      if (Array.isArray(parsedRules) && parsedRules.length > 0) {
        fanRules.value = parsedRules;
      }
    } catch (e) {
      console.error(e);
    }
  }

  function saveTableSettings(newBase: number, newPoint: number, names: string[]) {
    baseScore.value = Number(newBase) || 0;
    pointScore.value = Number(newPoint) || 0;
    names.forEach((name, i) => {
      if (players.value[i]) players.value[i].name = name || `玩家${i + 1}`;
    });
    localStorage.setItem(
      LIVE_TABLE_SETTINGS_KEY,
      JSON.stringify({
        baseScore: baseScore.value,
        pointScore: pointScore.value,
        playerNames: players.value.map((p) => p.name)
      })
    );
  }

  function saveFanRules(rules: FanRule[]) {
    fanRules.value = rules;
    localStorage.setItem(LIVE_FAN_RULES_KEY, JSON.stringify(rules));
  }

  function resetFanRulesToDefault() {
    fanRules.value = JSON.parse(JSON.stringify(DEFAULT_FAN_RULES));
    localStorage.setItem(LIVE_FAN_RULES_KEY, JSON.stringify(fanRules.value));
  }

  const currentWindIndex = ref<number>(0);
  const currentDealerIndex = ref<number>(0);
  const dealerStreak = ref<number>(0);
  const logs = ref<RoundLog[]>([]);

  const currentRoundName = computed(() => {
    return `${WINDS[currentWindIndex.value]}風${WINDS[currentDealerIndex.value]}`;
  });

  const currentDealerFan = computed(() => {
    return dealerStreak.value * 2 + 1;
  });

  // 僅取得當前啟用的台數規則供結算勾選
  const activeFanRules = computed(() => {
    return fanRules.value.filter((r) => r.enabled);
  });

  function settleRound(payload: {
    winnerIndex: number;
    loserIndex: number;
    fanCount: number;
    tags: string[];
  }) {
    const { winnerIndex, loserIndex, fanCount, tags } = payload;
    const isSelfDrawn = loserIndex === -1;
    const isDealerInvolved = winnerIndex === currentDealerIndex.value || loserIndex === currentDealerIndex.value;

    const effectiveFan = fanCount + (isDealerInvolved ? currentDealerFan.value : 0);
    const singlePayment = Number(baseScore.value) + effectiveFan * Number(pointScore.value);

    const snapshotScores = players.value.map((p) => p.score);
    const snapWind = currentWindIndex.value;
    const snapDealer = currentDealerIndex.value;
    const snapStreak = dealerStreak.value;

    let amountWon = 0;

    if (isSelfDrawn) {
      players.value.forEach((p, idx) => {
        if (idx !== winnerIndex) {
          p.score -= singlePayment;
          amountWon += singlePayment;
        }
      });
      players.value[winnerIndex].score += amountWon;
    } else {
      players.value[loserIndex].score -= singlePayment;
      players.value[winnerIndex].score += singlePayment;
      amountWon = singlePayment;
    }

    logs.value.unshift({
      id: 'round-' + Date.now(),
      windDesc: currentRoundName.value,
      dealerIndex: currentDealerIndex.value,
      dealerStreak: dealerStreak.value,
      winnerIndex,
      loserIndex,
      isSelfDrawn,
      baseScore: baseScore.value,
      pointScore: pointScore.value,
      fanCount: effectiveFan,
      amountWon,
      details: tags.join('、') || '一般牌型',
      prevScores: snapshotScores,
      prevWindIndex: snapWind,
      prevDealerIndex: snapDealer,
      prevDealerStreak: snapStreak
    });

    if (winnerIndex === currentDealerIndex.value) {
      dealerStreak.value += 1;
    } else {
      advanceDealer();
    }
  }

  function passDraw() {
    dealerStreak.value += 1;
    logs.value.unshift({
      id: 'round-' + Date.now(),
      windDesc: currentRoundName.value,
      dealerIndex: currentDealerIndex.value,
      dealerStreak: dealerStreak.value - 1,
      winnerIndex: -1,
      loserIndex: -1,
      isSelfDrawn: false,
      baseScore: baseScore.value,
      pointScore: pointScore.value,
      fanCount: 0,
      amountWon: 0,
      details: '流局臭莊（莊家連莊）',
      prevScores: players.value.map((p) => p.score),
      prevWindIndex: currentWindIndex.value,
      prevDealerIndex: currentDealerIndex.value,
      prevDealerStreak: dealerStreak.value - 1
    });
  }

  function advanceDealer() {
    dealerStreak.value = 0;
    if (currentDealerIndex.value === 3) {
      currentDealerIndex.value = 0;
      currentWindIndex.value = (currentWindIndex.value + 1) % 4;
    } else {
      currentDealerIndex.value += 1;
    }
  }

  function undoLastRound(): boolean {
    if (logs.value.length === 0) return false;
    const last = logs.value.shift()!;
    players.value.forEach((p, idx) => {
      p.score = last.prevScores[idx];
    });
    currentWindIndex.value = last.prevWindIndex;
    currentDealerIndex.value = last.prevDealerIndex;
    dealerStreak.value = last.prevDealerStreak;
    return true;
  }

  function resetGame() {
    players.value.forEach((p) => (p.score = 0));
    currentWindIndex.value = 0;
    currentDealerIndex.value = 0;
    dealerStreak.value = 0;
    logs.value = [];
  }

  return {
    baseScore,
    pointScore,
    players,
    fanRules,
    activeFanRules,
    currentWindIndex,
    currentDealerIndex,
    dealerStreak,
    currentRoundName,
    currentDealerFan,
    logs,
    saveTableSettings,
    saveFanRules,
    resetFanRulesToDefault,
    settleRound,
    passDraw,
    undoLastRound,
    resetGame
  };
});