import { useCallback, useEffect, useMemo, useState } from "react";
import {
  Box,
  Center,
  Flex,
  HStack,
  IconButton,
  Spinner,
  Text,
  VStack,
  useToast,
} from "@chakra-ui/react";
import { ArrowUp, RefreshCw } from "lucide-react";
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  LabelList,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { FORECAST_URL, FORECAST_WINDOW_HOURS } from "./config.js";
import {
  formatForecastTime,
  formatRefreshTime,
  getWindStep,
  parseForecast,
} from "./weather.js";

const tooltipStyle = {
  background: "rgba(16, 18, 24, 0.94)",
  border: "1px solid rgba(255, 255, 255, 0.08)",
  borderRadius: 10,
  color: "#f7fbff",
  boxShadow: "0 16px 42px rgba(0, 0, 0, 0.42)",
};

function ChartTooltip({ active, payload, label }) {
  if (!active || !payload?.length) {
    return null;
  }

  return (
    <Box sx={tooltipStyle} px="3" py="2">
      <Text fontSize="sm" color="whiteAlpha.700">
        {label}
      </Text>
      {payload.map((item) => (
        <Text
          key={item.dataKey}
          fontSize="md"
          fontWeight="600"
          color={item.color}
        >
          {item.name}: {item.value}
          {item.dataKey === "temperature" ? "°C" : " mm"}
        </Text>
      ))}
    </Box>
  );
}

function renderTemperatureDot({ cx, cy, payload }) {
  if (!payload.isMin && !payload.isMax) {
    return null;
  }

  const markerColor = payload.isMax ? "#ff7a7a" : "#70d2ff";
  const value = `${payload.temperature.toFixed(0)}ºC`;
  const labelOffset = payload.isMax ? -18 : 30;
  const labelFill = payload.isMax ? "#f7fbff" : "#dce7ee";

  return (
    <g>
      <circle
        cx={cx}
        cy={cy}
        r={5}
        fill={markerColor}
        stroke="#fff"
        strokeWidth={2}
      />
      <text
        x={cx}
        y={cy + labelOffset}
        textAnchor="middle"
        fill={labelFill}
        fontSize="12"
        fontWeight="700"
      >
        {value}
      </text>
    </g>
  );
}

export default function App() {
  const [points, setPoints] = useState([]);
  const [lastRefresh, setLastRefresh] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [windStep, setWindStep] = useState(() => getWindStep());
  const toast = useToast();

  const loadForecast = useCallback(async () => {
    setIsLoading(true);

    try {
      const response = await fetch(FORECAST_URL, { cache: "no-store" });

      if (!response.ok) {
        throw new Error(`Forecast request failed: ${response.status}`);
      }

      const payload = await response.json();
      setPoints(parseForecast(payload, { windowHours: FORECAST_WINDOW_HOURS }));
      setLastRefresh(new Date());
    } catch (error) {
      toast({
        title: "Refresh failed",
        description: error.message,
        status: "error",
        duration: 3200,
        isClosable: true,
      });
    } finally {
      setIsLoading(false);
    }
  }, [toast]);

  useEffect(() => {
    loadForecast();
  }, [loadForecast]);

  useEffect(() => {
    const handleResize = () => setWindStep(getWindStep());
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  const chartData = useMemo(() => {
    const normalized = points.map((point) => ({
      ...point,
      label: formatForecastTime(point.time),
      temperature: Number(point.temperature.toFixed(1)),
      precipitation: Number(point.precipitation.toFixed(2)),
    }));

    if (!normalized.length) {
      return normalized;
    }

    const temperatures = normalized.map((point) => point.temperature);
    const minTemperature = Math.min(...temperatures);
    const maxTemperature = Math.max(...temperatures);

    return normalized.map((point) => ({
      ...point,
      isMin: point.temperature === minTemperature,
      isMax: point.temperature === maxTemperature,
    }));
  }, [points]);

  const windPoints = useMemo(() => {
    if (!chartData.length) {
      return [];
    }

    const targetCount = windStep === 3 ? 5 : 6;
    const lastIndex = chartData.length - 1;
    const indices = Array.from({ length: targetCount }, (_, index) =>
      Math.round((index * lastIndex) / (targetCount - 1)),
    );

    return [...new Map(indices.map((i) => [i, chartData[i]])).values()];
  }, [chartData, windStep]);
  const maxPrecipitation = useMemo(
    () => Math.max(0.2, ...chartData.map((point) => point.precipitation)),
    [chartData],
  );

  return (
    <Flex minH="100dvh" bg="#08090d" justify="center">
      <Flex
        direction="column"
        w="full"
        maxW="430px"
        minH="100dvh"
        px={{ base: "4", sm: "5" }}
        pt="calc(env(safe-area-inset-top) + 16px)"
        pb="calc(env(safe-area-inset-bottom) + 18px)"
        gap="3"
      >
        <Flex align="center" justify="space-between" minH="40px">
          <Text
            fontSize="2xl"
            fontWeight="700"
            letterSpacing="0"
            lineHeight="1"
          >
            Get Wet
          </Text>
          <HStack spacing="2">
            <Text fontSize="sm" color="whiteAlpha.500" fontWeight="500">
              {formatRefreshTime(lastRefresh)}
            </Text>
            <IconButton
              aria-label="Refresh forecast"
              icon={<RefreshCw size={20} />}
              size="md"
              variant="ghost"
              color="whiteAlpha.800"
              borderRadius="full"
              isLoading={isLoading}
              onClick={loadForecast}
            />
          </HStack>
        </Flex>

        {isLoading && !chartData.length ? (
          <Center flex="1">
            <Spinner color="#66e4ff" size="lg" thickness="3px" />
          </Center>
        ) : (
          <VStack align="stretch" flex="1" spacing="3">
            <Box h="29dvh" minH="190px" maxH="245px" position="relative">
              <Flex
                position="absolute"
                insetX="0"
                top="0"
                zIndex="1"
                justify="space-between"
                align="flex-start"
                px="4"
                pt="3"
              >
                <Text fontSize="sm" color="whiteAlpha.500" fontWeight="600">
                  Temperature
                </Text>
              </Flex>
              <ResponsiveContainer
                width="100%"
                height="100%"
                minWidth={1}
                minHeight={1}
                initialDimension={{ width: 390, height: 220 }}
              >
                <AreaChart
                  data={chartData}
                  margin={{ top: 46, right: 24, bottom: 8, left: 24 }}
                >
                  <defs>
                    <linearGradient
                      id="temperatureLine"
                      x1="0%"
                      x2="100%"
                      y1="0%"
                      y2="0%"
                    >
                      <stop offset="0%" stopColor="#4ea7ff" />
                      <stop offset="50%" stopColor="#8f96a8" />
                      <stop offset="100%" stopColor="#ff6b6b" />
                    </linearGradient>
                    <linearGradient
                      id="temperatureFill"
                      x1="0"
                      x2="0"
                      y1="0"
                      y2="1"
                    >
                      <stop
                        offset="0%"
                        stopColor="#4ea7ff"
                        stopOpacity="0.28"
                      />
                      <stop offset="100%" stopColor="#4ea7ff" stopOpacity="0" />
                    </linearGradient>
                  </defs>
                  <CartesianGrid
                    vertical={false}
                    stroke="rgba(255,255,255,0.06)"
                  />
                  <XAxis
                    dataKey="label"
                    hide
                    padding={{ left: 24, right: 24 }}
                  />
                  <YAxis domain={["dataMin - 0.5", "dataMax + 0.5"]} hide />
                  <Tooltip
                    content={<ChartTooltip />}
                    cursor={{ stroke: "rgba(255,255,255,0.12)" }}
                  />
                  <Area
                    type="natural"
                    dataKey="temperature"
                    name="Temp"
                    stroke="url(#temperatureLine)"
                    fill="url(#temperatureFill)"
                    strokeWidth={3}
                    dot={renderTemperatureDot}
                    activeDot={{
                      r: 5,
                      fill: "#fff",
                      stroke: "#08090d",
                      strokeWidth: 2,
                    }}
                  />
                </AreaChart>
              </ResponsiveContainer>
            </Box>

            <Box h="46dvh" minH="300px" maxH="430px">
              <ResponsiveContainer
                width="100%"
                height="100%"
                minWidth={1}
                minHeight={1}
                initialDimension={{ width: 390, height: 360 }}
              >
                <BarChart
                  data={chartData}
                  margin={{ top: 14, right: 24, bottom: 8, left: 24 }}
                  barCategoryGap="18%"
                >
                  <defs>
                    <linearGradient id="rainFill" x1="0" x2="0" y1="0" y2="1">
                      <stop offset="0%" stopColor="#66e4ff" />
                      <stop offset="100%" stopColor="#2878ff" />
                    </linearGradient>
                  </defs>
                  <CartesianGrid
                    vertical={false}
                    stroke="rgba(255,255,255,0.06)"
                  />
                  <XAxis
                    dataKey="label"
                    interval={2}
                    axisLine={false}
                    tickLine={false}
                    padding={{ left: 24, right: 24 }}
                    tick={{
                      fill: "rgba(255,255,255,0.48)",
                      fontSize: 12,
                      fontWeight: 600,
                    }}
                  />
                  <YAxis domain={[0, maxPrecipitation]} hide />
                  <Tooltip
                    content={<ChartTooltip />}
                    cursor={{ fill: "rgba(255,255,255,0.04)" }}
                  />
                  <Bar
                    dataKey="precipitation"
                    name="Rain"
                    fill="url(#rainFill)"
                    radius={[5, 5, 0, 0]}
                    minPointSize={2}
                  >
                    <LabelList
                      dataKey="precipitation"
                      position="top"
                      formatter={(value) => (value > 0 ? value.toFixed(1) : "")}
                      fill="rgba(255,255,255,0.72)"
                      fontSize={12}
                      fontWeight={700}
                    />
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </Box>

            <HStack
              justify="space-between"
              align="end"
              spacing="0"
              minH="68px"
              overflow="hidden"
              px="6"
            >
              {windPoints.map((point) => (
                <VStack
                  key={point.time}
                  spacing="1"
                  flex="1"
                  minW="0"
                  align="center"
                  color="whiteAlpha.700"
                >
                  <ArrowUp
                    size={19}
                    strokeWidth={2.2}
                    style={{
                      transform: `rotate(${point.windDirection}deg)`,
                      color: "#dce7ee",
                    }}
                  />
                  <Text fontSize="sm" fontWeight="700" lineHeight="1">
                    {Math.round(point.windSpeed)}
                  </Text>
                  <Text
                    fontSize="11px"
                    fontWeight="600"
                    color="whiteAlpha.400"
                    lineHeight="1"
                  >
                    {point.label}
                  </Text>
                </VStack>
              ))}
            </HStack>
          </VStack>
        )}
      </Flex>
    </Flex>
  );
}
