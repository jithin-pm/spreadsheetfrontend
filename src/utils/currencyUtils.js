export const SUPPORTED_CURRENCIES = [
    { code: "INR", symbol: "₹", locale: "en-IN", name: "Indian Rupee" },
    { code: "USD", symbol: "$", locale: "en-US", name: "US Dollar" },
    { code: "EUR", symbol: "€", locale: "de-DE", name: "Euro" },
    { code: "GBP", symbol: "£", locale: "en-GB", name: "British Pound" },
    { code: "AED", symbol: "AED", locale: "ar-AE", name: "UAE Dirham" },
    { code: "SAR", symbol: "SAR", locale: "ar-SA", name: "Saudi Riyal" },
    { code: "CAD", symbol: "CA$", locale: "en-CA", name: "Canadian Dollar" },
    { code: "AUD", symbol: "A$", locale: "en-AU", name: "Australian Dollar" },
    { code: "SGD", symbol: "S$", locale: "en-SG", name: "Singapore Dollar" },
];

export function getCurrencySymbol(code) {
    const currency = SUPPORTED_CURRENCIES.find(c => c.code === code);
    return currency ? currency.symbol : "₹";
}

export function formatCurrency(value, currencyCode) {
    if (value === null || value === undefined || isNaN(value) || value === "") return "";
    const currency = SUPPORTED_CURRENCIES.find(c => c.code === currencyCode) || SUPPORTED_CURRENCIES[0];
    return new Intl.NumberFormat(currency.locale, {
        style: 'currency',
        currency: currency.code
    }).format(value);
}

export function parseCurrencyInput(input) {
    if (input === null || input === undefined || input === "") return "";
    if (typeof input === 'number') return input.toString();
    const cleaned = String(input).replace(/[^0-9.-]+/g, "");
    return cleaned;
}
