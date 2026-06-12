import { FORECAST_WINDOW_HOURS, SAMPLE_MINUTES } from './config.js';

const toNumber = (value) => (Number.isFinite(value) ? value : 0);

const toWindTravelDirection = (degrees) => (degrees + 180) % 360;

export function getCurrentQuarterHour(date = new Date()) {
  const current = new Date(date);
  current.setSeconds(0, 0);
  current.setMinutes(Math.floor(current.getMinutes() / SAMPLE_MINUTES) * SAMPLE_MINUTES);
  return current;
}

export function formatRefreshTime(date) {
  if (!date) {
    return '';
  }

  return new Intl.DateTimeFormat(undefined, {
    hour: '2-digit',
    minute: '2-digit',
  }).format(date);
}

export function formatForecastTime(value) {
  return new Intl.DateTimeFormat(undefined, {
    hour: '2-digit',
    minute: '2-digit',
  }).format(new Date(value));
}

export function parseForecast(payload, options = {}) {
  const windowHours = options.windowHours ?? FORECAST_WINDOW_HOURS;
  const now = options.now ?? new Date();
  const minutely = payload?.minutely_15;

  if (!minutely?.time?.length) {
    return [];
  }

  const startTime = getCurrentQuarterHour(now).getTime();
  const endTime = startTime + windowHours * 60 * 60 * 1000;

  return minutely.time
    .map((time, index) => ({
      time,
      timestamp: new Date(time).getTime(),
      temperature: toNumber(minutely.temperature_2m?.[index]),
      precipitation: toNumber(minutely.precipitation?.[index]),
      windDirection: toWindTravelDirection(toNumber(minutely.wind_direction_10m?.[index])),
      windSpeed: toNumber(minutely.wind_speed_10m?.[index]),
    }))
    .filter((point) => point.timestamp >= startTime && point.timestamp < endTime);
}

export function getTemperatureRange(points) {
  if (!points.length) {
    return { min: 0, max: 0 };
  }

  const values = points.map((point) => point.temperature);
  return {
    min: Math.min(...values),
    max: Math.max(...values),
  };
}

export function getWindStep(width = window.innerWidth) {
  return width < 390 ? 3 : 2;
}