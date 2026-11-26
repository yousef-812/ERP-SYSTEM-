/**
 * Helper to format currency based on current language.
 * Converts Arabic currency names to English abbreviations when language is 'en'.
 */

const currencyMap = {
  'درهم إماراتي': { ar: 'د.إ', en: 'AED' },
  'ريال سعودي': { ar: 'ر.س', en: 'SAR' },
  'دينار كويتي': { ar: 'د.ك', en: 'KWD' },
  'ريال قطري': { ar: 'ر.ق', en: 'QAR' },
  'دينار بحريني': { ar: 'د.ب', en: 'BHD' },
  'ريال عماني': { ar: 'ر.ع', en: 'OMR' },
  'جنيه مصري': { ar: 'ج.م', en: 'EGP' },
  'دولار أمريكي': { ar: '$', en: 'USD' },
  'يورو': { ar: '€', en: 'EUR' }
};

const mappingByCode = {
  'EGP': { ar: 'ج.م', en: 'EGP' },
  'SAR': { ar: 'ر.س', en: 'SAR' },
  'AED': { ar: 'د.إ', en: 'AED' },
  'KWD': { ar: 'د.ك', en: 'KWD' },
  'QAR': { ar: 'ر.ق', en: 'QAR' },
  'BHD': { ar: 'د.ب', en: 'BHD' },
  'OMR': { ar: 'ر.ع', en: 'OMR' },
  'USD': { ar: '$', en: 'USD' },
  'EUR': { ar: '€', en: 'EUR' }
};

export const formatCurrency = (amount, currency, lang = 'ar') => {
  const formattedAmount = Number(amount || 0).toLocaleString(lang === 'ar' ? 'ar-EG' : 'en-US');
  
  const config = mappingByCode[currency] || currencyMap[currency];
  
  if (!config) {
    return `${formattedAmount} ${currency}`;
  }

  const symbol = lang === 'ar' ? config.ar : config.en;
  return `${formattedAmount} ${symbol}`;
};

export const getCurrencySymbol = (currency, lang = 'ar') => {
  const config = mappingByCode[currency] || currencyMap[currency];
  if (!config) return currency;
  return lang === 'ar' ? config.ar : config.en;
};
