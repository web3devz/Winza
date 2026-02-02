/**
 * Утилітні функції для роботи з часом
 */

/**
 * Парсить timestamp з різних форматів (мікросекунди, мілісекунди, ISO string)
 * @param dateInput - Вхідні дані часу
 * @returns timestamp в мілісекундах
 */
export function parseTimestamp(dateInput: string | number | Date | null | undefined): number {
  if (dateInput === null || dateInput === undefined) return Date.now();

  if (dateInput instanceof Date) return dateInput.getTime();

  const asNumber = (val: number): number => {
    if (val >= 1e17) return Math.floor(val / 1e6);
    if (val >= 1e13) return Math.floor(val / 1e3);
    if (val >= 1e11) return val;
    if (val >= 1e9) return val * 1000;
    return val;
  };

  if (typeof dateInput === 'number') {
    const ms = asNumber(dateInput);
    return ms;
  }

  if (typeof dateInput === 'string') {
    const s = dateInput.trim();
    const norm = s.startsWith('+') ? s.slice(1) : s;
    const numericOnly = /^[-+]?\d+(?:\.\d+)?$/.test(norm);
    if (numericOnly) {
      const num = parseFloat(norm);
      const ms = asNumber(num);
      return ms;
    }
    const d = new Date(norm);
    const t = d.getTime();
    return isNaN(t) ? Date.now() : t;
  }

  return Date.now();
}

/**
 * Форматує час з урахуванням локального часового поясу користувача
 * @param dateInput - Вхідні дані часу
 * @param options - Опції форматування (необов'язково)
 * @returns Відформатований час
 */
export function formatLocalTime(
  dateInput: string | number | Date | null | undefined,
  options?: Intl.DateTimeFormatOptions
): string {
  if (!dateInput) return 'N/A';
  
  const timestamp = parseTimestamp(dateInput);
  const date = new Date(timestamp);
  
  const defaultOptions: Intl.DateTimeFormatOptions = {
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: false
  };
  
  const formatOptions = { ...defaultOptions, ...options };
  
  // Використовуємо локальні налаштування користувача (undefined означає автовизначення)
  return date.toLocaleTimeString(undefined, formatOptions);
}

/**
 * Форматує дату з урахуванням локального часового поясу користувача
 * @param dateInput - Вхідні дані часу
 * @param options - Опції форматування (необов'язково)
 * @returns Відформатована дата
 */
export function formatLocalDate(
  dateInput: string | number | Date | null | undefined,
  options?: Intl.DateTimeFormatOptions
): string {
  if (!dateInput) return 'N/A';
  
  const timestamp = parseTimestamp(dateInput);
  const date = new Date(timestamp);
  
  const defaultOptions: Intl.DateTimeFormatOptions = {
    year: 'numeric',
    month: 'short',
    day: 'numeric'
  };
  
  const formatOptions = { ...defaultOptions, ...options };
  
  // Використовуємо локальні налаштування користувача
  return date.toLocaleDateString(undefined, formatOptions);
}

/**
 * Форматує дату та час разом з урахуванням локального часового поясу
 * @param dateInput - Вхідні дані часу
 * @param options - Опції форматування (необов'язково)
 * @returns Відформатовані дата та час
 */
export function formatLocalDateTime(
  dateInput: string | number | Date | null | undefined,
  options?: Intl.DateTimeFormatOptions
): string {
  if (!dateInput) return 'N/A';
  
  const timestamp = parseTimestamp(dateInput);
  const date = new Date(timestamp);
  
  const defaultOptions: Intl.DateTimeFormatOptions = {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false
  };
  
  const formatOptions = { ...defaultOptions, ...options };
  
  // Використовуємо локальні налаштування користувача
  return date.toLocaleString(undefined, formatOptions);
}

/**
 * Отримує інформацію про часовий пояс користувача
 * @returns Об'єкт з інформацією про часовий пояс
 */
export function getUserTimezone() {
  const timezone = Intl.DateTimeFormat().resolvedOptions().timeZone;
  const offset = new Date().getTimezoneOffset();
  const offsetHours = Math.abs(offset) / 60;
  const offsetSign = offset <= 0 ? '+' : '-';
  
  return {
    timezone,
    offset,
    offsetString: `UTC${offsetSign}${offsetHours.toString().padStart(2, '0')}:${(Math.abs(offset) % 60).toString().padStart(2, '0')}`
  };
}