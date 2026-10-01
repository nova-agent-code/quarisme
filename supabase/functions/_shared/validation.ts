const DISPLAY_NAME_PATTERN = /^[A-Za-z0-9][A-Za-z0-9 _.'-]{1,23}$/;
const MIN_PASSWORD_LENGTH = 8;
const MAX_PASSWORD_LENGTH = 72;

export function validateDisplayName(displayName: string): string | null {
  if (!displayName) return "Display name is required.";
  if (displayName.length < 3 || displayName.length > 24) {
    return "Display name must be between 3 and 24 characters.";
  }
  if (!DISPLAY_NAME_PATTERN.test(displayName)) {
    return "Display name may only contain letters, numbers, spaces, and _ . ' -";
  }
  if (!/[A-Za-z0-9]/.test(displayName[displayName.length - 1])) {
    return "Display name must end with a letter or number.";
  }
  return null;
}

export function validatePassword(password: string): string | null {
  if (!password) return "Password is required.";
  if (password.length < MIN_PASSWORD_LENGTH) {
    return `Password must be at least ${MIN_PASSWORD_LENGTH} characters.`;
  }
  if (password.length > MAX_PASSWORD_LENGTH) {
    return `Password must be at most ${MAX_PASSWORD_LENGTH} characters.`;
  }
  return null;
}

export function normalizeDisplayName(displayName: string): string {
  return displayName.toLowerCase();
}
