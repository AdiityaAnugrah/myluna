import { AppError } from './errors';

export function getLocalDateString(date = new Date()) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

export function assertUserDateIsToday(roleName: string | undefined, value: unknown, label: string) {
  if (roleName !== 'USER') return;

  const today = getLocalDateString();
  if (String(value) !== today) {
    throw new AppError(`${label} untuk role USER hanya boleh hari ini`, 400);
  }
}
