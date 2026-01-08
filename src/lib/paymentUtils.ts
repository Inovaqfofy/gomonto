// Phone prefixes for Mobile Money eligible countries (UEMOA/CEMAC region)
const MOBILE_MONEY_PREFIXES = [
  "+221", // Sénégal
  "+225", // Côte d'Ivoire
  "+229", // Bénin
  "+226", // Burkina Faso
  "+223", // Mali
  "+227", // Niger
  "+228", // Togo
  "+224", // Guinée
  "+237", // Cameroun
  "+241", // Gabon
  "+242", // Congo
  "+243", // RDC
];

// Map phone prefixes to country codes for CinetPay
const PHONE_TO_COUNTRY: Record<string, string> = {
  "+1": "US", // USA/Canada
  "+33": "FR", // France
  "+32": "BE", // Belgique
  "+41": "CH", // Suisse
  "+44": "GB", // UK
  "+221": "SN", // Sénégal
  "+225": "CI", // Côte d'Ivoire
  "+229": "BJ", // Bénin
  "+226": "BF", // Burkina Faso
  "+223": "ML", // Mali
  "+227": "NE", // Niger
  "+228": "TG", // Togo
  "+224": "GN", // Guinée
  "+237": "CM", // Cameroun
  "+241": "GA", // Gabon
};

/**
 * Check if a phone number belongs to a Mobile Money eligible region
 */
export const isMobileMoneyEligible = (phoneNumber: string): boolean => {
  const cleanPhone = phoneNumber.replace(/\s/g, "");
  return MOBILE_MONEY_PREFIXES.some((prefix) => cleanPhone.startsWith(prefix));
};

/**
 * Check if a customer is international (not in Mobile Money region)
 */
export const isInternationalCustomer = (phoneNumber: string): boolean => {
  return !isMobileMoneyEligible(phoneNumber);
};

/**
 * Get the appropriate payment channels based on customer phone
 * Returns "ALL" for local customers (Mobile Money + Cards)
 * Returns "CREDIT_CARD" for international customers (Cards only)
 */
export const getPaymentChannels = (phoneNumber: string): string => {
  return isMobileMoneyEligible(phoneNumber) ? "ALL" : "CREDIT_CARD";
};

/**
 * Get country code from phone number prefix
 */
export const getCountryFromPhone = (phoneNumber: string): string => {
  const cleanPhone = phoneNumber.replace(/\s/g, "");
  
  // Check longer prefixes first (country codes can be 1-3 digits)
  for (const prefix of Object.keys(PHONE_TO_COUNTRY).sort((a, b) => b.length - a.length)) {
    if (cleanPhone.startsWith(prefix)) {
      return PHONE_TO_COUNTRY[prefix];
    }
  }
  
  return "SN"; // Default to Senegal
};

/**
 * Get list of available payment methods based on customer location
 */
export const getAvailablePaymentMethods = (phoneNumber: string): string[] => {
  if (isInternationalCustomer(phoneNumber)) {
    return ["Visa", "Mastercard"];
  }
  return ["Orange Money", "MTN MoMo", "Wave", "Moov Money", "Visa", "Mastercard"];
};
