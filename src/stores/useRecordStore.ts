import { defineStore } from 'pinia';
import { ref, computed } from 'vue';
import type { MahjongRecord, MahjongStats } from '../types/mahjong';
import { supabase } from '../utils/supabase';
import { useAuthStore } from './useAuthStore';

const STORAGE_KEY = 'solo_mahjong_records_v1';
export type TimeRange = 'all' | 'year' | 'month';

export const useRecordStore = defineStore('mahjongRecords', () => {
  const records = ref<MahjongRecord[]>([]);
  const currentTimeRange = ref<TimeRange>('all');
  const authStore = useAuthStore();

  const saved = localStorage.getItem(STORAGE_KEY);
  if (saved) {
    try {
      const parsed = JSON.parse(saved);
      records.value = Array.isArray(parsed)
        ? parsed.map((r: any) => ({
            ...r,
            amount: Number(r.amount) || 0,
            rounds: Number(r.rounds) || 1,
            baseScore: Number(r.baseScore) || 0,
            pointScore: Number(r.pointScore) || 0
          }))
        : [];
    } catch {
      records.value = [];
    }
  }

  function saveToStorage() {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(records.value));
  }

  function clearRecordsOnSignOut() {
    records.value = [];
    localStorage.removeItem(STORAGE_KEY);
  }

  async function fetchCloudRecords() {
    if (!authStore.user) return;
    try {
      const { data, error } = await supabase
        .from('mahjong_records')
        .select('*')
        .eq('user_id', authStore.user.id)
        .order('played_at', { ascending: false });

      if (error) {
        console.error('抓取雲端紀錄失敗:', error);
        return;
      }

      if (data) {
        records.value = data.map((item: any) => ({
          id: item.id,
          date: item.played_at.slice(0, 16),
          baseScore: Number(item.base_score) || 0,
          pointScore: Number(item.point_score) || 0,
          rounds: Number(item.rounds) || 1,
          amount: Number(item.amount) || 0,
          location: item.location || '現場牌桌',
          tags: Array.isArray(item.tags) ? item.tags : [],
          notes: item.notes || '',
          createdAt: new Date(item.created_at).getTime()
        }));
        saveToStorage();
      }
    } catch (e) {
      console.error('連線 Supabase 異常:', e);
    }
  }

  const filteredByTimeRecords = computed(() => {
    const now = new Date();
    const currentYear = now.getFullYear();
    const currentMonth = now.getMonth();

    return records.value.filter((r) => {
      const d = new Date(r.date);
      if (currentTimeRange.value === 'year') return d.getFullYear() === currentYear;
      if (currentTimeRange.value === 'month') return d.getFullYear() === currentYear && d.getMonth() === currentMonth;
      return true;
    });
  });

  const sortedRecords = computed(() => {
    return [...filteredByTimeRecords.value].sort(
      (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()
    );
  });

  const stats = computed<MahjongStats>(() => {
    const list = filteredByTimeRecords.value;
    const totalMatches = list.length;
    if (totalMatches === 0) {
      return {
        totalProfit: 0,
        totalMatches: 0,
        totalRounds: 0,
        winMatches: 0,
        lossMatches: 0,
        drawMatches: 0,
        winRate: 0,
        expectedValuePerRound: 0,
        maxWin: 0,
        maxLoss: 0,
        currentStreak: 0,
        bestStreak: 0
      };
    }

    let totalProfit = 0;
    let totalRounds = 0;
    let winMatches = 0;
    let lossMatches = 0;
    let drawMatches = 0;
    let maxWin = 0;
    let maxLoss = 0;

    list.forEach((r) => {
      const amt = Number(r.amount) || 0;
      const rds = Number(r.rounds) || 1;
      totalProfit += amt;
      totalRounds += rds;

      if (amt > 0) winMatches++;
      else if (amt < 0) lossMatches++;
      else drawMatches++;

      if (amt > maxWin) maxWin = amt;
      if (amt < maxLoss) maxLoss = amt;
    });

    const winRate = totalMatches > 0 ? (winMatches / totalMatches) * 100 : 0;
    const expectedValuePerRound = totalRounds > 0 ? totalProfit / totalRounds : 0;

    const chronological = [...list].sort(
      (a, b) => new Date(a.date).getTime() - new Date(b.date).getTime()
    );
    let bestStreak = 0;
    let tempStreak = 0;
    let currentStreak = 0;

    chronological.forEach((r) => {
      const amt = Number(r.amount) || 0;
      if (amt > 0) {
        tempStreak = tempStreak > 0 ? tempStreak + 1 : 1;
        bestStreak = Math.max(bestStreak, tempStreak);
        currentStreak = currentStreak > 0 ? currentStreak + 1 : 1;
      } else if (amt < 0) {
        tempStreak = 0;
        currentStreak = currentStreak < 0 ? currentStreak - 1 : -1;
      } else {
        tempStreak = 0;
        currentStreak = 0;
      }
    });

    return {
      totalProfit,
      totalMatches,
      totalRounds,
      winMatches,
      lossMatches,
      drawMatches,
      winRate,
      expectedValuePerRound,
      maxWin,
      maxLoss,
      currentStreak,
      bestStreak
    };
  });

  const trendPoints = computed(() => {
    const chronological = [...filteredByTimeRecords.value].sort(
      (a, b) => new Date(a.date).getTime() - new Date(b.date).getTime()
    );
    const recent = chronological.slice(-15);
    let cumulative = 0;
    return recent.map((r) => {
      const amt = Number(r.amount) || 0;
      cumulative += amt;
      return {
        date: r.date.split('T')[0],
        matchAmount: amt,
        cumulative
      };
    });
  });

  const locationStats = computed(() => {
    const map = new Map<string, { matches: number; profit: number; wins: number }>();
    filteredByTimeRecords.value.forEach((r) => {
      const loc = r.location?.trim() || '未標註場地';
      const cur = map.get(loc) || { matches: 0, profit: 0, wins: 0 };
      const amt = Number(r.amount) || 0;
      cur.matches += 1;
      cur.profit += amt;
      if (amt > 0) cur.wins += 1;
      map.set(loc, cur);
    });

    return Array.from(map.entries())
      .map(([location, stat]) => ({
        location,
        matches: stat.matches,
        profit: stat.profit,
        winRate: (stat.wins / stat.matches) * 100
      }))
      .sort((a, b) => b.profit - a.profit);
  });

  const stakeStats = computed(() => {
    const map = new Map<string, { matches: number; profit: number; wins: number }>();
    filteredByTimeRecords.value.forEach((r) => {
      const key = `${r.baseScore}/${r.pointScore}`;
      const cur = map.get(key) || { matches: 0, profit: 0, wins: 0 };
      const amt = Number(r.amount) || 0;
      cur.matches += 1;
      cur.profit += amt;
      if (amt > 0) cur.wins += 1;
      map.set(key, cur);
    });

    return Array.from(map.entries())
      .map(([stake, stat]) => ({
        stake,
        matches: stat.matches,
        profit: stat.profit,
        winRate: (stat.wins / stat.matches) * 100
      }))
      .sort((a, b) => b.matches - a.matches);
  });

  const friendStats = computed(() => {
    const map = new Map<string, { matches: number; profit: number; wins: number }>();
    filteredByTimeRecords.value.forEach((r) => {
      const amt = Number(r.amount) || 0;
      const candidates = (r.tags || []).filter(
        (t) => !t.includes('台') && !t.includes('家') && !t.includes('局') && !t.includes('座次')
      );

      candidates.forEach((name) => {
        const cur = map.get(name) || { matches: 0, profit: 0, wins: 0 };
        cur.matches += 1;
        cur.profit += amt;
        if (amt > 0) cur.wins += 1;
        map.set(name, cur);
      });
    });

    return Array.from(map.entries())
      .map(([name, stat]) => ({
        name,
        matches: stat.matches,
        profit: stat.profit,
        winRate: (stat.wins / stat.matches) * 100
      }))
      .sort((a, b) => b.profit - a.profit);
  });

  async function addRecord(record: Omit<MahjongRecord, 'id' | 'createdAt'>) {
    const tempId = 'rec-' + Date.now();
    const newEntry: MahjongRecord = {
      ...record,
      amount: Number(record.amount) || 0,
      rounds: Number(record.rounds) || 1,
      baseScore: Number(record.baseScore) || 0,
      pointScore: Number(record.pointScore) || 0,
      id: tempId,
      createdAt: Date.now()
    };

    records.value.unshift(newEntry);
    saveToStorage();

    if (authStore.user) {
      try {
        const payload = {
          user_id: authStore.user.id,
          played_at: new Date(newEntry.date).toISOString(),
          base_score: newEntry.baseScore,
          point_score: newEntry.pointScore,
          rounds: newEntry.rounds,
          amount: newEntry.amount,
          location: newEntry.location || '現場牌桌',
          tags: newEntry.tags || [],
          notes: newEntry.notes || ''
        };

        const { data, error } = await supabase
          .from('mahjong_records')
          .insert(payload)
          .select()
          .single();

        if (!error && data) {
          newEntry.id = data.id;
          saveToStorage();
        }
      } catch (err) {
        console.error('儲存紀錄網路異常:', err);
      }
    }
  }

  async function updateRecord(id: string, updated: Omit<MahjongRecord, 'id' | 'createdAt'>) {
    const idx = records.value.findIndex((r) => r.id === id);
    if (idx !== -1) {
      records.value[idx] = {
        ...records.value[idx],
        ...updated,
        amount: Number(updated.amount) || 0,
        rounds: Number(updated.rounds) || 1,
        baseScore: Number(updated.baseScore) || 0,
        pointScore: Number(updated.pointScore) || 0
      };
      saveToStorage();

      if (authStore.user && !id.startsWith('rec-')) {
        try {
          await supabase
            .from('mahjong_records')
            .update({
              played_at: new Date(updated.date).toISOString(),
              base_score: Number(updated.baseScore),
              point_score: Number(updated.pointScore),
              rounds: Number(updated.rounds),
              amount: Number(updated.amount),
              location: updated.location,
              tags: updated.tags,
              notes: updated.notes
            })
            .eq('id', id);
        } catch (err) {
          console.error('更新 Supabase 紀錄失敗:', err);
        }
      }
    }
  }

  async function deleteRecord(id: string) {
    records.value = records.value.filter((r) => r.id !== id);
    saveToStorage();

    if (authStore.user && !id.startsWith('rec-')) {
      try {
        await supabase.from('mahjong_records').delete().eq('id', id);
      } catch (err) {
        console.error('刪除 Supabase 紀錄失敗:', err);
      }
    }
  }

  function exportJSON() {
    const blob = new Blob([JSON.stringify(records.value, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `mahjong_records_${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    URL.revokeObjectURL(url);
  }

  function exportCSV() {
    if (records.value.length === 0) return;
    const headers = ['日期', '底', '台', '將數', '損益(NTD)', '地點', '標籤', '備忘'];
    const rows = records.value.map((r) => [
      `"${r.date}"`,
      r.baseScore,
      r.pointScore,
      r.rounds,
      r.amount,
      `"${r.location || ''}"`,
      `"${(r.tags || []).join(';')}"`,
      `"${(r.notes || '').replace(/"/g, '""')}"`
    ]);

    const csvContent = '\uFEFF' + [headers.join(','), ...rows.map((row) => row.join(','))].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `mahjong_records_${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }

  function importJSON(jsonString: string): boolean {
    try {
      const data = JSON.parse(jsonString);
      if (Array.isArray(data)) {
        records.value = data.map((r: any) => ({
          ...r,
          amount: Number(r.amount) || 0,
          rounds: Number(r.rounds) || 1,
          baseScore: Number(r.baseScore) || 0,
          pointScore: Number(r.pointScore) || 0
        }));
        saveToStorage();
        return true;
      }
    } catch (e) {
      console.error('匯入 JSON 格式無效:', e);
    }
    return false;
  }

  return {
    records,
    currentTimeRange,
    sortedRecords,
    stats,
    trendPoints,
    locationStats,
    stakeStats,
    friendStats,
    fetchCloudRecords,
    clearRecordsOnSignOut,
    addRecord,
    updateRecord,
    deleteRecord,
    exportJSON,
    exportCSV,
    importJSON
  };
});