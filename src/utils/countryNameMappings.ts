
export const countryNameMappings: Record<string, string> = {
  'HK': 'Hong Kong SAR',
  'LA': 'Lao People\'s Democratic Republic',
  'PRK': 'Democratic People\'s Democratic Republic of Korea',
  'KR': 'Republic of Korea',
  'ES': 'Spain and Canary Islands',
  'BN': 'Brunei Darussalam',
  'RU': 'Russian Federation',
  'VN': 'Viet Nam',
  'TR': 'Turkiye',
  'MO': 'Macau SAR',
  'MD': 'Republic of Moldova',
  'CD': 'The Democratic Republic of The Congo',
  'CI': 'Cote d\'Ivoire',
  // Common variations
  'Hong Kong': 'Hong Kong SAR',
  'Laos': 'Lao People\'s Democratic Republic',
  'North Korea': 'Democratic People\'s Democratic Republic of Korea',
  'South Korea': 'Republic of Korea',
  'Spain': 'Spain and Canary Islands',
  'Brunei': 'Brunei Darussalam',
  'Russia': 'Russian Federation',
  'Vietnam': 'Viet Nam',
  'Turkey': 'Turkiye',
  'Macau': 'Macau SAR',
  'Moldova': 'Republic of Moldova',
  'DR Congo': 'The Democratic Republic of The Congo',
  'DRC': 'The Democratic Republic of The Congo',
  'Ivory Coast': 'Cote d\'Ivoire'
};

export const standardizeCountryName = (country: string): string => {
  return countryNameMappings[country] || country;
};
