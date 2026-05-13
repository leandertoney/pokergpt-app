/**
 * Utility functions for consistent price formatting across the app
 * Ensures compliance with Google Play subscription policy requirements
 */

/**
 * Extracts the numeric price value from a RevenueCat price string
 * @param priceString - Formatted price string from RevenueCat (e.g., "$29.99", "€25.00")
 * @returns Numeric price value or 0 if parsing fails
 */
export function extractPriceValue(priceString: string | undefined): number {
  if (!priceString) return 0;

  // Remove all non-numeric characters except decimal point and minus
  const numericString = priceString.replace(/[^0-9.-]/g, '');
  const value = parseFloat(numericString);

  return isNaN(value) ? 0 : value;
}

/**
 * Extracts currency information from a RevenueCat price string
 * @param priceString - Formatted price string from RevenueCat
 * @returns Object containing currency symbol and code (if determinable)
 */
export function extractCurrencyInfo(priceString: string | undefined): {
  symbol: string;
  code?: string;
} {
  if (!priceString) return { symbol: '$' };

  // Extract non-numeric characters (should be currency symbol/code)
  const currencyMatch = priceString.match(/[^\d.,\s-]+/);
  const symbol = currencyMatch ? currencyMatch[0] : '$';

  // Common currency codes mapping
  const currencyCodeMap: Record<string, string> = {
    '$': 'USD',
    '€': 'EUR',
    '£': 'GBP',
    '¥': 'JPY',
    'R$': 'BRL',
    'CA$': 'CAD',
    'A$': 'AUD',
    '₹': 'INR',
  };

  return {
    symbol,
    code: currencyCodeMap[symbol],
  };
}

/**
 * Formats a price value with proper currency symbol and decimal places
 * Uses the currency from the reference price string to maintain consistency
 * @param value - Numeric price value
 * @param referencePriceString - Reference price string from RevenueCat to extract currency
 * @returns Formatted price string (e.g., "$2.50", "€2.08")
 */
export function formatPrice(
  value: number,
  referencePriceString: string | undefined
): string {
  const { symbol } = extractCurrencyInfo(referencePriceString);

  // Format with 2 decimal places
  const formattedValue = value.toFixed(2);

  // Check if original price has symbol before or after the number
  if (referencePriceString) {
    const isSymbolAtEnd = /\d[^\d]*$/.test(referencePriceString.trim());
    return isSymbolAtEnd ? `${formattedValue}${symbol}` : `${symbol}${formattedValue}`;
  }

  // Default: symbol before number
  return `${symbol}${formattedValue}`;
}

/**
 * Calculates and formats per-month equivalent for yearly pricing
 * @param yearlyPriceString - Yearly price string from RevenueCat
 * @returns Formatted monthly equivalent (e.g., "$2.50/mo")
 */
export function calculateMonthlyEquivalent(yearlyPriceString: string | undefined): string {
  const yearlyValue = extractPriceValue(yearlyPriceString);
  if (yearlyValue === 0) return '';

  const monthlyValue = yearlyValue / 12;
  return formatPrice(monthlyValue, yearlyPriceString);
}

/**
 * Calculates and formats per-week equivalent for yearly pricing
 * @param yearlyPriceString - Yearly price string from RevenueCat
 * @returns Formatted weekly equivalent (e.g., "$0.58/wk")
 */
export function calculateWeeklyEquivalent(yearlyPriceString: string | undefined): string {
  const yearlyValue = extractPriceValue(yearlyPriceString);
  if (yearlyValue === 0) return '';

  const weeklyValue = yearlyValue / 52;
  return formatPrice(weeklyValue, yearlyPriceString);
}

/**
 * Removes the period suffix from a price string (e.g., "/yr", "/mo", "/wk")
 * @param priceString - Price string with period suffix
 * @returns Price without the period suffix
 */
export function removePeriodSuffix(priceString: string): string {
  return priceString.replace(/\/(yr|mo|wk|week|month|year)$/i, '').trim();
}

/**
 * Gets the base price from a RevenueCat price string without period suffix
 * @param priceString - Formatted price string from RevenueCat
 * @returns Just the price without any period text
 */
export function getBasePrice(priceString: string | undefined): string {
  if (!priceString) return '';

  // Remove anything after / if present
  return removePeriodSuffix(priceString);
}
