const latitude = process.env.GETWET_LATITUDE;
const longitude = process.env.GETWET_LONGITUDE;

if (!latitude || !longitude) {
  throw new Error(
    "Missing required environment variables: GETWET_LATITUDE and GETWET_LONGITUDE",
  );
}

const forecastParams = new URLSearchParams({
  latitude,
  longitude,
  minutely_15: "precipitation,temperature_2m,wind_direction_10m,wind_speed_10m",
  timezone: "auto",
  forecast_days: "2",
});

export const FORECAST_URL = `https://api.open-meteo.com/v1/forecast?${forecastParams.toString()}`;

export const FORECAST_WINDOW_HOURS = 3;
export const SAMPLE_MINUTES = 15;
