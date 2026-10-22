import { defineStore } from 'pinia';
import { ref, computed } from 'vue';
import type { Player, RoundLog, WindType, FanRule } from '../types/mahjong';
import { supabase } from '../utils/supabase';
import { useAuthStore } from './useAuthStore';

const WINDS: WindType[] = ['東', '南', '西', '北'];
const LIVE_TABLE_SETTINGS_KEY = 'live_mahjong_settings_v1';
const LIVE_FAN_RULES_KEY = 'live_mahjong_fan_rules_v1';

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
  const authStore = useAuthStore();

  const baseScore = ref<number>(100);
  const pointScore = ref<number>(30);
  const mySeatIndex = ref<number>(0);

  const players = ref<Player[]>([
    { id: 0, name: '東家', score: 0 },
    { id: 1, name: '南家', score: 0 },
    { id: 2, name: '西家', score: 0 },
    { id: 3, name: '北家', score: 0 }
  ]);

  const fanRules = ref<FanRule[]>(JSON.parse(JSON.stringify(DEFAULT_FAN_RULES)));
  const currentWindIndex = ref<number>(0);
  const currentDealerIndex = ref<number>(0);
  const dealerStreak = ref<number>(0);
  const logs = ref<RoundLog[]>([]);

  // 1. 初始化讀取本地快取
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

  // 2. 從 Supabase 載入台數規則與牌桌 Session
  async function fetchCloudLiveSettings() {
    if (!authStore.user) return;

    try {
      // 載入自訂台數規則
      const { data: rulesData } = await supabase
        .from('user_fan_rules')
        .select('*');

      if (rulesData && rulesData.length > 0) {
        fanRules.value = rulesData.map((r: any) => ({
          id: r.rule_key,
          name: r.rule_name,
          fan: Number(r.fan),
          enabled: r.enabled,
          isCustom: r.is_custom
        }));
        localStorage.setItem(LIVE_FAN_RULES_KEY, JSON.stringify(fanRules.value));
      }

      // 載入牌桌 Session
      const { data: sessionData } = await supabase
        .from('live_game_sessions')
        .select('*')
        .eq('user_id', authStore.user.id)
        .maybeSingle();

      if (sessionData) {
        baseScore.value = sessionData.base_score;
        pointScore.value = sessionData.point_score;
        mySeatIndex.value = sessionData.my_seat_index;
        currentWindIndex.value = sessionData.current_wind_index;
        currentDealerIndex.value = sessionData.current_dealer_index;
        dealerStreak.value = sessionData.dealer_streak;
        if (Array.isArray(sessionData.players)) players.value = sessionData.players;
        if (Array.isArray(sessionData.logs)) logs.value = sessionData.logs;
      }
    } catch (err) {
      console.error('載入雲端牌桌狀態失敗:', err);
    }
  }

  // 3. 同步當前牌桌狀態至 Supabase
  async function syncSessionToCloud() {
    if (!authStore.user) return;
    try {
      await supabase.from('live_game_sessions').upsert({
        user_id: authStore.user.id,
        base_score: baseScore.value,
        point_score: pointScore.value,
        my_seat_index: mySeatIndex.value,
        current_wind_index: currentWindIndex.value,
        current_dealer_index: currentDealerIndex.value,
        dealer_streak: dealerStreak.value,
        players: players.value,
        logs: logs.value,
        updated_at: new Date().toISOString()
      });
    } catch (e) {
      console.error('同步牌桌至雲端失敗:', e);
    }
  }

  const currentRoundName = computed(() => {
    return `${WINDS[currentWindIndex.value]}風${WINDS[currentDealerIndex.value]}`;
  });

  const currentDealerFan = computed(() => {
    return dealerStreak.value * 2 + 1;
  });

  const myPlayer = computed(() => {
    return players.value[mySeatIndex.value] || players.value[0];
  });

  const activeFanRules = computed(() => {
    return fanRules.value.filter((r) => r.enabled);
  });

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

    syncSessionToCloud();
  }

  async function saveFanRules(rules: FanRule[]) {
    fanRules.value = rules;
    localStorage.setItem(LIVE_FAN_RULES_KEY, JSON.stringify(rules));

    // 同步到 Supabase user_fan_rules
    if (authStore.user) {
      try {
        const rows = rules.map((r) => ({
          user_id: authStore.user!.id,
          rule_key: r.id,
          rule_name: r.name,
          fan: r.fan,
          enabled: r.enabled,
          is_custom: !!r.isCustom
        }));

        await supabase.from('user_fan_rules').upsert(rows, { onConflict: 'user_id,rule_key' });
      } catch (err) {
        console.error('儲存台數規則至雲端失敗:', err);
      }
    }
  }

  async function resetFanRulesToDefault() {
    fanRules.value = JSON.parse(JSON.stringify(DEFAULT_FAN_RULES));
    localStorage.setItem(LIVE_FAN_RULES_KEY, JSON.stringify(fanRules.value));

    if (authStore.user) {
      await supabase.from('user_fan_rules').delete().eq('user_id', authStore.user.id);
      await saveFanRules(fanRules.value);
    }
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

  function settleRound(payload: {
    winnerIndex: number;
    loserIndex: number;
    fanCount: number;
    tags: string[];
  }) {
    const { winnerIndex, loserIndex, fanCount, tags } = payload;
    const isSelfDrawn = loserIndex === -1;
    const isDealerInvolved =
      winnerIndex === currentDealerIndex.value || loserIndex === currentDealerIndex.value;

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

    syncSessionToCloud();
  }

  function passDraw() {
    const snapshotScores = players.value.map((p) => p.score);
    const snapWind = currentWindIndex.value;
    const snapDealer = currentDealerIndex.value;
    const snapStreak = dealerStreak.value;

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

    syncSessionToCloud();
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

    syncSessionToCloud();
    return true;
  }

  function resetGame() {
    players.value.forEach((p) => (p.score = 0));
    currentWindIndex.value = 0;
    currentDealerIndex.value = 0;
    dealerStreak.value = 0;
    logs.value = [];

    syncSessionToCloud();
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
    fetchCloudLiveSettings,
    syncSessionToCloud,
    saveTableSettings,
    saveFanRules,
    resetFanRulesToDefault,
    settleRound,
    passDraw,
    undoLastRound,
    resetGame
  };
});