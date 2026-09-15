export function maskPan(pan: string): string {
  if (pan.length < 4) return "XXXX";
  return `${"*".repeat(pan.length - 4)}${pan.slice(-4)}`;
}

export function maskAccount(accountNumber: string): string {
  if (accountNumber.length <= 4) return "****";
  return `${"*".repeat(accountNumber.length - 4)}${accountNumber.slice(-4)}`;
}

export function maskMobile(mobile: string): string {
  if (mobile.length <= 4) return "****";
  return `${"*".repeat(mobile.length - 4)}${mobile.slice(-4)}`;
}

export function maskEmail(email: string): string {
  const [local, domain] = email.split("@");
  if (!domain) return "***";
  const visible = local.slice(0, 1);
  return `${visible}***@${domain}`;
}
