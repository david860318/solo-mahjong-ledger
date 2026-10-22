import type { Player } from '../types/mahjong';

export interface TransferTransaction {
  from: string;
  to: string;
  amount: number;
}

export function calculateMinimalTransfers(players: Player[]): TransferTransaction[] {
  const debtors: { name: string; amount: number }[] = [];
  const creditors: { name: string; amount: number }[] = [];

  players.forEach((p) => {
    if (p.score < 0) {
      debtors.push({ name: p.name, amount: -p.score });
    } else if (p.score > 0) {
      creditors.push({ name: p.name, amount: p.score });
    }
  });

  const transactions: TransferTransaction[] = [];
  let dIdx = 0;
  let cIdx = 0;

  while (dIdx < debtors.length && cIdx < creditors.length) {
    const debtor = debtors[dIdx];
    const creditor = creditors[cIdx];
    const settleAmt = Math.min(debtor.amount, creditor.amount);

    if (settleAmt > 0) {
      transactions.push({
        from: debtor.name,
        to: creditor.name,
        amount: settleAmt
      });
    }

    debtor.amount -= settleAmt;
    creditor.amount -= settleAmt;

    if (debtor.amount <= 0) dIdx++;
    if (creditor.amount <= 0) cIdx++;
  }

  return transactions;
}