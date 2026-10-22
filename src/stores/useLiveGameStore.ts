import { defineStore } from 'pinia';
import { ref, computed } from 'vue';
import type { Player, RoundLog, WindType, FanRule } from '../types/mahjong';

const WINDS: WindType[] = ['東', '南', '西', '北'];
const LIVE_TABLE_SETTINGS_KEY = 'live_mahjong_settings_v1';
const LIVE_FAN_RULES_KEY = 'live_mahjong_fan_rules_v1';

// 台灣正規十六張麻將預設役種台數規則
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
  // 1. 底台與座次
  const baseScore = ref<number>(100);
  const pointScore = ref<number>(30);
  const mySeatIndex = ref<number>(0); // 0: 東, 1: 南, 2: 西, 3: 北

  const players = ref<Player[]>([
    { id: 0, name: '東家', score: 0 },
    { id: 1, name: '南家', score: 0 },
    { id: 2, name: '西家', score: 0 },
    { id: 3, name: '北家', score: 0 }
  ]);

  // 2. 自訂台數規則
  const fanRules = ref<FanRule[]>(JSON.parse(JSON.stringify(DEFAULT_FAN_RULES)));

  // 3. 風圈、莊家與局況追蹤
  const currentWindIndex = ref<number>(0);   // 0: 東風圈, 1: 南風圈, 2: 西風圈, 3: 北風圈
  const currentDealerIndex = ref<number>(0); // 0~3 當前莊家座次
  const dealerStreak = ref<number>(0);       // 連莊數 (0: 莊, 1: 連一拉一...)
  const logs = ref<RoundLog[]>([]);

  // 4. 初始化讀取 LocalStorage 快取
  const savedSettings = localStorage.getItem(LIVE_TABLE_SETTINGS_KEY);
  if (savedSettings) {
    try {
      const parsed = JSON.parse(savedSettings);
      if (parsed.baseScore !== undefined) baseScore.value = Number(parsed.baseScore) || 0;
      if (parsed.pointScore !== undefined) pointScore.value = Number(parsed.pointScore) || 0;
      if (typeof parsed.mySeatIndex === 'number') mySeatIndex.value = parsed.mySeatIndex;
      if (Array.isArray(parsed.playerNames)) {
        parsed.playerNames.forEach((name: string, i: number) => {
          if (players.value[i] && name) players.value[i].name = name;
        });
      }
    } catch (e) {
      console.error('Failed to parse table settings:', e);
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
      console.error('Failed to parse fan rules:', e);
    }
  }

  // --- Getters / Computed ---

  // 當前局名 (例如: 東風東、南風西)
  const currentRoundName = computed(() => {
    return `${WINDS[currentWindIndex.value]}風${WINDS[currentDealerIndex.value]}`;
  });

  // 計算莊家台數：連 n 拉 n 相當於 (2n + 1) 台
  const currentDealerFan = computed(() => {
    return dealerStreak.value * 2 + 1;
  });

  // 「我」所在的玩家物件
  const myPlayer = computed(() => {
    return players.value[mySeatIndex.value] || players.value[0];
  });

  // 僅篩選啟用中的台數規則供結算畫面勾選
  const activeFanRules = computed(() => {
    return fanRules.value.filter((r) => r.enabled);
  });

  // --- Actions ---

  // 儲存底台、座次與玩家名稱
  function saveTableSettings(newBase: number, newPoint: number, names: string[], mySeat: number) {
    baseScore.value = Number(newBase) || 0;
    pointScore.value = Number(newPoint) || 0;
    mySeatIndex.value = mySeat >= 0 && mySeat <= 3 ? mySeat : 0;

    names.forEach((name, i) => {
      if (players.value[i]) {
        players.value[i].name = name.trim() || `${WINDS[i]}家`;
      }
    });

    localStorage.setItem(
      LIVE_TABLE_SETTINGS_KEY,
      JSON.stringify({
        baseScore: baseScore.value,
        pointScore: pointScore.value,
        mySeatIndex: mySeatIndex.value,
        playerNames: players.value.map((p) => p.name)
      })
    );
  }

  // 儲存自訂台數清單
  function saveFanRules(rules: FanRule[]) {
    fanRules.value = rules;
    localStorage.setItem(LIVE_FAN_RULES_KEY, JSON.stringify(rules));
  }

  // 還原為預設台數
  function resetFanRulesToDefault() {
    fanRules.value = JSON.parse(JSON.stringify(DEFAULT_FAN_RULES));
    localStorage.setItem(LIVE_FAN_RULES_KEY, JSON.stringify(fanRules.value));
  }

  // 下莊遞轉邏輯
  function advanceDealer() {
    dealerStreak.value = 0;
    if (currentDealerIndex.value === 3) {
      // 北家下莊 -> 過風圈 (東 -> 南 -> 西 -> 北 -> 東)
      currentDealerIndex.value = 0;
      currentWindIndex.value = (currentWindIndex.value + 1) % 4;
    } else {
      currentDealerIndex.value += 1;
    }
  }

  // 胡牌結算
  function settleRound(payload: {
    winnerIndex: number;
    loserIndex: number; // -1 表示自摸 (三家付)
    fanCount: number;
    tags: string[];
  }) {
    const { winnerIndex, loserIndex, fanCount, tags } = payload;
    const isSelfDrawn = loserIndex === -1;
    const isDealerInvolved =
      winnerIndex === currentDealerIndex.value || loserIndex === currentDealerIndex.value;

    // 計算總台數（若莊家胡牌或放槍，系統自動加上莊家連莊台數）
    const effectiveFan = fanCount + (isDealerInvolved ? currentDealerFan.value : 0);
    const singlePayment = Number(baseScore.value) + effectiveFan * Number(pointScore.value);

    // 建立復原快照 (Deep Copy)
    const snapshotScores = players.value.map((p) => p.score);
    const snapWind = currentWindIndex.value;
    const snapDealer = currentDealerIndex.value;
    const snapStreak = dealerStreak.value;

    let amountWon = 0;

    if (isSelfDrawn) {
      // 自摸：其餘三家各付一份
      players.value.forEach((p, idx) => {
        if (idx !== winnerIndex) {
          p.score -= singlePayment;
          amountWon += singlePayment;
        }
      });
      players.value[winnerIndex].score += amountWon;
    } else {
      // 放槍：一對一支付
      players.value[loserIndex].score -= singlePayment;
      players.value[winnerIndex].score += singlePayment;
      amountWon = singlePayment;
    }

    // 寫入對戰歷史明細
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

    // 局況流轉：莊家胡牌則連莊累加，閒家胡牌則下莊遞轉
    if (winnerIndex === currentDealerIndex.value) {
      dealerStreak.value += 1;
    } else {
      advanceDealer();
    }
  }

  // 流局 / 臭莊
  function passDraw() {
    const snapshotScores = players.value.map((p) => p.score);
    const snapWind = currentWindIndex.value;
    const snapDealer = currentDealerIndex.value;
    const snapStreak = dealerStreak.value;

    // 台灣牌規流局莊家繼續連莊
    dealerStreak.value += 1;

    logs.value.unshift({
      id: 'round-' + Date.now(),
      windDesc: currentRoundName.value,
      dealerIndex: currentDealerIndex.value,
      dealerStreak: snapStreak,
      winnerIndex: -1,
      loserIndex: -1,
      isSelfDrawn: false,
      baseScore: baseScore.value,
      pointScore: pointScore.value,
      fanCount: 0,
      amountWon: 0,
      details: '流局臭莊（莊家連莊）',
      prevScores: snapshotScores,
      prevWindIndex: snapWind,
      prevDealerIndex: snapDealer,
      prevDealerStreak: snapStreak
    });
  }

  // 復原上一把 (Undo)
  function undoLastRound(): boolean {
    if (logs.value.length === 0) return false;
    const last = logs.value.shift()!;

    // 還原四家分數
    players.value.forEach((p, idx) => {
      p.score = last.prevScores[idx];
    });

    // 還原風圈、莊家與連莊次數
    currentWindIndex.value = last.prevWindIndex;
    currentDealerIndex.value = last.prevDealerIndex;
    dealerStreak.value = last.prevDealerStreak;
    return true;
  }

  // 重開本桌
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
    mySeatIndex,
    players,
    fanRules,
    currentWindIndex,
    currentDealerIndex,
    dealerStreak,
    logs,
    currentRoundName,
    currentDealerFan,
    myPlayer,
    activeFanRules,
    saveTableSettings,
    saveFanRules,
    resetFanRulesToDefault,
    settleRound,
    passDraw,
    undoLastRound,
    resetGame
  };
});