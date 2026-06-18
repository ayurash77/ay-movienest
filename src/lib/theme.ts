export const appThemes = [
    { id: 'golden-show', label: 'Золотой сеанс' },
    { id: 'catppuccin', label: 'Catppuccin' },
    { id: 'onedark', label: 'One Dark Pro' },
    { id: 'dracula', label: 'Dracula' },
    { id: 'ayu', label: 'Ayu' },
    { id: 'shotmate', label: 'Shotmate' },
] as const;

export type AppTheme = (typeof appThemes)[number]['id'];

const STORAGE_KEY = 'movienest:theme';
const DEFAULT_THEME: AppTheme = 'golden-show';

export function isAppTheme(value: unknown): value is AppTheme {
    return typeof value === 'string' && appThemes.some((theme) => theme.id === value);
}

export function getStoredTheme(): AppTheme {
    if (typeof window === 'undefined') return DEFAULT_THEME;
    const stored = window.localStorage.getItem(STORAGE_KEY);
    return isAppTheme(stored) ? stored : DEFAULT_THEME;
}

export function applyTheme(theme: AppTheme) {
    if (typeof document === 'undefined') return;
    document.documentElement.dataset.theme = theme;
    document.documentElement.classList.add('dark');
}

export function storeTheme(theme: AppTheme) {
    if (typeof window === 'undefined') return;
    window.localStorage.setItem(STORAGE_KEY, theme);
}
