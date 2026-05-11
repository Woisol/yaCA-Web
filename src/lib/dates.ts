export function formatSessionDate(value: string): string {
  const date = new Date(value);
  if (Number.isNaN(date.valueOf())) return '';
  return date.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
}
