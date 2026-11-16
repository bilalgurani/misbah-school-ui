const ONES = [
  '', 'One', 'Two', 'Three', 'Four', 'Five', 'Six', 'Seven', 'Eight', 'Nine', 'Ten', 'Eleven',
  'Twelve', 'Thirteen', 'Fourteen', 'Fifteen', 'Sixteen', 'Seventeen', 'Eighteen', 'Nineteen',
];
const TENS = ['', '', 'Twenty', 'Thirty', 'Forty', 'Fifty', 'Sixty', 'Seventy', 'Eighty', 'Ninety'];

function belowHundred(n: number): string {
  if (n < 20) return ONES[n];
  return TENS[Math.floor(n / 10)] + (n % 10 ? ' ' + ONES[n % 10] : '');
}

function belowThousand(n: number): string {
  const hundreds = Math.floor(n / 100);
  const rest = n % 100;
  const parts: string[] = [];
  if (hundreds) parts.push(ONES[hundreds] + ' Hundred');
  if (rest) parts.push(belowHundred(rest));
  return parts.join(' ');
}

function wholeNumberToWords(n: number): string {
  if (n === 0) return 'Zero';
  const units: [number, string][] = [
    [10000000, 'Crore'],
    [100000, 'Lakh'],
    [1000, 'Thousand'],
  ];
  const parts: string[] = [];
  let remaining = n;
  for (const [size, label] of units) {
    const chunk = Math.floor(remaining / size);
    if (chunk) {
      parts.push(`${wholeNumberToWords(chunk)} ${label}`);
      remaining %= size;
    }
  }
  if (remaining) parts.push(belowThousand(remaining));
  return parts.join(' ');
}

export function amountInWords(amount: number): string {
  const totalPaise = Math.round(Math.abs(Number(amount) || 0) * 100);
  const rupees = Math.floor(totalPaise / 100);
  const paise = totalPaise % 100;
  let words = `Rupees ${wholeNumberToWords(rupees)}`;
  if (paise) words += ` and ${belowHundred(paise)} Paise`;
  return `${words} Only`;
}
