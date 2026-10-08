import { useEffect, useMemo, useRef, useState, type ComponentType, type DragEvent, type MouseEvent, type ReactNode } from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { getCurrentWindow } from '@tauri-apps/api/window';
import { ErrorBoundary } from '@/components/error-boundary';
import {
  checkCookiesViaApi,
  refreshCookiesViaApi,
  validateCookiesViaApi,
  type CookieCheckResponse,
  type CookieRunResponse,
  type GameCheckConfig,
  type ValidateMode,
} from '@/lib/cookie-checker-api';
import { extractRobloxCookies } from '@/lib/cookie-file-parser';
import { Toaster } from '@/components/ui/toaster';
import { TooltipProvider } from '@/components/ui/tooltip';
import {
  BadgeCheck,
  ArrowLeft,
  ArrowRight,
  Activity,
  BarChart3,
  Clock3,
  CheckSquare,
  CheckCircle2,
  ChevronDown,
  Cookie,
  Copy,
  Coins,
  CreditCard,
  Download,
  FileText,
  Gift,
  Crown,
  Globe2,
  IdCard,
  LayoutDashboard,
  LoaderCircle,
  Maximize2,
  Minimize2,
  Minus,
  Plus,
  Play,
  RefreshCw,
  RotateCcw,
  Settings2,
  ShieldUser,
  ShieldOff,
  ShieldCheck,
  Link2,
  Trash2,
  TrendingUp,
  Unlock,
  Upload,
  UsersRound,
  WalletCards,
  X,
  type LucideIcon,
} from 'lucide-react';

const queryClient = new QueryClient();

type View = 'dashboard' | 'settings' | 'looter' | 'auto-cookie' | 'cookie-checker' | 'validator' | 'refresher';
const GAME_IDS_STORAGE_KEY = 'multi-tool-cookie-checker-game-ids';
const GAME_CHECKS_STORAGE_KEY = 'multi-tool-cookie-checker-game-checks';

function loadGameIds() {
  if (typeof window === 'undefined') return [];

  try {
    const stored = JSON.parse(window.localStorage.getItem(GAME_IDS_STORAGE_KEY) || '[]');
    return Array.isArray(stored)
      ? stored.filter((value): value is string => typeof value === 'string' && /^\d+$/.test(value))
      : [];
  } catch {
    return [];
  }
}

function loadGameChecks(): GameCheckConfig[] {
  if (typeof window === 'undefined') return [];

  try {
    const stored = JSON.parse(window.localStorage.getItem(GAME_CHECKS_STORAGE_KEY) || '[]');
    if (!Array.isArray(stored)) return [];

    return stored.flatMap((value): GameCheckConfig[] => {
      if (!value || typeof value !== 'object') return [];
      const gameId = Number(value.gameId);
      if (!Number.isSafeInteger(gameId) || gameId <= 0) return [];
      const normalizeIds = (ids: unknown) => Array.isArray(ids)
        ? Array.from(new Set(ids
          .map(Number)
          .filter((id) => Number.isSafeInteger(id) && id > 0)))
        : [];

      return [{
        gameId,
        gamepassIds: normalizeIds(value.gamepassIds),
        badgeIds: normalizeIds(value.badgeIds),
      }];
    });
  } catch {
    return [];
  }
}

function normalizeGameIds(value: string) {
  return value
    .split(/[\s,;]+/)
    .map((item) => item.trim())
    .filter((item) => /^\d+$/.test(item) && Number(item) > 0)
    .filter((item, index, items) => items.indexOf(item) === index);
}

function isTauriRuntime() {
  return typeof window !== 'undefined' && '__TAURI_INTERNALS__' in window;
}

function BrandName({ className = '' }: { className?: string }) {
  return (
    <span className={className}>
      Mult<span className="brand-i">i</span>
      <span className="text-primary"> Tool</span>
    </span>
  );
}

const modeOptions: { name: string; description: string; icon: LucideIcon }[] = [
  { name: 'Cookie Checker', description: 'В работе', icon: CheckSquare },
  { name: 'Passport Generator', description: 'В работе', icon: IdCard },
  { name: 'Vbiv', description: 'В работе', icon: CreditCard },
  { name: 'Validator', description: 'В работе', icon: BadgeCheck },
  { name: 'Refresher', description: 'В работе', icon: RefreshCw },
  { name: 'Duplicator', description: 'В работе', icon: Copy },
  { name: 'Bypasser', description: 'В работе', icon: ShieldOff },
];

function TwinHammerIcon({ size = 28 }: { size?: number }) {
  return (
    <svg
      aria-hidden="true"
      className="shrink-0"
      fill="none"
      height={size}
      viewBox="0 0 24 24"
      width={size}
      xmlns="http://www.w3.org/2000/svg"
    >
      <path
        d="M4.5 18V6h2.35l3.15 4.15L13.15 6h2.35v12H13V10.8l-3 3.8-3-3.8V18H4.5Z"
        fill="currentColor"
      />
      <path d="M16.25 6H20v2.35h-1.35V18h-2.4V8.35h0V6Z" fill="currentColor" />
    </svg>
  );
}

function FunpayIcon({ size = 18 }: { size?: number }) {
  return (
    <svg aria-hidden="true" height={size} viewBox="0 0 24 24" width={size} xmlns="http://www.w3.org/2000/svg">
      <rect fill="#3f86df" height="18" rx="2.5" width="18" x="3" y="3" />
      <path d="M8 7h8v2.35h-5.15v1.45h4.45v2.25h-4.45V17H8V7Z" fill="#fff" />
    </svg>
  );
}

function MoneyBagIcon({
  size = 18,
  strokeWidth = 1.8,
  className = '',
}: {
  size?: number;
  strokeWidth?: number;
  className?: string;
}) {
  return (
    <svg
      aria-hidden="true"
      className={className}
      fill="none"
      height={size}
      viewBox="0 0 24 24"
      width={size}
      xmlns="http://www.w3.org/2000/svg"
    >
      <path d="M9.25 5.8h5.5l-.85-2.3h-3.8l-.85 2.3Z" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth={strokeWidth} />
      <path d="M12 5.8c-4.15 0-7 2.8-7 7.2 0 4.45 2.45 7.2 7 7.2s7-2.75 7-7.2c0-4.4-2.85-7.2-7-7.2Z" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth={strokeWidth} />
      <path d="M9.55 12.05c.3-.75 1.02-1.15 2.05-1.15h.7c1.08 0 1.8.48 1.8 1.2 0 .76-.62 1.18-1.72 1.4l-.76.15c-1.15.22-1.72.72-1.72 1.5 0 .82.77 1.4 1.98 1.4h.27c1.1 0 1.82-.4 2.12-1.15" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth={strokeWidth} />
      <path d="M12 10.35v6.4" stroke="currentColor" strokeLinecap="round" strokeWidth={strokeWidth} />
    </svg>
  );
}

function CrackedShieldCheckIcon({
  size = 19,
  strokeWidth = 1.8,
  className = '',
}: {
  size?: number;
  strokeWidth?: number;
  className?: string;
}) {
  return (
    <svg
      aria-hidden="true"
      className={className}
      fill="none"
      height={size}
      viewBox="0 0 24 24"
      width={size}
      xmlns="http://www.w3.org/2000/svg"
    >
      <path
        d="M12 3.2 19 6v5.3c0 4.45-2.65 7.85-7 9.5-4.35-1.65-7-5.05-7-9.5V6l7-2.8Z"
        stroke="currentColor"
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={strokeWidth}
      />
      <path
        d="m8.8 12.1 2.1 2.1 4.35-4.35"
        stroke="currentColor"
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={strokeWidth}
      />
      <path
        d="m12.7 3.5-.85 3.3 1.25 2-1.45 2.45 1.25 2.25-.75 3.25"
        stroke="currentColor"
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={strokeWidth}
      />
    </svg>
  );
}

const bypasserOptions: {
  name: string;
  description: string;
  icon: ComponentType<{ size?: number; strokeWidth?: number; className?: string }>;
}[] = [
  { name: 'IP Lock Bypass', description: 'В работе', icon: Unlock },
  { name: 'Verified Age Bypass', description: 'В работе', icon: CrackedShieldCheckIcon },
  { name: 'Account Bypass', description: 'В работе', icon: ShieldUser },
  { name: 'Get Link', description: 'В работе', icon: Link2 },
];

function WindowControls({
  isExpanded,
  onMinimize,
  onMaximize,
  onClose,
}: {
  isExpanded: boolean;
  onMinimize: () => void;
  onMaximize: () => void;
  onClose: () => void;
}) {
  return (
    <div className="flex items-center gap-1.5" aria-label="Window controls">
      <button
        type="button"
        data-testid="button-window-close"
        onClick={onClose}
        className="group flex h-6 w-6 items-center justify-center rounded-md border border-[#6c3930] bg-[#3a2422] text-[#dc806f] transition-colors hover:bg-[#542d29]"
        aria-label="Close window"
      >
        <X size={13} strokeWidth={2.2} />
      </button>
      <button
        type="button"
        data-testid="button-window-minimize"
        onClick={onMinimize}
        className="group flex h-6 w-6 items-center justify-center rounded-md border border-[#454952] bg-[#292d34] text-[#b8bdc5] transition-colors hover:bg-[#363b44]"
        aria-label="Minimize window"
      >
        <Minus size={13} strokeWidth={2.2} />
      </button>
      <button
        type="button"
        data-testid="button-window-maximize"
        onClick={onMaximize}
        className="group flex h-6 w-6 items-center justify-center rounded-md border border-[#454952] bg-[#292d34] text-[#b8bdc5] transition-colors hover:bg-[#363b44]"
        aria-label={isExpanded ? 'Restore window size' : 'Maximize window'}
      >
        {isExpanded ? (
          <Minimize2 size={13} strokeWidth={2.2} />
        ) : (
          <Maximize2 size={13} strokeWidth={2.2} />
        )}
      </button>
    </div>
  );
}

function NavItem({
  active,
  icon: Icon,
  label,
  onClick,
}: {
  active: boolean;
  icon: ComponentType<{ size?: number; strokeWidth?: number; className?: string }>;
  label: string;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      data-testid={`button-nav-${label.toLowerCase()}`}
      onClick={onClick}
      className={`group flex min-h-10 w-full items-center gap-2.5 rounded-lg px-3 text-left text-[12px] font-semibold transition-all duration-200 ${
        active
          ? 'bg-[#30241e] text-[#f5c394] border-l-2 border-primary'
          : 'text-[#777c87] hover:bg-[#1d2026] hover:text-[#d8d4ce]'
      }`}
      aria-current={active ? 'page' : undefined}
    >
      <Icon
        size={16}
        strokeWidth={active ? 2.2 : 1.8}
        className={active ? 'text-primary' : 'text-[#626873] group-hover:text-[#aaaeb4]'}
      />
      {label}
    </button>
  );
}

function StartScreen() {
  return (
    <div className="flex min-h-full flex-1 items-center justify-center overflow-hidden bg-[#17191f] px-6">
      <div className="brand-intro text-center">
        <div className="mx-auto mb-5 flex h-16 w-16 items-center justify-center rounded-[20px] bg-primary text-primary-foreground">
          <TwinHammerIcon size={34} />
        </div>
        <h1 className="text-[clamp(2.6rem,7vw,4.8rem)] font-extrabold leading-none tracking-[-.035em] text-[#f0ebe3]">
          <BrandName />
        </h1>
      </div>
    </div>
  );
}

function DashboardView() {
  return (
    <div className="flex min-h-full flex-1 items-center justify-center bg-[#17191f]" aria-label="Dashboard view">
      <div className="tab-view translate-y-14 text-center">
        <div className="mx-auto mb-5 flex h-16 w-16 items-center justify-center rounded-[20px] bg-primary text-primary-foreground">
          <TwinHammerIcon size={34} />
        </div>
        <h1 className="text-[clamp(2.4rem,6vw,4.5rem)] font-extrabold leading-none tracking-[-.035em] text-[#f0ebe3]">
          <BrandName />
        </h1>
      </div>
    </div>
  );
}

function SettingsView({
  gameIds,
  onGameIdsChange,
  gameChecks,
  onGameChecksChange,
}: {
  gameIds: string[];
  onGameIdsChange: (gameIds: string[]) => void;
  gameChecks: GameCheckConfig[];
  onGameChecksChange: (gameChecks: GameCheckConfig[]) => void;
}) {
  const [draft, setDraft] = useState('');
  const [notice, setNotice] = useState<string | null>(null);
  const [assetGameIdDraft, setAssetGameIdDraft] = useState('');
  const [gamepassIdsDraft, setGamepassIdsDraft] = useState('');
  const [badgeIdsDraft, setBadgeIdsDraft] = useState('');
  const [assetNotice, setAssetNotice] = useState<string | null>(null);

  const addGameIds = () => {
    const nextIds = normalizeGameIds(draft);
    if (!nextIds.length) {
      setNotice('Введи один или несколько числовых ID игр.');
      return;
    }

    onGameIdsChange(Array.from(new Set([...gameIds, ...nextIds])));
    setDraft('');
    setNotice(null);
  };

  const addGameCheck = () => {
    const [gameId] = normalizeGameIds(assetGameIdDraft);
    const gamepassIds = normalizeGameIds(gamepassIdsDraft);
    const badgeIds = normalizeGameIds(badgeIdsDraft);
    if (!gameId) {
      setAssetNotice('Введи числовой ID игры.');
      return;
    }
    if (!gamepassIds.length && !badgeIds.length) {
      setAssetNotice('Добавь хотя бы один ID Game Pass или бейджа.');
      return;
    }

    const existing = gameChecks.find((item) => item.gameId === Number(gameId));
    if (!existing && gameChecks.length >= 100) {
      setAssetNotice('Можно настроить проверки максимум для 100 игр.');
      return;
    }
    const mergedGamepassIds = Array.from(new Set([
      ...(existing?.gamepassIds ?? []),
      ...gamepassIds.map(Number),
    ]));
    const mergedBadgeIds = Array.from(new Set([
      ...(existing?.badgeIds ?? []),
      ...badgeIds.map(Number),
    ]));
    if (mergedGamepassIds.length > 50 || mergedBadgeIds.length > 100) {
      setAssetNotice('Для одной игры можно указать максимум 50 Game Pass и 100 бейджей.');
      return;
    }
    const next = {
      gameId: Number(gameId),
      gamepassIds: mergedGamepassIds,
      badgeIds: mergedBadgeIds,
    };
    onGameChecksChange([
      ...gameChecks.filter((item) => item.gameId !== next.gameId),
      next,
    ]);
    setAssetGameIdDraft('');
    setGamepassIdsDraft('');
    setBadgeIdsDraft('');
    setAssetNotice(null);
  };

  return (
    <div className="tab-view min-h-full flex-1 overflow-auto bg-[#17191f] p-4 text-[#e7e2da] sm:p-6" aria-label="Settings view">
      <div className="mx-auto max-w-[860px]">
        <div className="mb-5 flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl border border-[#624129] bg-[#2b211b] text-primary">
            <Settings2 size={18} />
          </div>
          <div>
            <h1 className="text-base font-bold text-[#f0ebe3]">Настройки</h1>
            <p className="mt-1 text-[11px] text-[#777c87]">Параметры Cookie Checker сохраняются только в этом браузере</p>
          </div>
        </div>

        <section className="rounded-2xl border border-[#3c3028] bg-[#191a1f] p-4 shadow-[0_0_34px_rgba(255,138,36,.06)] sm:p-5">
          <div className="flex items-start justify-between gap-3">
            <div>
              <h2 className="text-[13px] font-bold text-[#e5ddd5]">Игры для аналитики</h2>
              <p className="mt-1 max-w-[640px] text-[10px] leading-relaxed text-[#817a74]">
                Укажи ID игры: universe ID для PlayTime или root place/place ID для донатов.
                Названия игр подгружаются автоматически через Roblox API.
              </p>
            </div>
            <span className="shrink-0 rounded-full border border-[#4b3425] bg-[#241c17] px-2 py-1 text-[9px] font-bold text-[#c28d61]">
              {gameIds.length} ID
            </span>
          </div>

          <div className="mt-4 flex flex-col gap-2 sm:flex-row">
            <input
              type="text"
              inputMode="numeric"
              value={draft}
              onChange={(event) => {
                setDraft(event.target.value);
                if (notice) setNotice(null);
              }}
              onKeyDown={(event) => {
                if (event.key === 'Enter') addGameIds();
              }}
              placeholder="Например: 1818 или 1818, 920587237"
              className="h-10 min-w-0 flex-1 rounded-lg border border-[#363b44] bg-[#23262d] px-3 text-[12px] font-semibold text-[#ded9d1] outline-none placeholder:text-[#777c87] focus:border-primary focus:ring-1 focus:ring-[#ff8a24]/30"
              aria-label="ID игр"
            />
            <button
              type="button"
              onClick={addGameIds}
              className="inline-flex h-10 items-center justify-center gap-2 rounded-lg bg-primary px-4 text-[11px] font-bold text-primary-foreground transition-colors hover:bg-[#e87b3f]"
            >
              <Plus size={15} /> Добавить
            </button>
          </div>

          {notice && <div className="mt-2 text-[10px] text-[#e2aa82]">{notice}</div>}

          {gameIds.length > 0 ? (
            <div className="mt-4 space-y-2">
              {gameIds.map((gameId) => (
                <div key={gameId} className="flex items-center gap-3 rounded-xl border border-[#332c28] bg-[#1e1d20] px-3 py-2.5">
                  <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border border-[#624129] bg-[#2b211b] text-[10px] font-bold text-primary">
                    ID
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="font-mono text-[12px] font-bold text-[#e2d9d1]">{gameId}</div>
                    <div className="mt-0.5 text-[9px] text-[#746b64]">Проверяется в PlayTime и InGame Donate</div>
                  </div>
                  <button
                    type="button"
                    onClick={() => onGameIdsChange(gameIds.filter((item) => item !== gameId))}
                    className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-[#777080] transition-colors hover:bg-[#30232a] hover:text-[#ed8c8c]"
                    aria-label={`Удалить игру ${gameId}`}
                  >
                    <Trash2 size={14} />
                  </button>
                </div>
              ))}
              <button
                type="button"
                onClick={() => onGameIdsChange([])}
                className="mt-1 text-[10px] font-semibold text-[#a99eb0] transition-colors hover:text-[#ed8c8c]"
              >
                Очистить список
              </button>
            </div>
          ) : (
            <div className="mt-4 rounded-xl border border-dashed border-[#403832] bg-[#1d1b1d] px-4 py-6 text-center">
              <div className="text-[11px] font-bold text-[#b8aaa0]">Игры ещё не добавлены</div>
              <div className="mt-1 text-[9px] text-[#6e655e]">Добавь ID, чтобы получить названия, донаты и игровое время</div>
            </div>
          )}
        </section>

        <section className="mt-4 rounded-2xl border border-[#3c3028] bg-[#191a1f] p-4 shadow-[0_0_34px_rgba(255,138,36,.04)] sm:p-5">
          <div className="flex items-start justify-between gap-3">
            <div>
              <h2 className="text-[13px] font-bold text-[#e5ddd5]">Game Pass и бейджи по играм</h2>
              <p className="mt-1 max-w-[640px] text-[10px] leading-relaxed text-[#817a74]">
                Добавь ID игры и ID предметов, как в конфигурациях Shine Checker. Сервер проверит владение Game Pass и найденные бейджи этой игры.
              </p>
            </div>
            <span className="shrink-0 rounded-full border border-[#4b3425] bg-[#241c17] px-2 py-1 text-[9px] font-bold text-[#c28d61]">
              {gameChecks.length} игр
            </span>
          </div>

          <div className="mt-4 grid gap-2 sm:grid-cols-2">
            <input
              type="text"
              inputMode="numeric"
              value={assetGameIdDraft}
              onChange={(event) => setAssetGameIdDraft(event.target.value)}
              placeholder="ID игры"
              aria-label="ID игры для проверки Game Pass и бейджей"
              className="h-10 min-w-0 rounded-lg border border-[#363b44] bg-[#23262d] px-3 text-[11px] text-[#ded9d1] outline-none placeholder:text-[#777c87] focus:border-primary"
            />
            <input
              type="text"
              inputMode="numeric"
              value={gamepassIdsDraft}
              onChange={(event) => setGamepassIdsDraft(event.target.value)}
              placeholder="ID Game Pass через запятую"
              aria-label="ID Game Pass"
              className="h-10 min-w-0 rounded-lg border border-[#363b44] bg-[#23262d] px-3 text-[11px] text-[#ded9d1] outline-none placeholder:text-[#777c87] focus:border-primary"
            />
            <input
              type="text"
              inputMode="numeric"
              value={badgeIdsDraft}
              onChange={(event) => setBadgeIdsDraft(event.target.value)}
              placeholder="ID бейджей через запятую"
              aria-label="ID бейджей"
              className="h-10 min-w-0 rounded-lg border border-[#363b44] bg-[#23262d] px-3 text-[11px] text-[#ded9d1] outline-none placeholder:text-[#777c87] focus:border-primary"
            />
            <button
              type="button"
              onClick={addGameCheck}
              className="inline-flex h-10 items-center justify-center gap-2 rounded-lg bg-primary px-4 text-[11px] font-bold text-primary-foreground transition-colors hover:bg-[#e87b3f]"
            >
              <Plus size={15} /> Добавить проверки
            </button>
          </div>

          {assetNotice && <div className="mt-2 text-[10px] text-[#e2aa82]">{assetNotice}</div>}

          {gameChecks.length > 0 ? (
            <div className="mt-4 space-y-2">
              {gameChecks.map((check) => (
                <div key={check.gameId} className="flex items-center gap-3 rounded-xl border border-[#332c28] bg-[#1e1d20] px-3 py-2.5">
                  <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border border-[#624129] bg-[#2b211b] text-primary">
                    <BadgeCheck size={15} />
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="font-mono text-[11px] font-bold text-[#e2d9d1]">Игра {check.gameId}</div>
                    <div className="mt-0.5 text-[9px] text-[#746b64]">
                      {check.gamepassIds.length} Game Pass · {check.badgeIds.length} ID бейджей
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => onGameChecksChange(gameChecks.filter((item) => item.gameId !== check.gameId))}
                    className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-[#777080] transition-colors hover:bg-[#30232a] hover:text-[#ed8c8c]"
                    aria-label={`Удалить проверки игры ${check.gameId}`}
                  >
                    <Trash2 size={14} />
                  </button>
                </div>
              ))}
            </div>
          ) : (
            <div className="mt-4 rounded-xl border border-dashed border-[#403832] bg-[#1d1b1d] px-4 py-5 text-center text-[10px] text-[#817a74]">
              Настрой проверки Game Pass и бейджей для игр, которые нужно включить.
            </div>
          )}
        </section>
      </div>
    </div>
  );
}

function LooterView() {
  return (
    <div className="flex min-h-full flex-1 items-center justify-center bg-[#17191f]" aria-label="Looter view">
      <div className="tab-view translate-y-10 text-center">
        <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl border border-[#3a3e46] bg-[#24272e] text-[#858b96]">
          <MoneyBagIcon size={27} strokeWidth={1.7} />
        </div>
        <h1 className="text-xl font-bold text-[#d8d4ce]">Looter</h1>
        <p className="mt-2 text-sm text-[#777c87]">Раздел находится в разработке</p>
      </div>
    </div>
  );
}

function AutoCookieView() {
  return (
    <div className="flex min-h-full flex-1 items-center justify-center bg-[#17191f]" aria-label="Auto Cookie view">
      <div className="tab-view translate-y-8 text-center">
        <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl border border-[#2f5950] bg-[#1d3934]">
          <FunpayIcon size={29} />
        </div>
        <h1 className="text-xl font-bold text-[#d8d4ce]">Auto Cookie</h1>
        <p className="mt-2 text-sm text-[#777c87]">Раздел находится в разработке</p>
      </div>
    </div>
  );
}

type CookieFileSummary = {
  name: string;
  total: number;
  valid: number;
  invalid: number;
  duplicates: number;
  cookies: string[];
};

async function inspectCookieFile(file: File): Promise<CookieFileSummary> {
  const contents = await file.text();
  return { name: file.name, ...extractRobloxCookies(contents) };
}

type CheckRunStatus = 'idle' | 'checking' | 'success' | 'error';

function CookieRunView({
  files,
  mode,
}: {
  files: CookieFileSummary[];
  mode: ValidateMode;
}) {
  const isValidate = mode === 'validate';
  const allCookies = useMemo(() => files.flatMap((file) => file.cookies), [files]);
  const cookies = useMemo(() => Array.from(new Set(allCookies)), [allCookies]);
  const duplicateCount = allCookies.length - cookies.length;
  const fileCount = files.length;

  const [status, setStatus] = useState<CheckRunStatus>('idle');
  const [result, setResult] = useState<CookieRunResponse | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!cookies.length) {
      setStatus('idle');
      setResult(null);
      setError(null);
      return;
    }

    const controller = new AbortController();
    setStatus('checking');
    setResult(null);
    setError(null);

    const run = isValidate
      ? validateCookiesViaApi(cookies, controller.signal)
      : refreshCookiesViaApi(cookies, controller.signal);

    run
      .then((nextResult) => {
        setResult(nextResult);
        setStatus('success');
      })
      .catch((cause: unknown) => {
        if (cause instanceof DOMException && cause.name === 'AbortError') return;
        setStatus('error');
        setError(cause instanceof Error ? cause.message : 'Не удалось получить ответ от API сервера.');
      });

    return () => controller.abort();
  }, [cookies, isValidate]);

  const accounts = result?.results ?? [];
  const validCount = accounts.filter((account) => account.valid).length;
  const invalidCount = accounts.length - validCount;

  const progressTotal = result?.total ?? cookies.length;
  const progressDone = result?.passed ?? 0;
  const progress = progressTotal > 0
    ? Math.min(100, Math.round((progressDone / progressTotal) * 100))
    : 0;

  const statusLabel = status === 'checking'
    ? 'Проверка cookie через сервер'
    : status === 'success'
      ? 'Проверка завершена'
      : status === 'error'
        ? 'Ошибка запроса'
        : 'Ожидание запуска';

  const title = isValidate ? 'Validator' : 'Refresher';
  const subtitle = 'Проверка cookie на валидность';

  const stats = [
    { label: 'Valid', value: validCount, icon: ShieldCheck, accent: 'text-[#7de5b4]' },
    { label: 'Invalid', value: invalidCount, icon: ShieldOff, accent: 'text-[#ed8c8c]' },
    { label: 'Duplicates', value: duplicateCount, icon: Copy, accent: 'text-[#f5c394]' },
    { label: 'Total', value: result?.total ?? cookies.length, icon: Cookie, accent: 'text-[#8fb8ff]' },
  ];

  return (
    <div
      className="tab-view min-h-full flex-1 overflow-auto bg-[#17191f] p-4 text-[#e7e2da] sm:p-6"
      aria-label={title}
    >
      <div className="mx-auto max-w-[1180px]">
        <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl border border-[#624129] bg-[#2b211b] text-primary">
              {isValidate ? <BadgeCheck size={18} /> : <RefreshCw size={18} />}
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-base font-bold text-[#f0ebe3]">{title}</h1>
                <span className="rounded-full border border-[#5b421e] bg-[#302515] px-2 py-0.5 text-[9px] font-bold uppercase tracking-[.08em] text-[#f5c394]">
                  Node API
                </span>
              </div>
              <p className="mt-1 text-[11px] text-[#777c87]">
                {subtitle} · {fileCount} {fileCount === 1 ? 'файл' : 'файла'} · {cookies.length} в очереди
              </p>
            </div>
          </div>
        </div>

        <section className="relative overflow-hidden rounded-2xl border border-[#3c3028] bg-[#191a1f] p-4 shadow-[0_0_34px_rgba(255,138,36,.08)] sm:p-5">
          <div className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-[#ff8a24] to-transparent opacity-80" />
          <div className="grid gap-4 lg:grid-cols-[190px_1fr] lg:items-center">
            <div className="flex items-center gap-4 lg:flex-col lg:justify-center">
              <div className="relative flex h-28 w-28 shrink-0 items-center justify-center rounded-full border border-[#ff8a24] bg-[#2b2018] shadow-[0_0_30px_rgba(255,138,36,.2)]">
                <div className="absolute inset-2 rounded-full border border-[#ffad65]/30" />
                <div className="text-center">
                  <div className="text-3xl font-black text-[#ede4f7]">{progress}%</div>
                  <div className="mt-1 text-[9px] font-bold uppercase tracking-[.18em] text-[#ad8769]">готово</div>
                </div>
              </div>
              <div className="lg:text-center">
                <div className="text-[11px] font-bold text-[#e1d1c4]">{statusLabel}</div>
                <div className="mt-1 text-[10px] text-[#68616f]">
                  {status === 'error'
                    ? error
                    : 'Cookie не отображаются и не сохраняются в интерфейсе'}
                </div>
              </div>
            </div>

            <div className="grid gap-2 sm:grid-cols-3">
              {[
                { label: 'Результат', value: result?.elapsed ?? (status === 'checking' ? '...' : '—'), icon: Activity },
                { label: 'Обработано', value: `${progressDone} / ${progressTotal}`, icon: CheckCircle2 },
                { label: 'Готово', value: `${progress}%`, icon: LoaderCircle },
              ].map(({ label, value, icon: Icon }, index) => (
                <div key={label} className={`rise-in-delay-${index} rounded-xl border border-[#332c28] bg-[#1e1d20] px-3 py-3`}>
                  <div className="flex items-center gap-2 text-[10px] font-bold uppercase tracking-[.1em] text-[#8f8178]">
                    <Icon size={14} className={index === 2 && status === 'checking' ? 'animate-spin text-primary' : 'text-primary'} />
                    {label}
                  </div>
                  <div className="mt-2 font-mono text-xl font-bold text-[#e8e1ee]">{value}</div>
                </div>
              ))}
            </div>
          </div>
        </section>

        <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {stats.map(({ label, value, icon: Icon, accent }) => (
            <div key={label} className="rise-in rounded-xl border border-[#332c28] bg-[#1b1b1f] px-4 py-4">
              <Icon size={17} className={accent} />
              <div className="mt-3 font-mono text-2xl font-bold text-[#e9e3ec]">{value}</div>
              <div className="mt-1 text-[9px] font-bold uppercase tracking-[.14em] text-[#777080]">{label}</div>
            </div>
          ))}
        </div>

        <section className="mt-6">
          <div className="mb-3 flex items-center gap-2.5">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg border border-[#624129] bg-[#2b211b] text-primary">
              <UsersRound size={16} />
            </div>
            <div>
              <h2 className="text-[12px] font-bold text-[#e5ddd5]">Аккаунты</h2>
              <p className="mt-0.5 text-[10px] text-[#77716b]">
                {accounts.length ? `${accounts.length} записей` : 'Ожидание ответа сервера'}
              </p>
            </div>
          </div>

          {accounts.length === 0 ? (
            <div className="rounded-xl border border-dashed border-[#403832] bg-[#1d1b1d] px-4 py-5 text-center text-[10px] text-[#817a74]">
              Добавь cookie-файл в меню режимов, чтобы запустить {title.toLowerCase()}.
            </div>
          ) : (
            <div className="grid gap-2 sm:grid-cols-2">
              {accounts.map((account, index) => (
                <div
                  key={`${account.userId ?? 'unknown'}-${index}`}
                  className={`rise-in rounded-xl border px-3.5 py-3 ${
                    account.valid
                      ? 'border-[#2f4a3d] bg-[#18211d]'
                      : 'border-[#4a2f2f] bg-[#211919]'
                  }`}
                >
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex min-w-0 items-center gap-2">
                      <div className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-lg ${
                        account.valid
                          ? 'bg-[#1f3a2e] text-[#7de5b4]'
                          : 'bg-[#3a1f1f] text-[#ed8c8c]'
                      }`}>
                        {account.valid ? <ShieldCheck size={14} /> : <ShieldOff size={14} />}
                      </div>
                      <div className="min-w-0">
                        <div className="truncate text-[12px] font-bold text-[#e4ded6]">
                          {account.username ?? 'Неизвестный аккаунт'}
                        </div>
                        <div className="truncate text-[10px] text-[#77716b]">
                          {account.displayName ?? '—'}
                        </div>
                      </div>
                    </div>
                    <div className="shrink-0 text-right">
                      <div className="font-mono text-[10px] text-[#8c8272]">
                        {account.userId ?? '—'}
                      </div>
                      <div className={`text-[9px] font-bold uppercase tracking-[.1em] ${
                        account.valid ? 'text-[#7de5b4]' : 'text-[#ed8c8c]'
                      }`}>
                        {account.valid ? 'valid' : 'invalid'}
                      </div>
                    </div>
                  </div>

                  {account.valid && (
                    <div className="mt-2.5 border-t border-[#2a3a32] pt-2.5">
                      <span className="rounded-md border border-[#2f4a3d] bg-[#1b2a23] px-2 py-0.5 text-[9px] font-semibold text-[#a8d8c1]">
                        Cookie действителен
                      </span>
                    </div>
                  )}

                  {!account.valid && account.error && (
                    <div className="mt-2.5 border-t border-[#4a2f2f] pt-2.5 text-[10px] text-[#ed9c9c]">
                      {account.error}
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </section>
      </div>
    </div>
  );
}

function CookieCheckerView({
  files,
  gameIds,
  gameChecks,
}: {
  files: CookieFileSummary[];
  gameIds: string[];
  gameChecks: GameCheckConfig[];
}) {
  const allCookies = useMemo(() => files.flatMap((file) => file.cookies), [files]);
  const cookies = useMemo(() => Array.from(new Set(allCookies)), [allCookies]);
  const total = cookies.length;
  const fileCount = files.length;
  const [status, setStatus] = useState<'idle' | 'checking' | 'success' | 'error'>('idle');
  const [result, setResult] = useState<CookieCheckResponse | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!cookies.length) {
      setStatus('idle');
      setResult(null);
      setError(null);
      return;
    }

    const controller = new AbortController();
    setStatus('checking');
    setResult(null);
    setError(null);

    checkCookiesViaApi(cookies, controller.signal, gameIds, gameChecks)
      .then((nextResult) => {
        setResult(nextResult);
        setStatus('success');
      })
      .catch((cause: unknown) => {
        if (cause instanceof DOMException && cause.name === 'AbortError') return;
        setStatus('error');
        setError(cause instanceof Error ? cause.message : 'Не удалось получить ответ от API сервера.');
      });

    return () => controller.abort();
  }, [cookies, gameIds, gameChecks]);

  const checkedAccounts = result?.results ?? [];
  const validCount = checkedAccounts.filter((account) => account.valid).length;
  const invalidCount = checkedAccounts.length - validCount;
  const bannedCount = checkedAccounts.filter((account) =>
    /ban|blocked|suspend/i.test(account.error ?? ''),
  ).length;
  const duplicateCount = allCookies.length - cookies.length;
  const progressTotal = result?.total ?? total;
  const progressComplete = result?.complete ?? 0;
  const progress = progressTotal > 0
    ? Math.min(100, Math.round((progressComplete / progressTotal) * 100))
    : 0;
  const sumNumber = (values: Array<number | null | undefined>) =>
    values.reduce<number>((sum, value) => sum + (typeof value === 'number' ? value : 0), 0);
  const robux = sumNumber(checkedAccounts.map((account) => account.balance));
  const donated = sumNumber(checkedAccounts.map((account) => account.donateAllTime));
  const rap = sumNumber(checkedAccounts.map((account) => account.rap));
  const billing = sumNumber(
    checkedAccounts.map((account) =>
      typeof account.billing === 'number' ? account.billing : null,
    ),
  );
  const premium = checkedAccounts.filter((account) => account.premium === true).length;
  const cards = sumNumber(
    checkedAccounts.map((account) =>
      typeof account.cards === 'number'
        ? account.cards
        : Array.isArray(account.cards)
          ? account.cards.length
          : 0,
    ),
  );
  const groupBalance = sumNumber(checkedAccounts.map((account) => account.groupBalance));
  const badges = sumNumber(checkedAccounts.map((account) => account.badges));
  const groups = checkedAccounts.reduce(
    (sum, account) => sum + (account.ownedGroups?.length ?? 0),
    0,
  );
  const ownedGroupRows = checkedAccounts.flatMap((account) =>
    (account.ownedGroups ?? []).map((group) => ({
      ...group,
      username: account.username || account.displayName || 'Неизвестный аккаунт',
    })),
  );
  const korblox = checkedAccounts.filter((account) => account.korblox === true).length;
  const headless = checkedAccounts.filter((account) => account.headless === true).length;
  const donationRows = checkedAccounts.flatMap((account) =>
    (account.ingameDonate ?? []).map((donation) => ({
      ...donation,
      username: donation.username || account.username || account.displayName || 'Неизвестный аккаунт',
    })),
  );
  const playtimeRows = checkedAccounts.flatMap((account) =>
    (account.playtime ?? []).map((entry) => ({
      ...entry,
      username: entry.username || account.username || account.displayName || 'Неизвестный аккаунт',
    })),
  );
  const gamepassRows = checkedAccounts.flatMap((account) =>
    (account.gamepassesByGame ?? []).map((entry) => ({
      ...entry,
      username: account.username || account.displayName || 'Неизвестный аккаунт',
    })),
  );
  const gameBadgeRows = checkedAccounts.flatMap((account) =>
    (account.badgesByGame ?? []).map((entry) => ({
      ...entry,
      username: account.username || account.displayName || 'Неизвестный аккаунт',
    })),
  );
  const ownedGamepasses = gamepassRows.reduce((sum, entry) => sum + entry.items.length, 0);
  const matchedGameBadges = gameBadgeRows.reduce((sum, entry) => sum + entry.items.length, 0);
  const ingameDonated = sumNumber(donationRows.map((donation) => donation.amount));
  const totalPlaytime = sumNumber(playtimeRows.map((entry) => entry.minutes));
  const statusLabel = status === 'checking'
    ? 'Проверка через сервер'
    : status === 'success'
      ? 'Проверка завершена'
      : status === 'error'
        ? 'Ошибка проверки'
        : 'Ожидание запуска';

  const stats = [
    { label: 'Valid', value: validCount, icon: ShieldCheck, accent: 'text-[#7de5b4]' },
    { label: 'Invalid', value: invalidCount, icon: ShieldOff, accent: 'text-[#ed8c8c]' },
    { label: 'Banned', value: bannedCount, icon: BanIcon, accent: 'text-[#f5c394]' },
    { label: 'Duplicates', value: duplicateCount, icon: Copy, accent: 'text-[#f5c394]' },
  ];

  const details = [
    { label: 'Robux', value: robux, icon: Coins },
    { label: 'Donated', value: donated, icon: Gift },
    { label: 'RAP', value: rap, icon: TrendingUp },
    { label: 'Billing', value: billing, icon: CreditCard },
    { label: 'Premium', value: premium, icon: Crown },
    { label: 'Cards', value: cards, icon: WalletCards },
    { label: 'Badges', value: badges, icon: BadgeCheck },
    { label: 'Game Pass', value: ownedGamepasses, icon: Unlock },
    { label: 'GBALANCE', value: groupBalance, icon: WalletCards },
    { label: 'Groups', value: groups, icon: UsersRound },
    { label: 'KORBLOX', value: korblox, icon: ShieldCheck },
    { label: 'HEADLESS', value: headless, icon: ShieldUser },
  ];

  return (
    <div className="tab-view min-h-full flex-1 overflow-auto bg-[#17191f] p-4 text-[#e7e2da] sm:p-6" aria-label="Cookie checker">
      <div className="mx-auto max-w-[1180px]">
        <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl border border-[#624129] bg-[#2b211b] text-primary">
              <Activity size={18} />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-base font-bold text-[#f0ebe3]">Cookie Check</h1>
                <span className="rounded-full border border-[#5b421e] bg-[#302515] px-2 py-0.5 text-[9px] font-bold uppercase tracking-[.08em] text-[#f5c394]">
                  Node API
                </span>
              </div>
              <p className="mt-1 text-[11px] text-[#777c87]">
                {fileCount} {fileCount === 1 ? 'файл' : 'файла'} · {total} строк в очереди
              </p>
            </div>
          </div>
          <button
            type="button"
            disabled
            className="inline-flex items-center gap-2 rounded-lg border border-[#38313f] bg-[#1c1921] px-3 py-2 text-[11px] font-bold text-[#777c87]"
          >
            <RotateCcw size={14} /> Отменить
          </button>
        </div>

        <section className="relative overflow-hidden rounded-2xl border border-[#3c3028] bg-[#191a1f] p-4 shadow-[0_0_34px_rgba(255,138,36,.08)] sm:p-5">
          <div className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-[#ff8a24] to-transparent opacity-80" />
          <div className="grid gap-4 lg:grid-cols-[190px_1fr] lg:items-center">
            <div className="flex items-center gap-4 lg:flex-col lg:justify-center">
              <div className="relative flex h-28 w-28 shrink-0 items-center justify-center rounded-full border border-[#ff8a24] bg-[#2b2018] shadow-[0_0_30px_rgba(255,138,36,.2)]">
                <div className="absolute inset-2 rounded-full border border-[#ffad65]/30" />
                <div className="text-center">
                  <div className="text-3xl font-black text-[#ede4f7]">{progress}%</div>
                  <div className="mt-1 text-[9px] font-bold uppercase tracking-[.18em] text-[#ad8769]">готово</div>
                </div>
              </div>
              <div className="lg:text-center">
                <div className="text-[11px] font-bold text-[#e1d1c4]">{statusLabel}</div>
                <div className="mt-1 text-[10px] text-[#68616f]">
                  {status === 'error' ? error : 'Cookie не отображаются и не сохраняются в интерфейсе'}
                </div>
              </div>
            </div>

            <div className="grid gap-2 sm:grid-cols-3">
              {[
                { label: 'Результат', value: result?.elapsed ?? (status === 'checking' ? '...' : '—'), icon: Activity },
                { label: 'Проверено', value: `${progressComplete} / ${progressTotal}`, icon: CheckCircle2 },
                { label: 'Готово', value: `${progress}%`, icon: LoaderCircle },
              ].map(({ label, value, icon: Icon }, index) => (
                <div key={label} className={`rise-in-delay-${index} rounded-xl border border-[#332c28] bg-[#1e1d20] px-3 py-3`}>
                  <div className="flex items-center gap-2 text-[10px] font-bold uppercase tracking-[.1em] text-[#8f8178]">
                    <Icon size={14} className={index === 2 && status === 'checking' ? 'animate-spin text-primary' : 'text-primary'} />
                    {label}
                  </div>
                  <div className="mt-2 font-mono text-xl font-bold text-[#e8e1ee]">{value}</div>
                </div>
              ))}
            </div>
          </div>
          <div className="checker-wave mt-5 h-8 rounded-lg border-y border-[#4b3425] bg-[#211912]" aria-hidden="true">
            <div className="checker-wave-line" />
          </div>
        </section>

        <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {stats.map(({ label, value, icon: Icon, accent }) => (
            <div key={label} className="rise-in rounded-xl border border-[#332c28] bg-[#1b1b1f] px-4 py-4">
              <Icon size={17} className={accent} />
              <div className="mt-3 font-mono text-2xl font-bold text-[#e9e3ec]">{value}</div>
              <div className="mt-1 text-[9px] font-bold uppercase tracking-[.14em] text-[#777080]">{label}</div>
            </div>
          ))}
        </div>

        <div className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-5">
          {details.map(({ label, value, icon: Icon }) => (
            <div key={label} className="rounded-xl border border-[#332c28] bg-[#1b1b1f] px-3 py-3 transition-colors hover:border-[#68452d]">
              <div className="flex items-center gap-2 text-[9px] font-bold uppercase tracking-[.12em] text-[#8c7d73]">
                <Icon size={13} className="text-primary" />
                {label}
              </div>
              <div className="mt-2 font-mono text-lg font-bold text-[#e2d9d1]">{value}</div>
            </div>
          ))}
        </div>

        <section className="mt-6">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-2.5">
              <div className="flex h-8 w-8 items-center justify-center rounded-lg border border-[#624129] bg-[#2b211b] text-primary">
                <BarChart3 size={16} />
              </div>
              <div>
                <h2 className="text-[12px] font-bold text-[#e5ddd5]">Игровая аналитика</h2>
                <p className="mt-0.5 text-[10px] text-[#77716b]">InGame Donate, PlayTime и другие показатели</p>
              </div>
            </div>
            <span className="rounded-full border border-[#4b3425] bg-[#241c17] px-2 py-1 text-[9px] font-bold text-[#c28d61]">{validCount} valid</span>
          </div>

          <div className="mt-3 grid gap-3 lg:grid-cols-2">
            <div className="relative min-h-[190px] overflow-hidden rounded-2xl border border-[#3b2e27] bg-[#17181c] p-4">
              <div className="pointer-events-none absolute inset-y-0 right-0 w-1/2 bg-gradient-to-l from-[#2a1d15]/50 to-transparent" />
              <div className="relative flex items-start justify-between gap-3">
                <div className="flex items-center gap-2.5">
                  <div className="flex h-9 w-9 items-center justify-center rounded-xl border border-[#6b4428] bg-[#2d2119] text-primary">
                    <Gift size={17} />
                  </div>
                  <div>
                    <h3 className="text-[11px] font-bold text-[#e3d9d0]">InGame Donate</h3>
                    <p className="mt-0.5 text-[9px] text-[#786f68]">Донаты на выбранные игры</p>
                  </div>
                </div>
                <div className="text-right">
                  <div className="font-mono text-lg font-bold text-primary">{ingameDonated.toLocaleString()} R$</div>
                  <div className="text-[8px] uppercase tracking-[.12em] text-[#746b64]">всего</div>
                </div>
              </div>
              <div className="relative mt-3 max-h-[190px] space-y-2 overflow-auto pr-1">
                {donationRows.length > 0 ? (
                  donationRows.map((donation, index) => (
                    <div
                      key={`${donation.game}-${donation.username}-${index}`}
                      className="flex items-center justify-between gap-3 rounded-lg border border-[#332b24] bg-[#1d1a1b] px-3 py-2"
                    >
                      <div className="flex min-w-0 items-center gap-2.5">
                        {donation.imageUrl ? (
                          <img
                            src={donation.imageUrl}
                            alt={`${donation.game} icon`}
                            loading="lazy"
                            referrerPolicy="no-referrer"
                            className="h-9 w-9 shrink-0 rounded-lg object-cover"
                          />
                        ) : (
                          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-[#2b211b] text-primary">
                            <Gift size={15} />
                          </div>
                        )}
                        <div className="min-w-0">
                          <div className="truncate text-[10px] font-semibold text-[#d8cec5]">{donation.username}</div>
                          <div className="mt-0.5 truncate text-[9px] text-[#796f68]">{donation.game}</div>
                        </div>
                      </div>
                      <span className="shrink-0 font-mono text-[11px] font-bold text-primary">
                        {donation.amount.toLocaleString()} R$
                      </span>
                    </div>
                  ))
                ) : (
                  <div className="flex h-[100px] flex-col items-center justify-center text-center">
                    <Gift size={22} className="mb-2 text-[#79553c]" />
                    <div className="text-[10px] font-bold text-[#b8aaa0]">Нет данных InGame Donate</div>
                    <div className="mt-1 max-w-[260px] text-[9px] leading-relaxed text-[#6e655e]">
                      Добавь ID игр в настройках, чтобы получить донаты
                    </div>
                  </div>
                )}
              </div>
            </div>

            <div className="relative min-h-[190px] overflow-hidden rounded-2xl border border-[#3b2e27] bg-[#17181c] p-4">
              <div className="pointer-events-none absolute inset-y-0 right-0 w-1/2 bg-gradient-to-l from-[#2a1d15]/50 to-transparent" />
              <div className="relative flex items-start justify-between gap-3">
                <div className="flex items-center gap-2.5">
                  <div className="flex h-9 w-9 items-center justify-center rounded-xl border border-[#6b4428] bg-[#2d2119] text-primary">
                    <Clock3 size={17} />
                  </div>
                  <div>
                    <h3 className="text-[11px] font-bold text-[#e3d9d0]">PlayTime</h3>
                    <p className="mt-0.5 text-[9px] text-[#786f68]">Активность по игровому времени</p>
                  </div>
                </div>
                <div className="text-right">
                  <div className="font-mono text-lg font-bold text-primary">{totalPlaytime.toLocaleString()} мин</div>
                  <div className="text-[8px] uppercase tracking-[.12em] text-[#746b64]">всего</div>
                </div>
              </div>
              <div className="relative mt-3 max-h-[190px] space-y-2 overflow-auto pr-1">
                {playtimeRows.length > 0 ? (
                  playtimeRows.map((entry, index) => (
                    <div
                      key={`${entry.game}-${entry.username}-${index}`}
                      className="flex items-center justify-between gap-3 rounded-lg border border-[#332b24] bg-[#1d1a1b] px-3 py-2"
                    >
                      <div className="flex min-w-0 items-center gap-2.5">
                        {entry.imageUrl ? (
                          <img
                            src={entry.imageUrl}
                            alt={`${entry.game} icon`}
                            loading="lazy"
                            referrerPolicy="no-referrer"
                            className="h-9 w-9 shrink-0 rounded-lg object-cover"
                          />
                        ) : (
                          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-[#2b211b] text-primary">
                            <Clock3 size={15} />
                          </div>
                        )}
                        <div className="min-w-0">
                          <div className="truncate text-[10px] font-semibold text-[#d8cec5]">{entry.username}</div>
                          <div className="mt-0.5 truncate text-[9px] text-[#796f68]">{entry.game}</div>
                        </div>
                      </div>
                      <span className="shrink-0 font-mono text-[11px] font-bold text-primary">
                        {entry.minutes.toLocaleString()} мин
                      </span>
                    </div>
                  ))
                ) : (
                  <div className="flex h-[100px] flex-col items-center justify-center text-center">
                    <Clock3 size={22} className="mb-2 text-[#79553c]" />
                    <div className="text-[10px] font-bold text-[#b8aaa0]">Нет данных PlayTime</div>
                    <div className="mt-1 max-w-[260px] text-[9px] leading-relaxed text-[#6e655e]">
                      Добавь universe ID игры в настройках, чтобы получить PlayTime
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        </section>

        {(gamepassRows.length > 0 || gameBadgeRows.length > 0) && (
          <div className="mt-3 grid gap-3 lg:grid-cols-2">
            {gamepassRows.length > 0 && (
              <section className="rounded-2xl border border-[#3b2e27] bg-[#17181c] p-4">
                <div className="flex items-center justify-between gap-3">
                  <div className="flex items-center gap-2.5">
                    <div className="flex h-9 w-9 items-center justify-center rounded-xl border border-[#6b4428] bg-[#2d2119] text-primary">
                      <Unlock size={16} />
                    </div>
                    <div>
                      <h3 className="text-[11px] font-bold text-[#e3d9d0]">Game Pass</h3>
                      <p className="mt-0.5 text-[9px] text-[#786f68]">Купленные пропуски по настройкам игры</p>
                    </div>
                  </div>
                  <span className="font-mono text-sm font-bold text-primary">{ownedGamepasses}</span>
                </div>
                <div className="mt-3 max-h-[260px] space-y-2 overflow-auto pr-1">
                  {gamepassRows.map((entry, index) => (
                    <div key={`${entry.gameId}-${entry.username}-${index}`} className="rounded-lg border border-[#332b24] bg-[#1d1a1b] px-3 py-2.5">
                      <div className="flex items-center gap-2.5">
                        {entry.imageUrl ? (
                          <img src={entry.imageUrl} alt={`${entry.game} icon`} loading="lazy" referrerPolicy="no-referrer" className="h-9 w-9 shrink-0 rounded-lg object-cover" />
                        ) : (
                          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-[#2b211b] text-primary"><Unlock size={15} /></div>
                        )}
                        <div className="min-w-0 flex-1">
                          <div className="truncate text-[10px] font-semibold text-[#d8cec5]">{entry.username}</div>
                          <div className="truncate text-[9px] text-[#796f68]">{entry.game}</div>
                        </div>
                        <span className="text-[9px] text-[#9a8f87]">{entry.items.length} найдено</span>
                      </div>
                      {entry.items.length > 0 ? (
                        <div className="mt-2 flex flex-wrap gap-1.5">
                          {entry.items.map((item) => (
                            <span key={item.id} className="rounded-md border border-[#4b3425] bg-[#241c17] px-2 py-1 text-[9px] text-[#d4b28e]">{item.name}</span>
                          ))}
                        </div>
                      ) : (
                        <div className="mt-2 text-[9px] text-[#6e655e]">Указанные Game Pass не найдены</div>
                      )}
                    </div>
                  ))}
                </div>
              </section>
            )}

            {gameBadgeRows.length > 0 && (
              <section className="rounded-2xl border border-[#3b2e27] bg-[#17181c] p-4">
                <div className="flex items-center justify-between gap-3">
                  <div className="flex items-center gap-2.5">
                    <div className="flex h-9 w-9 items-center justify-center rounded-xl border border-[#6b4428] bg-[#2d2119] text-primary">
                      <BadgeCheck size={16} />
                    </div>
                    <div>
                      <h3 className="text-[11px] font-bold text-[#e3d9d0]">Бейджи по играм</h3>
                      <p className="mt-0.5 text-[9px] text-[#786f68]">По ID бейджа или создателю игры</p>
                    </div>
                  </div>
                  <span className="font-mono text-sm font-bold text-primary">{matchedGameBadges}</span>
                </div>
                <div className="mt-3 max-h-[260px] space-y-2 overflow-auto pr-1">
                  {gameBadgeRows.map((entry, index) => (
                    <div key={`${entry.gameId}-${entry.username}-${index}`} className="rounded-lg border border-[#332b24] bg-[#1d1a1b] px-3 py-2.5">
                      <div className="flex items-center gap-2.5">
                        {entry.imageUrl ? (
                          <img src={entry.imageUrl} alt={`${entry.game} icon`} loading="lazy" referrerPolicy="no-referrer" className="h-9 w-9 shrink-0 rounded-lg object-cover" />
                        ) : (
                          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-[#2b211b] text-primary"><BadgeCheck size={15} /></div>
                        )}
                        <div className="min-w-0 flex-1">
                          <div className="truncate text-[10px] font-semibold text-[#d8cec5]">{entry.username}</div>
                          <div className="truncate text-[9px] text-[#796f68]">{entry.game}</div>
                        </div>
                        <span className="text-[9px] text-[#9a8f87]">{entry.items.length} найдено</span>
                      </div>
                      {entry.items.length > 0 ? (
                        <div className="mt-2 flex flex-wrap gap-1.5">
                          {entry.items.map((item) => (
                            <span key={item.id} className="rounded-md border border-[#4b3425] bg-[#241c17] px-2 py-1 text-[9px] text-[#d4b28e]">{item.name}</span>
                          ))}
                        </div>
                      ) : (
                        <div className="mt-2 text-[9px] text-[#6e655e]">Указанные бейджи не найдены</div>
                      )}
                    </div>
                  ))}
                </div>
              </section>
            )}
          </div>
        )}

        {ownedGroupRows.length > 0 && (
          <section className="mt-4 rounded-2xl border border-[#292832] bg-[#15151a] p-4">
            <div className="flex items-center gap-2">
              <UsersRound size={16} className="text-primary" />
              <div>
                <span className="text-[11px] font-bold text-[#c9c0d1]">Группы во владении аккаунтов</span>
                <p className="mt-0.5 text-[10px] text-[#756c80]">Только группы, где аккаунт является владельцем</p>
              </div>
            </div>
            <div className="mt-3 grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
              {ownedGroupRows.map((group, index) => (
                <div
                  key={`${group.id}-${group.username}-${index}`}
                  className="rounded-xl border border-[#302b37] bg-[#1b1920] px-3 py-2.5"
                >
                  <div className="truncate text-[11px] font-semibold text-[#ddd4e4]">{group.name}</div>
                  <div className="mt-0.5 truncate text-[10px] text-[#756c80]">
                    {group.username}{group.role ? ` · ${group.role}` : ''}
                  </div>
                </div>
              ))}
            </div>
          </section>
        )}

        {result && (
          <section className="mt-4 rounded-2xl border border-[#292832] bg-[#15151a] p-4">
            <div className="flex items-center justify-between gap-3">
              <div className="flex items-center gap-2">
                <ShieldCheck size={16} className="text-primary" />
                 <span className="text-[11px] font-bold text-[#c9c0d1]">Результаты проверки</span>
              </div>
              <span className="text-[10px] text-[#777080]">
                {result.complete} успешно · {result.failed} с ошибкой
              </span>
            </div>
            <div className="mt-3 space-y-2">
              {result.results.slice(0, 100).map((account, index) => (
                <div
                  key={`${account.userId ?? 'row'}-${index}`}
                  className="flex items-center justify-between gap-3 rounded-xl border border-[#302b37] bg-[#1b1920] px-3 py-2.5"
                >
                  <div className="min-w-0">
                    <div className="truncate text-[11px] font-semibold text-[#ddd4e4]">
                      {account.username || account.displayName || (account.userId ? `User ${account.userId}` : `Строка ${index + 1}`)}
                    </div>
                    <div className="mt-0.5 text-[10px] text-[#756c80]">
                      {account.userId ? `ID ${account.userId}` : account.error || 'Без дополнительной информации'}
                    </div>
                  </div>
                  <span className={`shrink-0 rounded-full border px-2 py-1 text-[9px] font-bold ${
                    account.valid
                      ? 'border-[#2c644b] bg-[#172d25] text-[#7de5b4]'
                      : 'border-[#633838] bg-[#2a1b1f] text-[#ed8c8c]'
                  }`}>
                    {account.valid ? 'VALID' : 'INVALID'}
                  </span>
                </div>
              ))}
              {result.results.length > 100 && (
                <div className="text-center text-[10px] text-[#756c80]">
                  Показаны первые 100 результатов
                </div>
              )}
            </div>
          </section>
        )}

        <section className="mt-4 rounded-2xl border border-[#292832] bg-[#15151a] p-4">
          <div className="flex items-center gap-2">
            <FileText size={16} className="text-primary" />
            <span className="text-[11px] font-bold text-[#c9c0d1]">Файлы в очереди</span>
          </div>
          <div className="mt-3 flex flex-wrap gap-2">
            {files.map((file) => (
              <span key={`${file.name}-${file.total}`} className="rounded-lg border border-[#322b3c] bg-[#1b1820] px-3 py-2 text-[10px] text-[#9f96a8]">
                {file.name} · {file.valid} valid
              </span>
            ))}
          </div>
        </section>
      </div>
    </div>
  );
}

function BanIcon({ size = 18, className = '' }: { size?: number; className?: string }) {
  return <span className={`inline-flex items-center justify-center text-current ${className}`} style={{ fontSize: size }}>⊘</span>;
}

function PlaceholderAction({
  icon: Icon,
  label,
  accent = false,
}: {
  icon: LucideIcon;
  label: string;
  accent?: boolean;
}) {
  return (
    <button
      type="button"
      disabled
      className={`flex min-h-11 w-full cursor-not-allowed items-center justify-center gap-2 rounded-lg border px-4 text-[12px] font-bold ${
        accent
          ? 'border-primary/50 bg-primary text-primary-foreground shadow-[0_0_18px_rgba(255,138,36,.14)]'
          : 'border-[#363b44] bg-[#23262d] text-[#d8d4ce]'
      }`}
    >
      <Icon size={16} strokeWidth={2} />
      {label}
      <span className="ml-1 text-[10px] font-medium opacity-60">В работе</span>
    </button>
  );
}

function ExportCookieAction() {
  return <PlaceholderAction icon={Download} label="Export Cookie" />;
}

function AccountsCardsPanel() {
  return (
    <div className="rounded-xl border border-[#d86f2b]/70 bg-gradient-to-br from-[#a84b18] via-[#c86822] to-[#8e3d18] px-3.5 py-3 shadow-[0_0_24px_rgba(255,138,36,.18)]">
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-2 text-[11px] font-bold text-[#fff0df]">
          <WalletCards size={16} strokeWidth={1.8} />
          Accounts Cards
        </div>
        <div className="flex items-center gap-1.5">
          <span className="flex h-5 w-8 items-center justify-center rounded-[3px] border border-white/25 bg-[#f4f1ec]">
            <span className="relative flex h-3 w-4 items-center justify-center">
              <span className="absolute left-0 h-3 w-3 rounded-full bg-[#ef4444]" />
              <span className="absolute right-0 h-3 w-3 rounded-full bg-[#f59e0b] mix-blend-multiply" />
            </span>
          </span>
          <span className="flex h-5 w-8 items-center justify-center rounded-[3px] border border-white/25 bg-[#f4f1ec] text-[6px] font-black italic text-[#2758a5]">
            VISA
          </span>
          <span className="flex h-5 w-8 items-center justify-center rounded-[3px] border border-white/25 bg-[#f4f1ec]">
            <span className="relative flex h-3 w-4 items-center justify-center">
              <span className="absolute left-0 h-3 w-3 rounded-full bg-[#3b82f6]" />
              <span className="absolute right-0 h-3 w-3 rounded-full bg-[#ef4444] mix-blend-multiply" />
            </span>
          </span>
        </div>
      </div>
    </div>
  );
}

function SelectField({
  label,
  value,
  onChange,
  options,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  options: string[];
}) {
  return (
    <label className="block">
      <span className="mb-1.5 block text-[11px] font-semibold text-[#a7acb5]">{label}</span>
      <span className="relative block">
        <select
          value={value}
          onChange={(event) => onChange(event.target.value)}
          className="h-10 w-full appearance-none rounded-lg border border-[#363b44] bg-[#23262d] px-3 pr-9 text-[12px] font-semibold text-[#e1ddd6] outline-none transition-colors focus:border-primary"
        >
          {options.map((option) => (
            <option key={option} value={option}>
              {option}
            </option>
          ))}
        </select>
        <ChevronDown className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-[#888f9a]" size={15} />
      </span>
    </label>
  );
}

function TextInputField({ label, placeholder }: { label: string; placeholder: string }) {
  return (
    <label className="block">
      <span className="mb-1.5 block text-[11px] font-semibold text-[#a7acb5]">{label}</span>
      <input
        type="text"
        placeholder={placeholder}
        className="h-10 w-full rounded-lg border border-primary bg-[#292c32] px-3 text-[12px] font-semibold text-[#ded9d1] outline-none placeholder:text-[#777c87] focus:border-[#ffad65] focus:ring-1 focus:ring-[#ff8a24]/30"
      />
    </label>
  );
}

function MenuActionStack({ children }: { children: ReactNode }) {
  return <div className="space-y-3 p-4">{children}</div>;
}

function ModeMenu({
  onClose,
  onStartCookieCheck,
  onStartCookieRun,
}: {
  onClose: () => void;
  onStartCookieCheck: (files: CookieFileSummary[]) => void;
  onStartCookieRun: (mode: ValidateMode, files: CookieFileSummary[]) => void;
}) {
  const [activeMenu, setActiveMenu] = useState<
    | 'modes'
    | 'bypasser'
    | 'cookie-checker'
    | 'vbiv'
    | 'refresher'
    | 'validator'
    | 'duplicator'
    | 'passport'
    | 'ip-lock'
    | 'verified-age'
    | 'account'
    | 'account-advanced'
    | 'get-link'
  >('modes');
  const [passportType, setPassportType] = useState('Смена данных');
  const [country, setCountry] = useState('Россия');
  const [age, setAge] = useState('13+');
  const [accountType, setAccountType] = useState('13+');
  const [accountTwoFactor, setAccountTwoFactor] = useState('Authenticator');
  const [linkType, setLinkType] = useState('Passport');
  const [linkTwoFactor, setLinkTwoFactor] = useState('2FA');
  const [advancedFunction, setAdvancedFunction] = useState('Поставить 9-12 (Face)');
  const [advancedTwoFactor, setAdvancedTwoFactor] = useState('No 2FA');
  const [cookieFiles, setCookieFiles] = useState<CookieFileSummary[]>([]);
  const [isInspectingCookies, setIsInspectingCookies] = useState(false);
  const [cookieNotice, setCookieNotice] = useState<string | null>(null);
  const cookieInputRef = useRef<HTMLInputElement>(null);
  const isModesMenu = activeMenu === 'modes';
  const isBypasserMenu = activeMenu === 'bypasser';
  const isTallMenu = !isModesMenu && !isBypasserMenu;
  const title = isModesMenu
    ? 'Выберите режим'
    : isBypasserMenu
      ? 'Bypasser'
        : activeMenu === 'cookie-checker'
          ? 'Cookie Checker'
      : activeMenu === 'passport'
        ? 'Passport Generator'
        : activeMenu === 'ip-lock'
          ? 'IP Lock Bypass'
          : activeMenu === 'verified-age'
            ? 'Verified Age Bypass'
            : activeMenu === 'account'
              ? 'Account Bypass'
              : activeMenu === 'account-advanced'
                ? 'Дополнительно'
                : activeMenu === 'get-link'
                  ? 'Get Link'
        : activeMenu[0].toUpperCase() + activeMenu.slice(1);

  const openMenu = (name: string) => {
    if (name === 'Bypasser') setActiveMenu('bypasser');
    if (name === 'Cookie Checker') setActiveMenu('cookie-checker');
    if (name === 'Vbiv') setActiveMenu('vbiv');
    if (name === 'Refresher') setActiveMenu('refresher');
    if (name === 'Validator') setActiveMenu('validator');
    if (name === 'Duplicator') setActiveMenu('duplicator');
    if (name === 'Passport Generator') setActiveMenu('passport');
  };

  const inspectFiles = async (files: File[]) => {
    const textExtensions = /\.(txt|log|csv|json|jsonl|har|html?|xml|md|cookies?)$/i;
    const textMimeTypes = new Set([
      'application/json',
      'application/ld+json',
      'application/xml',
      'application/csv',
      'application/x-ndjson',
      'application/x-jsonlines',
    ]);
    const textFiles = files.filter((file) =>
      file.type.startsWith('text/') || textMimeTypes.has(file.type) || textExtensions.test(file.name)
    );
    if (!textFiles.length) {
      setCookieNotice('Выбери текстовый файл с cookie: например .txt, .json, .csv или .log.');
      return;
    }

    const maxFileSize = 10 * 1024 * 1024;
    const tooLarge = textFiles.filter((file) => file.size > maxFileSize);
    const filesToInspect = textFiles.filter((file) => file.size <= maxFileSize);
    const notices: string[] = [];
    if (tooLarge.length) notices.push(`${tooLarge.length} файл(а) больше лимита 10 МБ и пропущены.`);
    if (files.length > textFiles.length) notices.push(`${files.length - textFiles.length} нетекстовый файл пропущен.`);

    if (!filesToInspect.length) {
      setCookieNotice(notices.join(' '));
      return;
    }

    setCookieNotice(notices.length ? notices.join(' ') : null);
    setIsInspectingCookies(true);
    try {
      const summaries = await Promise.all(filesToInspect.map((file) => inspectCookieFile(file)));
      setCookieFiles((current) => [...current, ...summaries]);
    } catch {
      setCookieNotice('Не удалось прочитать текстовый файл.');
    } finally {
      setIsInspectingCookies(false);
    }
  };

  const renderCookieFiles = (mode: 'check' | ValidateMode) => {
    const isCheck = mode === 'check';
    const validCount = cookieFiles.reduce((sum, file) => sum + file.valid, 0);
    const totalCount = cookieFiles.reduce((sum, file) => sum + file.total, 0);
    const invalidCount = cookieFiles.reduce((sum, file) => sum + file.invalid, 0);
    const duplicateCount = cookieFiles.reduce((sum, file) => sum + file.duplicates, 0);
    const canStart = validCount > 0 && !isInspectingCookies;
    const startLabel = isCheck
      ? 'Запустить проверку'
      : mode === 'validate'
        ? 'Запустить валидацию'
        : 'Запустить обновление';
    const hintLabel = isCheck
      ? 'Cookie автоматически извлекаются из текста'
      : 'Cookie проверяются на валидность через API';

    const handleDrop = (event: DragEvent<HTMLDivElement>) => {
      event.preventDefault();
      void inspectFiles(Array.from(event.dataTransfer.files));
    };

    return (
      <div className="space-y-3 p-4">
        <div
          role="button"
          tabIndex={0}
          onClick={() => cookieInputRef.current?.click()}
          onKeyDown={(event) => {
            if (event.key === 'Enter' || event.key === ' ') cookieInputRef.current?.click();
          }}
          onDragOver={(event) => event.preventDefault()}
          onDrop={handleDrop}
          className="group flex min-h-[150px] cursor-pointer flex-col items-center justify-center rounded-xl border border-dashed border-[#484052] bg-[#17151c] px-5 text-center transition-colors hover:border-[#a15cff] hover:bg-[#1b1722]"
        >
          <input
            ref={cookieInputRef}
            type="file"
            accept=".txt,.log,.csv,.json,.jsonl,.har,.html,.htm,.xml,.md,.cookie,.cookies,text/*,application/json,application/xml,application/csv"
            multiple
            className="hidden"
            onChange={(event) => {
              if (event.target.files) void inspectFiles(Array.from(event.target.files));
              event.currentTarget.value = '';
            }}
          />
          <div className="mb-3 flex h-11 w-11 items-center justify-center rounded-xl border border-[#4d3c61] bg-[#241a30] text-[#bb7cff] transition-transform group-hover:-translate-y-0.5">
            {isInspectingCookies ? <LoaderCircle size={21} className="animate-spin" /> : <Upload size={21} />}
          </div>
          <div className="text-[12px] font-bold text-[#dcd3e5]">Перетащите файлы сюда</div>
          <div className="mt-1 text-[10px] text-[#756c80]">или нажмите для выбора текстового файла</div>
          <div className="mt-3 rounded-full border border-[#32283d] bg-[#1d1824] px-2.5 py-1 text-[9px] font-semibold text-[#8c7d9a]">
            {hintLabel}
          </div>
        </div>

        {cookieNotice && (
          <div className="rounded-lg border border-[#5b3d2d] bg-[#2a201d] px-3 py-2 text-[10px] leading-relaxed text-[#e2aa82]">
            {cookieNotice}
          </div>
        )}

        {cookieFiles.length > 0 && (
          <div className="space-y-2">
            <div className="flex items-center justify-between px-1 text-[10px] font-bold uppercase tracking-[.12em] text-[#756c80]">
              <span>Файлы</span>
              <span>{validCount} уникальных / {totalCount} найдено</span>
            </div>
            {cookieFiles.map((file, index) => (
              <div key={`${file.name}-${index}`} className="flex items-center gap-2 rounded-xl border border-[#302a38] bg-[#1b1920] px-3 py-2.5">
                <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-[#251b30] text-[#b979ff]">
                  <FileText size={16} />
                </div>
                <div className="min-w-0 flex-1">
                  <div className="truncate text-[11px] font-semibold text-[#d9d0e1]">{file.name}</div>
                  <div className={`mt-0.5 text-[10px] ${file.invalid ? 'text-[#e2aa82]' : 'text-[#79d6ad]'}`}>
                    {file.valid} уникальных cookie из {file.total} найденных
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setCookieFiles((current) => current.filter((_, fileIndex) => fileIndex !== index))}
                  className="flex h-7 w-7 shrink-0 items-center justify-center rounded-md text-[#756c80] transition-colors hover:bg-[#30232a] hover:text-[#ed8c8c]"
                  aria-label={`Удалить ${file.name}`}
                >
                  <Trash2 size={14} />
                </button>
              </div>
            ))}
            {invalidCount > 0 && (
              <div className="px-1 text-[10px] text-[#a99eb0]">
                Кандидатов пропущено из-за неверного формата: <span className="font-bold text-[#e2aa82]">{invalidCount}</span>
              </div>
            )}
            {duplicateCount > 0 && (
              <div className="px-1 text-[10px] text-[#a99eb0]">
                Повторные cookie пропущены: <span className="font-bold text-[#e2aa82]">{duplicateCount}</span>
              </div>
            )}
          </div>
        )}

        <button
          type="button"
          disabled={!canStart}
          onClick={() => {
            if (isCheck) {
              onStartCookieCheck(cookieFiles);
            } else {
              onStartCookieRun(mode, cookieFiles);
            }
            onClose();
          }}
          className={`flex min-h-11 w-full items-center justify-center gap-2 rounded-xl border px-4 text-[12px] font-bold transition-all ${
            canStart
              ? 'border-[#9b56df] bg-[#8d45d1] text-white shadow-[0_0_20px_rgba(161,92,255,.2)] hover:-translate-y-0.5 hover:bg-[#9b52e6]'
              : 'cursor-not-allowed border-[#34303b] bg-[#211e26] text-[#68616f]'
          }`}
        >
          <ArrowRight size={16} />
          {startLabel}
          {!canStart && <span className="text-[10px] font-medium opacity-60">добавь cookie-файл</span>}
        </button>
      </div>
    );
  };

  const renderModeGrid = () => (
    <div className="grid gap-2 p-3 sm:grid-cols-2">
      {modeOptions.map(({ name, description, icon: Icon }, index) => {
        const canOpen = ['Cookie Checker', 'Bypasser', 'Vbiv', 'Refresher', 'Validator', 'Duplicator', 'Passport Generator'].includes(name);

        return (
          <button
            type="button"
            key={name}
            data-testid={`button-mode-${name.toLowerCase().replaceAll(' ', '-')}`}
            disabled={!canOpen}
            onClick={() => openMenu(name)}
            className={`flex min-h-[72px] items-center gap-3 rounded-lg border border-[#2d3138] bg-[#202329] px-3.5 text-left ${
              canOpen
                ? 'cursor-pointer opacity-100 transition-colors hover:border-[#4c555f] hover:bg-[#282c33]'
                : 'cursor-not-allowed opacity-75'
            } ${index === modeOptions.length - 1 ? 'sm:col-span-2' : ''}`}
          >
            <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-md border border-[#3a3f48] text-[#9da3ad]">
              <Icon size={19} strokeWidth={1.8} />
            </span>
            <span className="min-w-0">
              <span className="block text-[12px] font-semibold text-[#ddd8d0]">{name}</span>
              <span className="mt-1 block text-[10px] text-[#777d87]">{description}</span>
            </span>
          </button>
        );
      })}
    </div>
  );

  const renderBypasser = () => (
    <div className="grid gap-2 p-3 sm:grid-cols-2">
      {bypasserOptions.map(({ name, description, icon: Icon }) => (
        <button
          type="button"
          key={name}
          onClick={() => {
            if (name === 'IP Lock Bypass') setActiveMenu('ip-lock');
            if (name === 'Verified Age Bypass') setActiveMenu('verified-age');
            if (name === 'Account Bypass') setActiveMenu('account');
            if (name === 'Get Link') setActiveMenu('get-link');
          }}
          className="flex min-h-[72px] cursor-pointer items-center gap-3 rounded-lg border border-[#2d3138] bg-[#202329] px-3.5 text-left transition-colors hover:border-[#4c555f] hover:bg-[#282c33]"
        >
          <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-md border border-[#3a3f48] text-[#9da3ad]">
            <Icon size={19} strokeWidth={1.8} />
          </span>
          <span className="min-w-0">
            <span className="block text-[12px] font-semibold text-[#ddd8d0]">{name}</span>
            <span className="mt-1 block text-[10px] text-[#777d87]">{description}</span>
          </span>
        </button>
      ))}
    </div>
  );

  const renderBypasserDetails = () => {
    if (activeMenu === 'ip-lock' || activeMenu === 'verified-age') {
      const isIpLock = activeMenu === 'ip-lock';
      return (
        <MenuActionStack>
          <ExportCookieAction />
          <div className="rounded-xl border border-[#343941] bg-[#202329] p-3.5">
            <div className="mb-3 flex items-center gap-2 text-[12px] font-bold text-[#e1ddd6]">
              {isIpLock ? <Unlock size={16} className="text-primary" /> : <CrackedShieldCheckIcon size={17} className="text-primary" />}
              {isIpLock ? 'IP Lock Bypass' : 'Verified Age Bypass'}
            </div>
          </div>
          <PlaceholderAction accent icon={CheckCircle2} label="Start Bypass" />
        </MenuActionStack>
      );
    }

    if (activeMenu === 'get-link') {
      return (
        <MenuActionStack>
          <ExportCookieAction />
          <div className="rounded-xl border border-[#343941] bg-[#202329] p-3.5">
            <div className="mb-3 text-[12px] font-bold text-[#e1ddd6]">Параметры ссылки</div>
            <div className="space-y-3">
              <SelectField label="Тип" value={linkType} onChange={setLinkType} options={['Passport', 'Face']} />
              <SelectField label="Защита" value={linkTwoFactor} onChange={setLinkTwoFactor} options={['2FA', 'No 2FA']} />
            </div>
          </div>
          <PlaceholderAction accent icon={Link2} label="Start Bypass" />
        </MenuActionStack>
      );
    }

    if (activeMenu === 'account-advanced') {
      return (
        <MenuActionStack>
          <div className="rounded-xl border border-[#343941] bg-[#202329] p-3.5">
            <div className="mb-3 text-[12px] font-bold text-[#e1ddd6]">Выберите функцию</div>
            <SelectField
              label=""
              value={advancedFunction}
              onChange={setAdvancedFunction}
              options={['Поставить 9-12 (Face)', 'Поставить 9-12 (Passport)']}
            />
            <div className="mt-4 grid grid-cols-2 gap-2">
              {['No 2FA', 'With 2FA'].map((option) => (
                <label
                  key={option}
                  className={`flex cursor-pointer items-center gap-2 rounded-lg border px-2.5 py-2 text-[11px] font-semibold ${
                    advancedTwoFactor === option
                      ? 'border-primary/70 bg-[#3b2a20] text-[#f5c394]'
                      : 'border-[#363b44] bg-[#23262d] text-[#a7acb5]'
                  }`}
                >
                  <input
                    type="radio"
                    name="advanced-two-factor"
                    value={option}
                    checked={advancedTwoFactor === option}
                    onChange={() => setAdvancedTwoFactor(option)}
                    className="accent-[#ff8a24]"
                  />
                  {option}
                </label>
              ))}
            </div>
          </div>
          <ExportCookieAction />
          <PlaceholderAction accent icon={CheckCircle2} label="Start" />
        </MenuActionStack>
      );
    }

    return (
      <MenuActionStack>
        <ExportCookieAction />
        <div className="rounded-xl border border-[#343941] bg-[#202329] p-3.5">
          <div className="space-y-3">
            <SelectField
              label="Account Type"
              value={accountType}
              onChange={setAccountType}
              options={['9-12', '13+', '16-17', '18+']}
            />
            <SelectField
              label="2FA Type"
              value={accountTwoFactor}
              onChange={setAccountTwoFactor}
              options={['Authenticator', 'Email']}
            />
          </div>
        </div>
        <button
          type="button"
          onClick={() => setActiveMenu('account-advanced')}
          className="flex min-h-10 w-full items-center justify-center rounded-lg border border-[#4a3b30] bg-[#2d2925] px-4 text-[12px] font-bold text-[#f5c394] transition-colors hover:bg-[#3a3029]"
        >
          Дополнительно
        </button>
        <PlaceholderAction accent icon={CheckCircle2} label="Start Bypass" />
      </MenuActionStack>
    );
  };

  const renderVerticalMenu = () => {
    if (activeMenu === 'cookie-checker') {
      return renderCookieFiles('check');
    }

    if (activeMenu === 'validator') {
      return renderCookieFiles('validate');
    }

    if (activeMenu === 'ip-lock' || activeMenu === 'verified-age' || activeMenu === 'account' || activeMenu === 'account-advanced' || activeMenu === 'get-link') {
      return renderBypasserDetails();
    }

    if (activeMenu === 'vbiv') {
      return (
        <MenuActionStack>
          <ExportCookieAction />
          <AccountsCardsPanel />
          <PlaceholderAction accent icon={CheckCircle2} label="Start Vbiv" />
        </MenuActionStack>
      );
    }

    if (activeMenu === 'refresher') {
      return renderCookieFiles('refresh');
    }

    if (activeMenu === 'passport') {
      return (
        <MenuActionStack>
          <div className="rounded-lg border border-[#343941] bg-[#202329] px-3 py-2.5 text-[11px] leading-relaxed text-[#bbbfc6]">
            Функция для генерации паспортов для обхода бана со стороны Roblox
          </div>
          <SelectField
            label="Выберите тип генерации"
            value={passportType}
            onChange={setPassportType}
            options={['Смена данных', 'Полный пасспорт']}
          />
          {passportType === 'Смена данных' ? (
            <div className="space-y-2">
              <PlaceholderAction icon={Download} label="Load Passport" />
              <PlaceholderAction accent icon={RefreshCw} label="Смена данных" />
            </div>
          ) : (
            <div className="space-y-3">
              <SelectField
                label="Country"
                value={country}
                onChange={setCountry}
                options={['Россия', 'Великобритания', 'США', 'Германия', 'Франция', 'Япония']}
              />
              <SelectField
                label="Age"
                value={age}
                onChange={setAge}
                options={['9-12', '9-12(13+)', '13+', '16+', '18+']}
              />
              <PlaceholderAction accent icon={Globe2} label="Generate" />
            </div>
          )}
        </MenuActionStack>
      );
    }

    return (
      <MenuActionStack>
        <ExportCookieAction />
        <PlaceholderAction accent icon={CheckCircle2} label={`Start ${title.replace('Validator', 'Validator').replace('Duplicator', 'Duplicator')}`} />
      </MenuActionStack>
    );
  };

  return (
    <div
      className="mode-menu-backdrop absolute inset-0 z-20 flex items-center justify-center bg-[#090a0d]/80 px-4 py-6"
      role="dialog"
      aria-modal="true"
      aria-labelledby="mode-menu-title"
      onClick={onClose}
    >
      <div
        className={`mode-menu-panel w-full overflow-hidden rounded-xl border border-[#343840] bg-[#1a1c22] ${
          isModesMenu ? 'max-w-[610px]' : isBypasserMenu ? 'max-w-[680px]' : 'max-w-[390px] max-h-[calc(100%-24px)] overflow-y-auto'
        }`}
        onClick={(event) => event.stopPropagation()}
      >
        <div className="flex items-center justify-between border-b border-[#2b2e35] px-4 py-3.5">
          <div className="flex min-w-0 items-center gap-2">
            {!isModesMenu && (
              <button
                type="button"
                onClick={() => setActiveMenu('modes')}
                className="flex h-7 w-7 shrink-0 items-center justify-center rounded-md text-[#777c87] transition-colors hover:bg-[#292d34] hover:text-[#e7e1d8]"
                aria-label="Назад к режимам"
              >
                <ArrowLeft size={15} />
              </button>
            )}
            <h2 id="mode-menu-title" className="truncate text-sm font-semibold text-[#ece7df]">
              {title}
            </h2>
          </div>
          <button
            type="button"
            data-testid="button-close-mode-menu"
            onClick={onClose}
            className="flex h-7 w-7 items-center justify-center rounded-md text-[#777c87] transition-colors hover:bg-[#292d34] hover:text-[#e7e1d8]"
            aria-label="Close mode menu"
          >
            <X size={15} />
          </button>
        </div>
        {isModesMenu ? renderModeGrid() : isBypasserMenu ? renderBypasser() : isTallMenu ? renderVerticalMenu() : null}
      </div>
    </div>
  );
}

function AppFrame({
  children,
  view,
  started,
  isMinimized,
  isExpanded,
  isClosed,
  onStart,
  onStartCookieCheck,
  onStartCookieRun,
  modeMenuOpen,
  onOpenModeMenu,
  onCloseModeMenu,
  onViewChange,
  onMinimize,
  onMaximize,
  onClose,
  onReopen,
}: {
  children: ReactNode;
  view: View;
  started: boolean;
  isMinimized: boolean;
  isExpanded: boolean;
  isClosed: boolean;
  onStart: () => void;
  onStartCookieCheck: (files: CookieFileSummary[]) => void;
  onStartCookieRun: (mode: ValidateMode, files: CookieFileSummary[]) => void;
  modeMenuOpen: boolean;
  onOpenModeMenu: () => void;
  onCloseModeMenu: () => void;
  onViewChange: (view: View) => void;
  onMinimize: () => void;
  onMaximize: () => void;
  onClose: () => void;
  onReopen: () => void;
}) {
  const handleTitlebarMouseDown = (event: MouseEvent<HTMLDivElement>) => {
    if ((event.target as HTMLElement).closest('button') || !isTauriRuntime()) {
      return;
    }

    void getCurrentWindow().startDragging().catch(() => undefined);
  };

  return (
    <main className="app-shell flex items-center justify-center text-foreground">
      <section
        className={`relative flex h-full min-h-full w-full overflow-hidden bg-[#17191f] transition-all duration-500 ${
          isMinimized ? 'h-[78px] min-h-0' : ''
        }`}
        aria-label="Multi Tool desktop window"
      >
          <div
            className="window-drag-region absolute inset-x-0 top-0 z-10 h-[42px] border-b border-[#2b2e35] bg-[#1c1f25] px-4"
            data-tauri-drag-region
            onMouseDown={handleTitlebarMouseDown}
          >
          <div className="flex h-full items-center gap-3">
            <WindowControls
              isExpanded={isExpanded}
              onMinimize={onMinimize}
              onMaximize={onMaximize}
              onClose={onClose}
            />
            <div className="hidden h-4 w-px bg-[#343740] sm:block" />
            <div className="flex min-w-0 items-center gap-2">
              <div className="flex h-5 w-5 shrink-0 items-center justify-center rounded-[6px] bg-primary text-primary-foreground">
                <TwinHammerIcon size={15} />
              </div>
              <BrandName className="truncate text-[11px] font-bold tracking-[.01em] text-[#d8d4ce]" />
            </div>
          </div>
        </div>

        {isClosed ? (
          <div className="flex min-h-[690px] w-full flex-col items-center justify-center bg-[#17191f] px-6 pt-10 text-center">
            <div className="mb-5 flex h-14 w-14 items-center justify-center rounded-2xl border border-[#493528] bg-[#2b211d] text-primary">
              <TwinHammerIcon size={28} />
            </div>
            <h1 className="text-2xl font-extrabold tracking-[-.03em] text-[#f0ebe3]">
              <BrandName />
            </h1>
            <button
              type="button"
              data-testid="button-reopen-window"
              onClick={() => {
                onReopen();
                onOpenModeMenu();
              }}
              className="mt-7 inline-flex items-center gap-2 rounded-lg bg-primary px-4 py-2.5 text-sm font-bold text-primary-foreground transition-transform hover:-translate-y-0.5"
            >
              <Play size={15} fill="currentColor" /> Start
            </button>
          </div>
        ) : isMinimized ? (
          <div className="flex w-full items-center justify-center pt-[42px] text-xs text-[#858992]">
            <button
              type="button"
              data-testid="button-restore-window"
              onClick={onMinimize}
              className="inline-flex items-center gap-2 transition-colors hover:text-primary"
            >
              <TwinHammerIcon size={16} /> Restore Multi Tool
            </button>
          </div>
        ) : (
          <div className="flex w-full flex-col pt-[42px] md:flex-row">
            <aside className="flex w-full shrink-0 flex-col border-b border-[#2b2e35] bg-[#14161b] md:w-[208px] md:border-b-0 md:border-r">
              <div className="flex flex-1 flex-col px-3 py-5">
                <div className="mb-7 hidden items-center gap-2.5 px-3 md:flex">
                  <div className="flex h-9 w-9 items-center justify-center rounded-[11px] bg-primary text-primary-foreground">
                    <TwinHammerIcon size={21} />
                  </div>
                  <div>
                    <p className="text-[13px] font-extrabold tracking-[-.02em] text-[#f0ebe3]">
                      <BrandName />
                    </p>
                  </div>
                </div>
                <button
                  type="button"
                  data-testid="button-start-app"
                  onClick={() => {
                    onStart();
                    onOpenModeMenu();
                  }}
                  className={`mb-3 flex min-h-10 w-full items-center justify-center gap-2 rounded-lg px-3 text-[12px] font-bold transition-all duration-200 ${
                    !started
                       ? 'bg-primary text-primary-foreground hover:bg-[#e87b3f]'
                      : 'bg-[#2d2925] text-[#f5c394] hover:bg-[#3a3029]'
                  }`}
                  aria-current={!started ? 'page' : undefined}
                >
                  <Play size={14} fill="currentColor" /> Start
                </button>
                <nav className="space-y-1" aria-label="Primary navigation">
                  <NavItem
                    active={started && view === 'dashboard'}
                    icon={LayoutDashboard}
                    label="Dashboard"
                    onClick={() => {
                      onStart();
                      onViewChange('dashboard');
                    }}
                  />
                  <NavItem
                    active={started && view === 'settings'}
                    icon={Settings2}
                    label="Settings"
                    onClick={() => {
                      onStart();
                      onViewChange('settings');
                    }}
                  />
                  <NavItem
                    active={started && view === 'looter'}
                    icon={MoneyBagIcon}
                    label="Looter"
                    onClick={() => {
                      onStart();
                      onViewChange('looter');
                    }}
                  />
                  <NavItem
                    active={started && view === 'auto-cookie'}
                    icon={FunpayIcon}
                    label="Auto Cookie"
                    onClick={() => {
                      onStart();
                      onViewChange('auto-cookie');
                    }}
                  />
                </nav>
              </div>
            </aside>
            <div className="relative min-h-[648px] min-w-0 flex-1 overflow-auto">
              {!started ? <StartScreen /> : children}
              {modeMenuOpen && (
                <ModeMenu
                  onClose={onCloseModeMenu}
                  onStartCookieCheck={onStartCookieCheck}
                  onStartCookieRun={onStartCookieRun}
                />
              )}
            </div>
          </div>
        )}
      </section>
    </main>
  );
}

function Router() {
  const [view, setView] = useState<View>('dashboard');
  const [started, setStarted] = useState(false);
  const [modeMenuOpen, setModeMenuOpen] = useState(false);
  const [isMinimized, setIsMinimized] = useState(false);
  const [isExpanded, setIsExpanded] = useState(false);
  const [isClosed, setIsClosed] = useState(false);
  const [cookieCheckFiles, setCookieCheckFiles] = useState<CookieFileSummary[]>([]);
  const [validatorFiles, setValidatorFiles] = useState<CookieFileSummary[]>([]);
  const [refresherFiles, setRefresherFiles] = useState<CookieFileSummary[]>([]);
  const [gameIds, setGameIds] = useState<string[]>(loadGameIds);
  const [gameChecks, setGameChecks] = useState<GameCheckConfig[]>(loadGameChecks);

  useEffect(() => {
    window.localStorage.setItem(GAME_IDS_STORAGE_KEY, JSON.stringify(gameIds));
  }, [gameIds]);

  useEffect(() => {
    window.localStorage.setItem(GAME_CHECKS_STORAGE_KEY, JSON.stringify(gameChecks));
  }, [gameChecks]);

  return (
    <AppFrame
      view={view}
      started={started}
      isMinimized={isMinimized}
      isExpanded={isExpanded}
      isClosed={isClosed}
      onStart={() => setStarted(true)}
      onStartCookieCheck={(files) => {
        setCookieCheckFiles(files);
        setStarted(true);
        setModeMenuOpen(false);
        setView('cookie-checker');
      }}
      onStartCookieRun={(mode, files) => {
        if (mode === 'validate') {
          setValidatorFiles(files);
          setView('validator');
        } else {
          setRefresherFiles(files);
          setView('refresher');
        }
        setStarted(true);
        setModeMenuOpen(false);
      }}
      modeMenuOpen={modeMenuOpen}
      onOpenModeMenu={() => setModeMenuOpen(true)}
      onCloseModeMenu={() => setModeMenuOpen(false)}
      onViewChange={setView}
      onMinimize={async () => {
        if (!isTauriRuntime()) {
          setIsMinimized((value) => !value);
          return;
        }

        try {
          await getCurrentWindow().minimize();
        } catch {
          setIsMinimized((value) => !value);
        }
      }}
      onMaximize={async () => {
        if (!isTauriRuntime()) {
          setIsExpanded((value) => !value);
          return;
        }

        const appWindow = getCurrentWindow();
        try {
          await appWindow.toggleMaximize();
          setIsExpanded(await appWindow.isMaximized());
        } catch {
          setIsExpanded((value) => !value);
        }
      }}
      onClose={async () => {
        if (!isTauriRuntime()) {
          setIsClosed(true);
          return;
        }

        try {
          await getCurrentWindow().close();
        } catch {
          try {
            await getCurrentWindow().destroy();
          } catch {
            setIsClosed(false);
          }
        }
      }}
      onReopen={() => setIsClosed(false)}
    >
      <div key={view} className="min-h-full flex-1">
        {view === 'dashboard' ? (
          <DashboardView />
        ) : view === 'settings' ? (
          <SettingsView
            gameIds={gameIds}
            onGameIdsChange={setGameIds}
            gameChecks={gameChecks}
            onGameChecksChange={setGameChecks}
          />
        ) : view === 'looter' ? (
          <LooterView />
        ) : view === 'cookie-checker' ? (
          <CookieCheckerView
            files={cookieCheckFiles}
            gameIds={gameIds}
            gameChecks={gameChecks}
          />
        ) : view === 'validator' ? (
          <CookieRunView files={validatorFiles} mode="validate" />
        ) : view === 'refresher' ? (
          <CookieRunView files={refresherFiles} mode="refresh" />
        ) : (
          <AutoCookieView />
        )}
      </div>
    </AppFrame>
  );
}

function RoutedErrorBoundary({ children }: { children: ReactNode }) {
  return <ErrorBoundary resetKey="multi-tool">{children}</ErrorBoundary>;
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <RoutedErrorBoundary>
          <Router />
        </RoutedErrorBoundary>
        <Toaster />
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;