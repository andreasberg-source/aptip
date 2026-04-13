import { Trip, Participant } from '../store/tripStore';

export interface Transfer {
  fromId: string;
  fromName: string;
  toId: string;
  toName: string;
  amount: number;
}

/**
 * Compute the minimum set of transfers needed to settle all debts in a trip.
 * Uses a greedy algorithm: repeatedly match the largest debtor with the largest creditor.
 */
export function computeSettlement(trip: Trip): Transfer[] {
  const nameMap: Record<string, string> = {};
  for (const p of trip.participants) {
    nameMap[p.id] = p.name;
  }

  // Compute net balance per participant
  const balance: Record<string, number> = {};
  for (const p of trip.participants) {
    balance[p.id] = 0;
  }

  for (const bill of trip.bills) {
    // The payer gets credit for the full bill amount
    balance[bill.paidBy] = (balance[bill.paidBy] ?? 0) + bill.totalAmount;
    // Each participant owes their share
    for (const [pid, owed] of Object.entries(bill.splits)) {
      balance[pid] = (balance[pid] ?? 0) - owed;
    }
  }

  // Separate into debtors (negative balance) and creditors (positive balance)
  const debtors: { id: string; amount: number }[] = Object.entries(balance)
    .filter(([, b]) => b < -0.005)
    .map(([id, b]) => ({ id, amount: Math.abs(b) }))
    .sort((a, b) => b.amount - a.amount); // largest debt first

  const creditors: { id: string; amount: number }[] = Object.entries(balance)
    .filter(([, b]) => b > 0.005)
    .map(([id, b]) => ({ id, amount: b }))
    .sort((a, b) => b.amount - a.amount); // largest credit first

  const transfers: Transfer[] = [];

  let di = 0;
  let ci = 0;

  while (di < debtors.length && ci < creditors.length) {
    const debtor = debtors[di];
    const creditor = creditors[ci];
    const transferAmount = Math.min(debtor.amount, creditor.amount);

    if (transferAmount > 0.005) {
      transfers.push({
        fromId: debtor.id,
        fromName: nameMap[debtor.id] ?? debtor.id,
        toId: creditor.id,
        toName: nameMap[creditor.id] ?? creditor.id,
        amount: Math.round(transferAmount * 100) / 100,
      });
    }

    debtor.amount -= transferAmount;
    creditor.amount -= transferAmount;

    if (debtor.amount <= 0.005) di++;
    if (creditor.amount <= 0.005) ci++;
  }

  return transfers;
}

/**
 * Compute per-person equal split amounts for a bill.
 */
export function computeEqualSplits(
  totalAmount: number,
  participantIds: string[],
): Record<string, number> {
  if (participantIds.length === 0) return {};
  const share = Math.round((totalAmount / participantIds.length) * 100) / 100;
  const splits: Record<string, number> = {};
  let allocated = 0;
  for (let i = 0; i < participantIds.length; i++) {
    const amount = i === participantIds.length - 1
      ? Math.round((totalAmount - allocated) * 100) / 100
      : share;
    splits[participantIds[i]] = amount;
    allocated += share;
  }
  return splits;
}

/**
 * Compute splits from percentage inputs.
 */
export function computePercentageSplits(
  totalAmount: number,
  percentages: Record<string, number>,
): Record<string, number> {
  const splits: Record<string, number> = {};
  for (const [pid, pct] of Object.entries(percentages)) {
    splits[pid] = Math.round((totalAmount * pct / 100) * 100) / 100;
  }
  return splits;
}

/**
 * Compute splits from itemized bill items.
 * Items with empty assignedTo are split equally among all participants.
 */
export function computeItemizedSplits(
  items: Array<{ amount: number; assignedTo: string[] }>,
  allParticipants: string[],
): Record<string, number> {
  const splits: Record<string, number> = {};
  for (const pid of allParticipants) {
    splits[pid] = 0;
  }

  for (const item of items) {
    const assigned = item.assignedTo.length > 0 ? item.assignedTo : allParticipants;
    const share = item.amount / assigned.length;
    for (const pid of assigned) {
      splits[pid] = (splits[pid] ?? 0) + share;
    }
  }

  // Round
  for (const pid of Object.keys(splits)) {
    splits[pid] = Math.round(splits[pid] * 100) / 100;
  }

  return splits;
}
