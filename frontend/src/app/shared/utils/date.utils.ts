const monthFormatter = new Intl.DateTimeFormat('de-DE', { month: 'long' });

export function extractLocalDateTime(isoDate: string): { date: string; time: string } {
    const date = new Date(isoDate);
    const year = date.getFullYear().toString();
    const month = (date.getMonth() + 1).toString().padStart(2, '0');
    const day = date.getDate().toString().padStart(2, '0');
    const hours = date.getHours().toString().padStart(2, '0');
    const minutes = date.getMinutes().toString().padStart(2, '0');
    return {
        date: `${year}-${month}-${day}`,
        time: `${hours}:${minutes}`
    };
}

export function convertLocalToUtc(date: string, time: string): string {
    const dateTime = new Date(`${date}T${time}:00`);
    return dateTime.toISOString();
}

export function parseToDisplayParts(isoDate: string): { day: string; month: string; time: string } {
    const date = new Date(isoDate);
    const day = date.getDate().toString().padStart(2, '0');
    const month = monthFormatter.format(date);
    const hours = date.getHours().toString().padStart(2, '0');
    const minutes = date.getMinutes().toString().padStart(2, '0');
    return { day, month, time: `${hours}:${minutes}` };
}
