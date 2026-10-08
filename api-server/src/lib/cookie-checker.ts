const ROBLOX_VALIDATE = "https://users.roblox.com/v1/users/authenticated";
const ROBLOX_CURRENCY = "https://economy.roblox.com/v1/user/currency";
const ROBLOX_SETTINGS = "https://www.roblox.com/my/settings/json";
const ROBLOX_CARDS = "https://apis.roblox.com/payments-gateway/v1/payment-profiles";
const ROBLOX_INVENTORY = "https://inventory.roblox.com/v1/users";
const ROBLOX_BADGES = "https://badges.roblox.com/v1/users";
const ROBLOX_GROUPS = "https://groups.roblox.com/v2/users";
const ROBLOX_GROUP_CURRENCY = "https://economy.roblox.com/v1/groups";
const ROBLOX_TRANSACTIONS = "https://economy.roblox.com/v2/users";
const ROBLOX_SCREENTIME =
  "https://apis.roblox.com/parental-controls-api/v1/parental-controls/get-top-weekly-screentime-by-universe";
const ROBLOX_GAMES = "https://games.roblox.com/v1/games";
const ROBLOX_PLACE_DETAILS =
  "https://games.roblox.com/v1/games/multiget-place-details";
const ROBLOX_GAME_ICONS =
  "https://thumbnails.roblox.com/v1/games/icons";
const ROBLOX_CREDIT =
  "https://apis.roblox.com/credit-balance/v1/get-next-purchasable-metadata";

type JsonRecord = Record<string, unknown>;

type RobloxResponse = {
  status: number;
  data: unknown;
  headers: Headers;
  error?: string;
};

type ValidAccount = {
  valid: true;
  userId: number;
  username: string;
  displayName: string;
};

type InvalidAccount = {
  valid: false;
  error: string;
};

type ValidationResult = ValidAccount | InvalidAccount;

type GameLookup = {
  names: Map<string, string>;
  placeToUniverse: Map<string, string>;
  images: Map<string, string>;
};

type GameCheckConfig = {
  gameId: number;
  gameName?: string;
  gamepassIds: number[];
  badgeIds: number[];
};

type GameAssetCheck = {
  game: string;
  gameId: number;
  imageUrl?: string;
  items: Array<{ id: number; name: string }>;
};

const commonHeaders: Record<string, string> = {
  "User-Agent":
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/120 Safari/537.36",
  Accept: "application/json, text/plain, */*",
  Referer: "https://www.roblox.com/",
};

function asRecord(value: unknown): JsonRecord | null {
  return value !== null && typeof value === "object" && !Array.isArray(value)
    ? (value as JsonRecord)
    : null;
}

function getPath(value: unknown, ...keys: string[]): unknown {
  let current: unknown = value;
  for (const key of keys) {
    const record = asRecord(current);
    if (!record) return undefined;
    current = record[key];
  }
  return current;
}

function asNumber(value: unknown): number | null {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (typeof value === "string" && value.trim() !== "") {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : null;
  }
  return null;
}

function firstNumber(...values: unknown[]): number | null {
  for (const value of values) {
    const parsed = asNumber(value);
    if (parsed !== null) return parsed;
  }
  return null;
}

function asString(value: unknown): string | null {
  return typeof value === "string" && value.trim() ? value : null;
}

function asBoolean(value: unknown): boolean | null {
  return typeof value === "boolean" ? value : null;
}

function asNumberOrString(value: unknown): number | string | null {
  if (typeof value === "string") return value;
  return asNumber(value);
}

function arrayFromPayload(payload: unknown): unknown[] {
  if (Array.isArray(payload)) return payload;
  const record = asRecord(payload);
  if (!record) return [];
  if (Array.isArray(record.data)) return record.data;
  if (Array.isArray(record.items)) return record.items;
  return [];
}

function normalizeGameIds(value: unknown): number[] {
  if (!Array.isArray(value)) return [];

  return Array.from(
    new Set(
      value
        .map((item) => {
          const parsed = asNumber(item);
          return parsed !== null && Number.isSafeInteger(parsed) && parsed > 0
            ? parsed
            : null;
        })
        .filter((item): item is number => item !== null),
    ),
  );
}

function normalizeGameChecks(value: unknown): GameCheckConfig[] {
  if (!Array.isArray(value)) return [];

  return value.flatMap((entry) => {
    const item = asRecord(entry);
    const gameId = asNumber(item?.gameId);
    if (gameId === null || !Number.isSafeInteger(gameId) || gameId <= 0) {
      return [];
    }

    const normalizeAssetIds = (ids: unknown, max: number) =>
      Array.isArray(ids)
        ? Array.from(new Set(ids
          .map(asNumber)
          .filter((id): id is number =>
            id !== null && Number.isSafeInteger(id) && id > 0,
          )))
          .slice(0, max)
        : [];

    return [{
      gameId,
      gameName: asString(item?.gameName) ?? undefined,
      gamepassIds: normalizeAssetIds(item?.gamepassIds, 50),
      badgeIds: normalizeAssetIds(item?.badgeIds, 100),
    }];
  }).slice(0, 100);
}

function idKey(value: number | string): string {
  return String(value);
}

function chunks<T>(values: T[], size: number): T[][] {
  const result: T[][] = [];
  for (let index = 0; index < values.length; index += size) {
    result.push(values.slice(index, index + size));
  }
  return result;
}

async function makeRequest(
  url: string,
  extraHeaders: Record<string, string> = {},
): Promise<RobloxResponse> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 10_000);

  try {
    const response = await fetch(url, {
      headers: { ...commonHeaders, ...extraHeaders },
      signal: controller.signal,
    });
    const contentType = response.headers.get("content-type") ?? "";
    const data = contentType.includes("application/json")
      ? await response.json().catch(() => null)
      : await response.text().catch(() => "");

    return { status: response.status, data, headers: response.headers };
  } catch (error) {
    return {
      status: 0,
      data: null,
      headers: new Headers(),
      error: error instanceof Error && error.name === "AbortError"
        ? "Upstream request timed out"
        : "Upstream request failed",
    };
  } finally {
    clearTimeout(timeout);
  }
}

function cookieHeaders(cookie: string): Record<string, string> {
  return {
    Cookie: `.ROBLOSECURITY=${cookie}`,
    Referer: "https://www.roblox.com/",
  };
}

function isCookie(value: unknown): value is string {
  return typeof value === "string"
    && value.length >= 16
    && value.length <= 4096
    && /^_\|WARNING:-DO-NOT-SHARE-THIS\./.test(value)
    && /\|_[A-Za-z0-9%._~+/=-]{16,}$/.test(value);
}

function collectionCount(payload: unknown): number {
  return arrayFromPayload(payload).length;
}

function assetExists(response: RobloxResponse): boolean {
  return response.status === 200 && arrayFromPayload(response.data).length > 0;
}

function cookieValidationError(status: number, error?: string): InvalidAccount {
  return {
    valid: false,
    error: status ? `HTTP ${status}` : error || "Validation failed",
  };
}

export async function checkSingleCookie(cookie: unknown): Promise<ValidationResult> {
  if (!isCookie(cookie)) {
    return { valid: false, error: "Invalid cookie format" };
  }

  const first = await makeRequest(ROBLOX_VALIDATE, cookieHeaders(cookie));
  let validation = first;
  const csrfToken = first.headers.get("x-csrf-token");

  if (first.status === 403 && csrfToken) {
    validation = await makeRequest(ROBLOX_VALIDATE, {
      ...cookieHeaders(cookie),
      "X-CSRF-TOKEN": csrfToken,
    });
  }

  const data = asRecord(validation.data);
  const userId = asNumber(data?.id);
  if (validation.status === 200 && userId !== null) {
    const username = asString(data?.name) ?? "Unknown";
    return {
      valid: true,
      userId,
      username,
      displayName: asString(data?.displayName) ?? username,
    };
  }

  return cookieValidationError(validation.status, validation.error);
}

function purchaseTotal(payload: unknown): number | null {
  const record = asRecord(payload);
  if (!record) return null;
  const value = firstNumber(
    record.purchases,
    record.purchasesTotal,
    record.purchase,
    record.totalPurchases,
    record.purchaseTotal,
    record.robuxSpent,
    record.spent,
    getPath(record, "summary", "purchases"),
    getPath(record, "summary", "purchasesTotal"),
    getPath(record, "summary", "purchase"),
    getPath(record, "data", "purchases"),
    getPath(record, "data", "purchasesTotal"),
    getPath(record, "data", "purchase"),
  );
  return value === null ? null : Math.abs(value);
}

function transactionAmount(item: unknown): number {
  const value = firstNumber(
    getPath(item, "robux"),
    getPath(item, "amount"),
    getPath(item, "currency", "amount"),
    getPath(item, "details", "amount"),
    getPath(item, "details", "robux"),
    getPath(item, "purchase", "priceInRobux"),
  );
  return value === null ? 0 : Math.abs(value);
}

async function getPurchaseTransactions(
  userId: number,
  headers: Record<string, string>,
): Promise<unknown[]> {
  const transactions: unknown[] = [];
  let cursor: string | null = null;
  const seenCursors = new Set<string>();
  let page = 0;

  while (page < 10) {
    page += 1;
    const cursorQuery = cursor ? `&cursor=${encodeURIComponent(cursor)}` : "";
    const response = await makeRequest(
      `${ROBLOX_TRANSACTIONS}/${userId}/transactions?limit=100&transactionType=Purchase${cursorQuery}`,
      headers,
    );
    if (response.status !== 200) break;

    const items = arrayFromPayload(response.data);
    transactions.push(...items);
    const nextCursor = asString(
      getPath(response.data, "nextPageCursor")
      ?? getPath(response.data, "nextCursor"),
    );
    if (!nextCursor || seenCursors.has(nextCursor) || items.length === 0) break;
    seenCursors.add(nextCursor);
    cursor = nextCursor;
  }

  return transactions;
}

async function getGameLookup(
  gameIds: number[],
  extraPlaceIds: number[] = [],
): Promise<GameLookup> {
  const lookup: GameLookup = {
    names: new Map(),
    placeToUniverse: new Map(),
    images: new Map(),
  };

  for (const ids of chunks(gameIds, 100)) {
    const response = await makeRequest(
      `${ROBLOX_GAMES}?universeIds=${ids.join(",")}`,
    );
    for (const value of arrayFromPayload(response.data)) {
      const item = asRecord(value);
      const name = asString(item?.name);
      const universeId = firstNumber(item?.id);
      const rootPlaceId = firstNumber(item?.rootPlaceId);
      if (!name || universeId === null) continue;
      lookup.names.set(idKey(universeId), name);
      if (rootPlaceId !== null) {
        lookup.names.set(idKey(rootPlaceId), name);
        lookup.placeToUniverse.set(idKey(rootPlaceId), idKey(universeId));
      }
    }
  }

  const candidatePlaceIds = Array.from(
    new Set([...gameIds, ...extraPlaceIds].filter((id) => Number.isSafeInteger(id) && id > 0)),
  );
  for (const ids of chunks(candidatePlaceIds, 100)) {
    const response = await makeRequest(
      `${ROBLOX_PLACE_DETAILS}?placeIds=${ids.join(",")}`,
    );
    for (const value of arrayFromPayload(response.data)) {
      const item = asRecord(value);
      const name = asString(item?.name);
      const placeId = firstNumber(item?.placeId, item?.id);
      const universeId = firstNumber(item?.universeId);
      if (name && placeId !== null) lookup.names.set(idKey(placeId), name);
      if (placeId !== null && universeId !== null) {
        lookup.placeToUniverse.set(idKey(placeId), idKey(universeId));
        if (name && !lookup.names.has(idKey(universeId))) {
          lookup.names.set(idKey(universeId), name);
        }
      }
    }
  }

  const universeIds = Array.from(new Set([
    ...gameIds,
    ...lookup.placeToUniverse.values(),
  ])).filter((id) => Number.isSafeInteger(Number(id)) && Number(id) > 0);
  for (const ids of chunks(universeIds.map(Number), 100)) {
    const response = await makeRequest(
      `${ROBLOX_GAME_ICONS}?universeIds=${ids.join(",")}&size=150x150&format=Png&isCircular=false`,
    );
    for (const value of arrayFromPayload(response.data)) {
      const item = asRecord(value);
      const universeId = firstNumber(item?.targetId, item?.universeId);
      const imageUrl = asString(item?.imageUrl);
      if (universeId !== null && imageUrl) {
        lookup.images.set(idKey(universeId), imageUrl);
      }
    }
  }

  return lookup;
}

function ownedGroupList(payload: unknown, userId: number) {
  return arrayFromPayload(payload)
    .map((value) => {
      const item = asRecord(value);
      const group = asRecord(item?.group) ?? item;
      const role = asRecord(item?.role);
      const ownerId = firstNumber(
        getPath(group, "owner", "userId"),
        getPath(group, "owner", "id"),
        getPath(group, "ownerId"),
      );
      const rank = firstNumber(role?.rank, item?.rank);
      if (ownerId !== userId && rank !== 255) return null;

      const id = firstNumber(group?.id, item?.groupId);
      const name = asString(group?.name);
      if (id === null || !name) return null;

      return {
        id,
        name,
        role: asString(role?.name) ?? undefined,
      };
    })
    .filter((group): group is NonNullable<typeof group> => group !== null);
}

async function getGroupStats(userId: number, headers: Record<string, string>) {
  const groupsResponse = await makeRequest(
    `${ROBLOX_GROUPS}/${userId}/groups/roles_`,
    headers,
  );
  const ownedGroups = groupsResponse.status === 200
    ? ownedGroupList(groupsResponse.data, userId)
    : [];
  const balances = await Promise.all(
    ownedGroups.map((group) =>
      makeRequest(`${ROBLOX_GROUP_CURRENCY}/${group.id}/currency`, headers),
    ),
  );
  const groupBalance = balances.reduce((sum, response) => {
    if (response.status !== 200) return sum;
    const value = firstNumber(
      getPath(response.data, "robux"),
      getPath(response.data, "currency", "robux"),
      getPath(response.data, "currency"),
    );
    return sum + (value ?? 0);
  }, 0);

  return { ownedGroups, groupBalance };
}

function collectibleRap(payload: unknown): number {
  return arrayFromPayload(payload).reduce<number>((sum, value) => {
    const rap = firstNumber(
      getPath(value, "recentAveragePrice"),
      getPath(value, "rap"),
      getPath(value, "asset", "recentAveragePrice"),
    );
    return sum + (rap ?? 0);
  }, 0);
}

async function getRap(
  userId: number,
  headers: Record<string, string>,
): Promise<number | null> {
  let cursor: string | null = null;
  let total = 0;
  let loadedPage = false;
  const seenCursors = new Set<string>();

  while (true) {
    const cursorQuery = cursor ? `&cursor=${encodeURIComponent(cursor)}` : "";
    const response = await makeRequest(
      `${ROBLOX_INVENTORY}/${userId}/assets/collectibles?sortOrder=Asc&limit=100${cursorQuery}`,
      headers,
    );
    if (response.status !== 200) break;

    const items = arrayFromPayload(response.data);
    if (items.length > 0) {
      loadedPage = true;
      total += collectibleRap(response.data);
    }
    const nextCursor = asString(
      getPath(response.data, "nextPageCursor")
      ?? getPath(response.data, "nextCursor"),
    );
    if (!nextCursor || seenCursors.has(nextCursor) || items.length === 0) break;
    seenCursors.add(nextCursor);
    cursor = nextCursor;
  }

  return loadedPage ? total : null;
}

async function getUserBadges(
  userId: number,
  headers: Record<string, string>,
): Promise<unknown[]> {
  let cursor: string | null = null;
  const badges: unknown[] = [];
  const seenCursors = new Set<string>();

  while (true) {
    const cursorQuery = cursor ? `&cursor=${encodeURIComponent(cursor)}` : "";
    const response = await makeRequest(
      `${ROBLOX_BADGES}/${userId}/badges?limit=100${cursorQuery}`,
      headers,
    );
    if (response.status !== 200) break;

    const items = arrayFromPayload(response.data);
    badges.push(...items);
    const nextCursor = asString(getPath(response.data, "nextPageCursor"));
    if (!nextCursor || seenCursors.has(nextCursor) || items.length === 0) break;
    seenCursors.add(nextCursor);
    cursor = nextCursor;
  }

  return badges;
}

function gameAssetDescriptor(
  config: GameCheckConfig,
  lookup: GameLookup,
): GameAssetCheck {
  const configuredId = idKey(config.gameId);
  const gameId = Number(lookup.placeToUniverse.get(configuredId) ?? configuredId);
  const game = config.gameName
    ?? lookup.names.get(configuredId)
    ?? lookup.names.get(idKey(gameId))
    ?? `Game ${config.gameId}`;

  return {
    game,
    gameId,
    imageUrl: lookup.images.get(idKey(gameId)) ?? lookup.images.get(configuredId),
    items: [],
  };
}

function getBadgesByGame(
  badges: unknown[],
  gameChecks: GameCheckConfig[],
  lookup: GameLookup,
): GameAssetCheck[] {
  return gameChecks
    .filter((config) => config.badgeIds.length > 0)
    .map((config) => {
      const result = gameAssetDescriptor(config, lookup);
      const badgeIds = new Set(config.badgeIds);
      const awarderIds = new Set([
        idKey(config.gameId),
        idKey(result.gameId),
      ]);

      result.items = badges.flatMap((badgeValue) => {
        const badge = asRecord(badgeValue);
        const badgeId = firstNumber(badge?.id);
        if (badgeId === null) return [];
        const awarderId = firstNumber(
          getPath(badge, "awarder", "id"),
          getPath(badge, "awarder", "userId"),
        );
        if (!badgeIds.has(badgeId)
          && (awarderId === null || !awarderIds.has(idKey(awarderId)))) {
          return [];
        }

        return [{
          id: badgeId,
          name: asString(badge?.name) ?? `Badge ${badgeId}`,
        }];
      });
      return result;
    });
}

async function getGamepassesByGame(
  userId: number,
  headers: Record<string, string>,
  gameChecks: GameCheckConfig[],
  lookup: GameLookup,
): Promise<GameAssetCheck[]> {
  return Promise.all(gameChecks
    .filter((config) => config.gamepassIds.length > 0)
    .map(async (config) => {
      const result = gameAssetDescriptor(config, lookup);
      const gamepassIds = config.gamepassIds.slice(0, 50);

      for (const gamepassId of gamepassIds) {
        const response = await makeRequest(
          `${ROBLOX_INVENTORY}/${userId}/items/1/${gamepassId}`,
          headers,
        );
        if (response.status === 200) {
          const item = asRecord(arrayFromPayload(response.data)[0]);
          if (item) {
            const id = firstNumber(item.id, item.assetId) ?? gamepassId;
            result.items.push({
              id,
              name: asString(item.name) ?? `Gamepass ${id}`,
            });
          }
        }

        await new Promise((resolve) => setTimeout(resolve, 100));
      }

      return result;
    }));
}

function gameDonationsFromTransactions(
  transactions: unknown[],
  gameIds: number[],
  lookup: GameLookup,
) {
  if (!gameIds.length) return [];
  const configuredGames = new Map<string, number>();
  for (const id of gameIds) {
    const universeId = lookup.placeToUniverse.get(idKey(id)) ?? idKey(id);
    configuredGames.set(universeId, id);
  }
  const configuredIds = new Set(configuredGames.keys());
  const totals = new Map<string, {
    game: string;
    gameId: number;
    imageUrl?: string;
    amount: number;
  }>();

  for (const value of transactions) {
    const amount = firstNumber(
      getPath(value, "currency", "amount"),
      getPath(value, "amount"),
    );
    const currencyType = asString(getPath(value, "currency", "type"));
    const transactionGameId = firstNumber(
      getPath(value, "details", "gameId"),
      getPath(value, "gameId"),
    );
    const placeId = firstNumber(
      getPath(value, "details", "place", "placeId"),
      getPath(value, "details", "placeId"),
      getPath(value, "placeId"),
    );
    if (amount === null
      || (currencyType && currencyType.toLowerCase() !== "robux")) {
      continue;
    }

    const possibleIds = new Set<string>();
    if (transactionGameId !== null) {
      const transactionGameKey = idKey(transactionGameId);
      possibleIds.add(transactionGameKey);
      possibleIds.add(
        lookup.placeToUniverse.get(transactionGameKey) ?? transactionGameKey,
      );
    }
    if (placeId !== null) {
      const placeKey = idKey(placeId);
      possibleIds.add(placeKey);
      possibleIds.add(lookup.placeToUniverse.get(placeKey) ?? placeKey);
    }

    const matchedUniverseId = Array.from(possibleIds)
      .find((id) => configuredIds.has(id));
    if (!matchedUniverseId) continue;

    const configuredId = configuredGames.get(matchedUniverseId)!;
    const descriptor = gameAssetDescriptor(
      { gameId: configuredId, gamepassIds: [], badgeIds: [] },
      lookup,
    );
    const existing = totals.get(matchedUniverseId);
    totals.set(matchedUniverseId, {
      game: descriptor.game,
      gameId: descriptor.gameId,
      imageUrl: descriptor.imageUrl,
      amount: (existing?.amount ?? 0) + Math.abs(amount),
    });
  }

  return Array.from(totals.values());
}

async function getDonationStats(
  userId: number,
  headers: Record<string, string>,
  gameIds: number[],
  configuredLookup: GameLookup,
) {
  const [yearSummary, allTimeSummary] = await Promise.all([
    makeRequest(
      `${ROBLOX_TRANSACTIONS}/${userId}/transaction-totals?timeFrame=Year&transactionType=summary`,
      headers,
    ),
    makeRequest(
      `${ROBLOX_TRANSACTIONS}/${userId}/transaction-totals?timeFrame=AllTime&transactionType=summary`,
      headers,
    ),
  ]);

  const donateYear = yearSummary.status === 200
    ? purchaseTotal(yearSummary.data)
    : null;
  let donateAllTime = allTimeSummary.status === 200
    ? purchaseTotal(allTimeSummary.data)
    : null;
  const transactions = donateAllTime === null || gameIds.length
    ? await getPurchaseTransactions(userId, headers)
    : [];

  if (donateAllTime === null && transactions.length) {
    donateAllTime = transactions.reduce<number>(
      (sum, transaction) => sum + transactionAmount(transaction),
      0,
    );
  }

  const placeIds = transactions
    .map((item) => firstNumber(
      getPath(item, "details", "place", "placeId"),
      getPath(item, "details", "placeId"),
      getPath(item, "placeId"),
    ))
    .filter((value): value is number => value !== null);
  const lookup = placeIds.length
    ? await getGameLookup(gameIds, placeIds)
    : configuredLookup;

  return {
    donateYear,
    donateAllTime,
    ingameDonate: gameDonationsFromTransactions(transactions, gameIds, lookup),
  };
}

function screentimeEntries(payload: unknown): Array<{ id: number; minutes: number }> {
  const source = getPath(payload, "universeWeeklyScreentimes")
    ?? getPath(payload, "data", "universeWeeklyScreentimes")
    ?? getPath(payload, "data")
    ?? {};

  if (Array.isArray(source)) {
    return source
      .map((value) => ({
        id: firstNumber(
          getPath(value, "universeId"),
          getPath(value, "id"),
          getPath(value, "universe", "id"),
        ),
        minutes: firstNumber(
          getPath(value, "weeklyMinutes"),
          getPath(value, "minutes"),
          getPath(value, "minute"),
          getPath(value, "durationMinutes"),
          getPath(value, "screenTime"),
          getPath(value, "screenTimeMinutes"),
          getPath(value, "weeklyScreenTime"),
          getPath(value, "screentime"),
          getPath(value, "value"),
        ),
      }))
      .filter((item): item is { id: number; minutes: number } =>
        item.id !== null && item.minutes !== null,
      );
  }

  const record = asRecord(source);
  if (!record) return [];
  return Object.entries(record)
    .map(([id, value]) => ({
      id: firstNumber(id, getPath(value, "universeId"), getPath(value, "id")),
      minutes: firstNumber(
        value,
        getPath(value, "weeklyMinutes"),
        getPath(value, "minutes"),
        getPath(value, "minute"),
        getPath(value, "durationMinutes"),
        getPath(value, "screenTime"),
        getPath(value, "screenTimeMinutes"),
        getPath(value, "weeklyScreenTime"),
        getPath(value, "screentime"),
        getPath(value, "value"),
      ),
    }))
    .filter((item): item is { id: number; minutes: number } =>
      item.id !== null && item.minutes !== null,
    );
}

async function getPlaytimeStats(
  headers: Record<string, string>,
  gameIds: number[],
  lookup: GameLookup,
) {
  if (!gameIds.length) return [];
  const response = await makeRequest(ROBLOX_SCREENTIME, headers);
  if (response.status !== 200) return [];

  const configuredUniverses = new Set(
    gameIds.map((id) => lookup.placeToUniverse.get(idKey(id)) ?? idKey(id)),
  );
  const totals = new Map<string, { game: string; gameId: number; imageUrl?: string; minutes: number }>();
  for (const entry of screentimeEntries(response.data)) {
    if (!configuredUniverses.has(idKey(entry.id))) continue;
    const gameId = Number(entry.id);
    const game = lookup.names.get(idKey(entry.id)) ?? `Game ${entry.id}`;
    const existing = totals.get(idKey(entry.id));
    totals.set(idKey(entry.id), {
      game,
      gameId,
      imageUrl: lookup.images.get(idKey(entry.id)),
      minutes: (existing?.minutes ?? 0) + entry.minutes,
    });
  }
  return Array.from(totals.values());
}

function cardList(payload: unknown) {
  return arrayFromPayload(payload).map((value) => {
    const item = asRecord(value) ?? {};
    const paymentMethod = asRecord(item.paymentMethod) ?? {};
    const brand = item.brand
      ?? item.cardBrand
      ?? item.type
      ?? paymentMethod.brand
      ?? "Card";
    const last4 = item.last4
      ?? item.lastFour
      ?? item.lastFourDigits
      ?? paymentMethod.last4
      ?? paymentMethod.lastFour;
    return {
      brand: String(brand),
      maskedIdentifier: last4 ? `•••• ${String(last4).slice(-4)}` : "••••",
    };
  });
}

async function checkFullAccount(
  cookie: unknown,
  inputGameIds: unknown = [],
  inputGameChecks: unknown = [],
) {
  const validation = await checkSingleCookie(cookie);
  if (!validation.valid) return validation;

  const userId = validation.userId;
  const headers = cookieHeaders(cookie as string);
  const gameIds = normalizeGameIds(inputGameIds);
  const gameChecks = normalizeGameChecks(inputGameChecks);
  const lookupIds = normalizeGameIds([
    ...gameIds,
    ...gameChecks.map((config) => config.gameId),
  ]);
  const [
    currency,
    settings,
    cards,
    korblox,
    headless,
    badgeList,
    billing,
    groupStats,
    rap,
    gameLookup,
  ] = await Promise.all([
    makeRequest(ROBLOX_CURRENCY, headers),
    makeRequest(ROBLOX_SETTINGS, headers),
    makeRequest(ROBLOX_CARDS, headers),
    makeRequest(`${ROBLOX_INVENTORY}/${userId}/items/1/192`, headers),
    makeRequest(`${ROBLOX_INVENTORY}/${userId}/items/1/201`, headers),
    getUserBadges(userId, headers),
    makeRequest(ROBLOX_CREDIT, headers),
    getGroupStats(userId, headers),
    getRap(userId, headers),
    getGameLookup(lookupIds),
  ]);
  const [donationStats, playtime, gamepassesByGame] = await Promise.all([
    getDonationStats(userId, headers, gameIds, gameLookup),
    getPlaytimeStats(headers, gameIds, gameLookup),
    getGamepassesByGame(userId, headers, gameChecks, gameLookup),
  ]);
  const badgesByGame = getBadgesByGame(badgeList, gameChecks, gameLookup);

  return {
    ...validation,
    balance: currency.status === 200
      ? asNumber(getPath(currency.data, "robux"))
      : null,
    premium: settings.status === 200
      ? asBoolean(getPath(settings.data, "isPremium"))
      : null,
    cards: cards.status === 200 ? cardList(cards.data) : [],
    korblox: assetExists(korblox),
    headless: assetExists(headless),
    badges: badgeList.length,
    badgesByGame,
    gamepassesByGame,
    billing: billing.status === 200
      ? asNumberOrString(getPath(billing.data, "nextPurchasableRobux"))
      : null,
    rap,
    donateYear: donationStats.donateYear,
    donateAllTime: donationStats.donateAllTime,
    ingameDonate: donationStats.ingameDonate,
    playtime,
    groupBalance: groupStats.groupBalance,
    ownedGroups: groupStats.ownedGroups,
  };
}

async function runWithConcurrency<T, R>(
  items: T[],
  concurrency: number,
  callback: (item: T) => Promise<R>,
): Promise<R[]> {
  const results = new Array<R>(items.length);
  let nextIndex = 0;
  const workers = Array.from(
    { length: Math.min(concurrency, items.length) },
    async () => {
      while (true) {
        const index = nextIndex;
        nextIndex += 1;
        if (index >= items.length) return;
        results[index] = await callback(items[index]);
      }
    },
  );
  await Promise.all(workers);
  return results;
}

export async function checkCookiesBatch(
  cookies: string[],
  gameIds: unknown = [],
  gameChecks: unknown = [],
) {
  const start = Date.now();
  const results = await runWithConcurrency(
    cookies,
    2,
    (cookie) => checkFullAccount(cookie, gameIds, gameChecks),
  );
  const complete = results.filter(
    (result) => asRecord(result)?.valid === true,
  ).length;
  return {
    ok: true,
    total: results.length,
    complete,
    failed: results.length - complete,
    elapsed: `${Date.now() - start}ms`,
    results,
  };
}

export async function checkCookieFull(
  cookie: unknown,
  gameIds: unknown = [],
  gameChecks: unknown = [],
) {
  return checkFullAccount(cookie, gameIds, gameChecks);
}

export async function checkCookiesBasic(cookies: string[]) {
  const start = Date.now();
  const results = await runWithConcurrency(cookies, 5, checkSingleCookie);
  const valid = results.filter((result) => result.valid).length;
  return {
    ok: true,
    total: results.length,
    valid,
    invalid: results.length - valid,
    elapsed: `${Date.now() - start}ms`,
    results,
  };
}

export async function refreshCookie(cookie: unknown) {
  const validation = await checkSingleCookie(cookie);
  if (!validation.valid) return validation;

  const headers = cookieHeaders(cookie as string);
  const [currency, settings, cards, korblox, headless] = await Promise.all([
    makeRequest(ROBLOX_CURRENCY, headers),
    makeRequest(ROBLOX_SETTINGS, headers),
    makeRequest(ROBLOX_CARDS, headers),
    makeRequest(`${ROBLOX_INVENTORY}/${validation.userId}/items/1/192`, headers),
    makeRequest(`${ROBLOX_INVENTORY}/${validation.userId}/items/1/201`, headers),
  ]);

  return {
    ...validation,
    balance: currency.status === 200
      ? asNumber(getPath(currency.data, "robux"))
      : null,
    premium: settings.status === 200
      ? asBoolean(getPath(settings.data, "isPremium"))
      : null,
    cards: cards.status === 200 ? cardList(cards.data) : [],
    korblox: assetExists(korblox),
    headless: assetExists(headless),
  };
}

export async function refreshCookiesBatch(cookies: string[]) {
  const start = Date.now();
  const results = await runWithConcurrency(cookies, 3, refreshCookie);
  const refreshed = results.filter(
    (result) => asRecord(result)?.valid === true,
  ).length;
  return {
    ok: true,
    total: results.length,
    refreshed,
    failed: results.length - refreshed,
    elapsed: `${Date.now() - start}ms`,
    results,
  };
}
