const FALLBACK_WEATHER_DEFAULT_DISTRICT_ID = '441881';
const FALLBACK_WEATHER_DEFAULT_NAME = '英德市';
const DISTRICT_ID_PATTERN = /^\d{6,12}$/;

function normalizeWeatherDefaultDistrictId(value: string | undefined): string {
  const normalized = value?.trim() || '';
  return DISTRICT_ID_PATTERN.test(normalized) ? normalized : FALLBACK_WEATHER_DEFAULT_DISTRICT_ID;
}

function normalizeWeatherDefaultName(value: string | undefined): string {
  const normalized = value?.trim().replace(/\s+/g, ' ') || '';
  return normalized || FALLBACK_WEATHER_DEFAULT_NAME;
}

export function getWeatherDefaults() {
  return {
    defaultDistrictId: normalizeWeatherDefaultDistrictId(process.env.WEATHER_DEFAULT_DISTRICT_ID),
    defaultDistrictName: normalizeWeatherDefaultName(process.env.WEATHER_DEFAULT_DISTRICT_NAME),
  };
}
