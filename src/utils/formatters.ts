import type { MahjongRecord, MahjongStats, Player, RoundLog } from '../types/mahjong';

export const formatCurrency = (amount: number): string => {
  const sign = amount > 0 ? '+' : '';
  return `${sign}${amount.toLocaleString()}`;
};

export const formatDate = (dateStr: string): string => {
  const date = new Date(dateStr);
  return `${date.getFullYear()}/${(date.getMonth() + 1).toString().padStart(2, '0')}/${date
    .getDate()
    .toString()
    .padStart(2, '0')}`;
};

export const generateLineReport = (stats: MahjongStats, latest?: MahjongRecord): string => {
  let text = `🀄 【個人雀歷最新戰報】 🀄\n`;
  if (latest) {
    const res = latest.amount > 0 ? `贏 ${formatCurrency(latest.amount)}` : latest.amount < 0 ? `輸 ${latest.amount}` : '平手';
    text += `今日戰果：${res} (${latest.rounds}將 @ ${latest.baseScore}/${latest.pointScore})\n`;
    if (latest.tags.length > 0) text += `牌型標籤：${latest.tags.join('、')}\n`;
    text += `------------------------\n`;
  }
  text += `📊 生涯總淨利：${formatCurrency(stats.totalProfit)} 元\n`;
  text += `🎯 生涯勝率：${stats.winRate.toFixed(1)}% (${stats.winMatches}勝 / ${stats.lossMatches}敗 / ${stats.drawMatches}平)\n`;
  text += `⚡ 每將期望值：${formatCurrency(Math.round(stats.expectedValuePerRound))} 元/將\n`;
  text += `🔥 連勝紀錄：最高 ${stats.bestStreak} 連勝 (當前: ${stats.currentStreak >= 0 ? '+' + stats.currentStreak : stats.currentStreak})\n`;
  text += `記錄於 Solo Mahjong Ledger 🎲`;
  return text;
};

export const generateTableBill = (
  players: Player[],
  base: number,
  point: number,
  logs: RoundLog[]
): string => {
  let text = `🀄 【台灣麻將四家對帳單】 🀄\n`;
  text += `規則：${base} / ${point} 底台 · 總局數：${logs.length} 把\n`;
  text += `------------------------\n`;
  players.forEach((p) => {
    const scoreStr = p.score > 0 ? `+${p.score}` : `${p.score}`;
    text += `${p.name}：${scoreStr} 元\n`;
  });
  text += `------------------------\n`;
  text += `零和校驗：${players.reduce((sum, p) => sum + p.score, 0)} 元 (總和必為0)\n`;
  text += `牌局順利結束，歡喜結算！ 🍵`;
  return text;
};