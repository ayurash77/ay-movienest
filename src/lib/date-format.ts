const DATE_FORMAT = new Intl.DateTimeFormat('ru-RU', {
    timeZone: 'Europe/Moscow',
});

const DATE_TIME_FORMAT = new Intl.DateTimeFormat('ru-RU', {
    timeZone: 'Europe/Moscow',
    hour: '2-digit',
    minute: '2-digit',
});

export function formatRuDate(iso: string) {
    return DATE_FORMAT.format(new Date(iso));
}

export function formatRuDateTime(iso: string) {
    return DATE_TIME_FORMAT.format(new Date(iso));
}
