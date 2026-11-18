// Free click-to-send: these links open the user's own WhatsApp / SMS app with the number and text filled in.

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

/** Digits only; 10 digits get the 91 prefix, 12 digits must already start with 91. Otherwise null (same rule as the API). */
export function normalizePhone(raw: string | null | undefined): string | null {
  const digits = (raw ?? '').replace(/\D/g, '');
  if (digits.length === 10) return '91' + digits;
  if (digits.length === 12 && digits.startsWith('91')) return digits;
  return null;
}

export function whatsappLink(phone: string, text: string): string {
  return `https://wa.me/${phone}?text=${encodeURIComponent(text)}`;
}

// "?&body=" is the form both Android and iOS accept.
export function smsLink(phone: string, text: string): string {
  return `sms:+${phone}?&body=${encodeURIComponent(text)}`;
}

/** yyyy-MM-dd to dd-MMM-yyyy, matching the wording of the server's approved templates. */
export function formatMessageDate(iso: string | null | undefined): string {
  if (!iso) return '';
  const [y, m, d] = iso.split('-').map(Number);
  return `${String(d).padStart(2, '0')}-${MONTHS[m - 1]}-${y}`;
}

export function absenceText(studentName: string, isoDate: string, className: string, schoolName: string): string {
  return `Dear Parent, ${studentName} was absent from school on ${formatMessageDate(isoDate)} (Class ${className}). Regards, ${schoolName}`;
}

export function feeText(studentName: string, balance: number, earliestDueIso: string | null, schoolName: string): string {
  const due = earliestDueIso ? ` (earliest due date ${formatMessageDate(earliestDueIso)})` : '';
  return `Dear Parent, fee balance for ${studentName} is Rs ${Number(balance).toFixed(2)}${due}. Please pay at the school office. Regards, ${schoolName}`;
}
