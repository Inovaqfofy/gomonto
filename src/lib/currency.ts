/**
 * Currency configuration for GoMonto platform
 * Uses FCFA (XOF) - West African CFA franc
 */

export const CURRENCY = {
  code: "XOF",           // ISO 4217 code for payment APIs
  symbol: "FCFA",        // User-facing display symbol
  name: "Franc CFA",     // Full name
  locale: "fr-FR",       // Locale for number formatting
  decimals: 0,           // No decimal places (centimes don't exist)
} as const;

/**
 * Format a number as currency with the FCFA symbol
 * @param amount - The amount to format
 * @param showSymbol - Whether to show the currency symbol (default: true)
 * @returns Formatted currency string
 */
export const formatCurrency = (amount: number, showSymbol = true): string => {
  const formattedNumber = amount.toLocaleString(CURRENCY.locale, {
    minimumFractionDigits: CURRENCY.decimals,
    maximumFractionDigits: CURRENCY.decimals,
  });
  
  return showSymbol ? `${formattedNumber} ${CURRENCY.symbol}` : formattedNumber;
};

/**
 * Format a number as currency per day (for rental prices)
 * @param amount - The daily price amount
 * @returns Formatted currency string with /jour suffix
 */
export const formatDailyPrice = (amount: number): string => {
  return `${formatCurrency(amount)}/jour`;
};

/**
 * Format a number as currency per credit
 * @param amount - The price per credit
 * @returns Formatted currency string with /crédit suffix
 */
export const formatPricePerCredit = (amount: number): string => {
  return `${formatCurrency(amount)}/crédit`;
};
