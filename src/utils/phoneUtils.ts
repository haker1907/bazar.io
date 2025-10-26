// Phone number utilities for Uzbekistan

export const formatUzbekPhoneNumber = (phone: string): string => {
  // Remove all non-digit characters except +
  const cleaned = phone.replace(/[^\d+]/g, '')
  
  // If it starts with +998, return as is
  if (cleaned.startsWith('+998')) {
    return cleaned
  }
  
  // If it starts with 998, add + prefix
  if (cleaned.startsWith('998')) {
    return '+' + cleaned
  }
  
  // If it starts with 9 (Uzbek mobile), add +998 prefix
  if (cleaned.startsWith('9') && cleaned.length === 9) {
    return '+998' + cleaned
  }
  
  // If it's already in correct format, return as is
  if (cleaned.length >= 12) {
    return '+' + cleaned
  }
  
  return phone // Return original if can't format
}

export const validateUzbekPhoneNumber = (phone: string): boolean => {
  const formatted = formatUzbekPhoneNumber(phone)
  // Uzbek mobile numbers: +998 followed by 9 digits
  return /^\+998[0-9]{9}$/.test(formatted)
}

export const getPhoneNumberDisplay = (phone: string): string => {
  const formatted = formatUzbekPhoneNumber(phone)
  if (formatted.startsWith('+998')) {
    return formatted
  }
  return phone
}

// Common Uzbek mobile operators
export const UZBEK_MOBILE_OPERATORS = {
  '90': 'Beeline',
  '91': 'Beeline', 
  '93': 'Ucell',
  '94': 'Ucell',
  '95': 'UzMobile',
  '97': 'Mobiuz',
  '99': 'UzMobile'
}

export const getOperatorName = (phone: string): string => {
  const formatted = formatUzbekPhoneNumber(phone)
  if (formatted.startsWith('+998')) {
    const operatorCode = formatted.substring(4, 6)
    return UZBEK_MOBILE_OPERATORS[operatorCode as keyof typeof UZBEK_MOBILE_OPERATORS] || 'Unknown'
  }
  return 'Unknown'
}


