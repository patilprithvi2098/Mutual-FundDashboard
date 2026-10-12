/**
 * Monthly SIP split for the Trends page. Amounts come from the editable sample SIPs on the Goals page
 * (fund_sips table), keyed by scheme_code. Funds without an amount count as zero; if every amount is zero,
 * the page shows equal shares and says so.
 */
export function sipSplit(funds: { scheme_code: number; name: string }[], amountsByCode: Record<number, number>) {
  const amounts = funds.map((f) => amountsByCode[f.scheme_code] ?? 0);
  const configured = amounts.some((a) => a > 0);
  const weights = configured ? amounts : funds.map(() => 1);
  const total = weights.reduce((s, a) => s + a, 0) || 1;
  const rows = funds.map((f, i) => ({ ...f, amount: configured ? amounts[i] : null, pct: Math.round((weights[i] / total) * 100) }));
  return { rows, configured, total: configured ? total : null };
}
