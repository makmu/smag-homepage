export const RAINBOW_COLORS = [
    { color: '#e74c3c', bg: '#FDF2F2', text: '#C0392B' },
    { color: '#e67e22', bg: '#FEF5EB', text: '#D35400' },
    { color: '#f1c40f', bg: '#FEFDE7', text: '#B7950B' },
    { color: '#27ae60', bg: '#E8F5E9', text: '#1E8449' },
    { color: '#3498db', bg: '#EBF5FB', text: '#2471A3' },
    { color: '#9b59b6', bg: '#F5EEF8', text: '#7D3C98' },
] as const;

export const BLUE_STYLE = RAINBOW_COLORS[4];
export const ORANGE_STYLE = RAINBOW_COLORS[1];

export type RainbowColor = (typeof RAINBOW_COLORS)[number];
