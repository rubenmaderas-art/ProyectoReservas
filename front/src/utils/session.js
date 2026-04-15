export const SESSION_DURATION_MS = 4 * 60 * 60 * 1000;
export const SESSION_WARNING_MS = 5 * 60 * 1000;

export const SESSION_STORAGE_KEYS = {
  token: 'token',
  user: 'user',
  centres: 'centres',
  loginAt: 'loginAt',
};

export const clearSessionStorage = () => {
  localStorage.removeItem(SESSION_STORAGE_KEYS.token);
  localStorage.removeItem(SESSION_STORAGE_KEYS.user);
  localStorage.removeItem(SESSION_STORAGE_KEYS.centres);
  localStorage.removeItem(SESSION_STORAGE_KEYS.loginAt);
};

export const persistSession = ({ token, user, centres = [], loginAt = Date.now() }) => {
  localStorage.setItem(SESSION_STORAGE_KEYS.token, token);
  if (typeof user !== 'undefined') {
    localStorage.setItem(SESSION_STORAGE_KEYS.user, typeof user === 'string' ? user : JSON.stringify(user));
  }
  localStorage.setItem(SESSION_STORAGE_KEYS.centres, JSON.stringify(centres));
  localStorage.setItem(SESSION_STORAGE_KEYS.loginAt, String(loginAt));
};

export const getStoredLoginAt = () => {
  const raw = localStorage.getItem(SESSION_STORAGE_KEYS.loginAt);
  const parsed = Number(raw);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : null;
};

export const ensureSessionStart = () => {
  const currentLoginAt = getStoredLoginAt();
  if (currentLoginAt) {
    return currentLoginAt;
  }

  const now = Date.now();
  localStorage.setItem(SESSION_STORAGE_KEYS.loginAt, String(now));
  return now;
};

export const getSessionTiming = () => {
  const loginAt = getStoredLoginAt();

  if (!loginAt) {
    return {
      loginAt: null,
      warningAt: null,
      expiresAt: null,
      isExpired: false,
    };
  }

  const expiresAt = loginAt + SESSION_DURATION_MS;
  const warningAt = expiresAt - SESSION_WARNING_MS;

  return {
    loginAt,
    warningAt,
    expiresAt,
    isExpired: Date.now() >= expiresAt,
  };
};
