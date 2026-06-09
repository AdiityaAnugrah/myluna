export function getTodayDateInputValue(date = new Date()) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

export function getUserTodayDateInputProps(isUser: boolean) {
  if (!isUser) return {};

  const today = getTodayDateInputValue();
  return {
    min: today,
    max: today,
    readOnly: true,
  };
}

export function clampUserDateToToday(isUser: boolean, value: string) {
  return isUser ? getTodayDateInputValue() : value;
}
