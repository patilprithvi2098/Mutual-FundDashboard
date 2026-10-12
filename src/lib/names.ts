/** "UTI Nifty 50 Index Fund - Direct Plan - Growth" -> "UTI Nifty 50 Index". */
export function shortName(name: string) {
  return name.split(" - ")[0]
    .replace(/US Specific Equity Passive FOF/i, "")
    .replace(/\s+Fund$/i, "")
    .replace(/NASDAQ/g, "Nasdaq")
    .replace(/\s{2,}/g, " ").trim();
}
export function plainCategory(category: string, name = "") {
  if (/overseas/i.test(category)) return /nasdaq/i.test(name) ? "US tech stocks" : "International stocks";
  if (/index/i.test(category)) return "Index fund, large companies";
  if (/small cap/i.test(category)) return "Small companies";
  if (/mid cap/i.test(category)) return "Mid-sized companies";
  if (/large & mid/i.test(category)) return "Large and mid-sized companies";
  if (/large cap/i.test(category)) return "Large companies";
  if (/elss/i.test(category)) return "Tax-saving stocks";
  if (/short/i.test(category)) return "Short-term bonds";
  if (/liquid|overnight|money market/i.test(category)) return "Cash-like bonds";
  if (/debt|income|gilt|bond/i.test(category)) return "Bonds";
  return category.split(" - ").at(-1) ?? category;
}
export const initials = (name: string) => shortName(name).split(/\s+/).filter((w) => /^[A-Za-z]/.test(w)).slice(0, 2).map((w) => w[0].toUpperCase()).join("");

