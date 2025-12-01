export function parseNumber(value) {
    const numberValue = Number(value);
    return (value == null || String(value).trim() === "" || Number.isNaN(numberValue)) ? NaN : numberValue;
}