export function normalizeBdPhone(raw: string): string | null {
  const digits = raw.replace(/\D/g, '');

  if (!digits) return null;

  if (digits.startsWith('88') && digits.length === 13) {
    const local = digits.slice(2);
    return isValidBdPhoneLocal(local) ? local : null;
  }

  if (digits.length === 11 && digits.startsWith('01')) {
    return isValidBdPhoneLocal(digits) ? digits : null;
  }

  return null;
}

export function toBdPhoneE164(local: string): string {
  return `+88${local}`;
}

export function isValidBdPhoneLocal(value: string): boolean {
  return /^01\d{9}$/.test(value);
}
