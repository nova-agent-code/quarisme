const DISPLAY_NAME_PATTERN = /^[A-Za-z0-9][A-Za-z0-9 _.'-]{1,23}$/;
const MIN_PASSWORD_LENGTH = 8;
const MAX_PASSWORD_LENGTH = 72;
const MAX_MESSAGE_LENGTH = 4000;

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

export function validateMessageContent(content: string): string | null {
  const trimmed = content.trim();
  if (!trimmed) return "Message cannot be empty.";
  if (trimmed.length > MAX_MESSAGE_LENGTH) {
    return `Message must be at most ${MAX_MESSAGE_LENGTH} characters.`;
  }
  return null;
}

const MAX_ATTACHMENT_SIZE = 7 * 1024 * 1024;
const ALLOWED_IMAGE_TYPES = ["image/jpeg", "image/png", "image/gif", "image/webp"];
const ALLOWED_AUDIO_TYPES = ["audio/mpeg", "audio/wav", "audio/ogg", "audio/mp4", "audio/x-m4a", "audio/webm"];

export function validateAttachment(file: File): string | null {
  if (file.size > MAX_ATTACHMENT_SIZE) {
    return "File must be 7 MB or smaller.";
  }
  const isImage = ALLOWED_IMAGE_TYPES.includes(file.type);
  const isAudio = ALLOWED_AUDIO_TYPES.includes(file.type);
  if (!isImage && !isAudio) {
    return "Only images and audio files are allowed.";
  }
  return null;
}
