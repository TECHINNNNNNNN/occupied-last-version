# Chulalongkorn Engineering Library Occupancy Monitoring System

## Implementation Plan

### 1. Install Required Libraries

```bash
npm install recharts react-gauge-component @faker-js/faker chroma-js
```

### 2. Create Mock Data Utility

```typescript
// utils/mockOccupancyData.ts
import { faker } from "@faker-js/faker";

// Define library zones
export const LIBRARY_ZONES = [
  { id: "zone1", name: "Main Reading Area", capacity: 120, floor: 1 },
  { id: "zone2", name: "Quiet Study Zone", capacity: 60, floor: 1 },
  { id: "zone3", name: "Group Study Rooms", capacity: 40, floor: 2 },
  { id: "zone4", name: "Computer Lab", capacity: 30, floor: 2 },
  { id: "zone5", name: "Research Commons", capacity: 50, floor: 3 },
];

// Generate current occupancy data
export function generateCurrentOccupancy() {
  const now = new Date();
  const hour = now.getHours();

  // Library is closed outside of operating hours (8am-10pm)
  if (hour < 8 || hour > 22) {
    return LIBRARY_ZONES.map((zone) => ({
      ...zone,
      current: 0,
      percentage: 0,
      status: "Closed",
    }));
  }

  // Create realistic occupancy based on time of day
  return LIBRARY_ZONES.map((zone) => {
    // Time-based patterns
    let baseOccupancyFactor;

    // Morning: gradually increases
    if (hour < 12) {
      baseOccupancyFactor = 0.3 + (hour - 8) * 0.1;
    }
    // Afternoon: peak hours
    else if (hour < 18) {
      baseOccupancyFactor = 0.7 + Math.random() * 0.2;
    }
    // Evening: gradually decreases
    else {
      baseOccupancyFactor = 0.8 - (hour - 18) * 0.1;
    }

    // Weekend adjustment
    const dayOfWeek = now.getDay();
    const isWeekend = dayOfWeek === 0 || dayOfWeek === 6;
    const weekendFactor = isWeekend ? 0.7 : 1;

    // Add natural variation per zone
    let zoneFactor = 1;
    switch (zone.id) {
      case "zone1":
        zoneFactor = 0.9 + Math.random() * 0.2; // Main reading always busy
        break;
      case "zone2":
        zoneFactor = 0.7 + Math.random() * 0.3; // Quiet study variable
        break;
      case "zone3":
        zoneFactor = hour > 15 ? 0.9 : 0.5; // Group rooms busier in evenings
        break;
      case "zone4":
        zoneFactor = hour < 14 ? 0.9 : 0.6; // Computer lab busier in mornings
        break;
      case "zone5":
        zoneFactor = 0.5 + Math.random() * 0.4; // Research commons variable
        break;
    }

    // Calculate final occupancy with some randomness
    const baseOccupancy = Math.floor(
      zone.capacity * baseOccupancyFactor * weekendFactor * zoneFactor
    );

    // Add natural variation
    const randomVariation = Math.floor(
      zone.capacity * 0.1 * (Math.random() - 0.5)
    );
    const current = Math.max(
      0,
      Math.min(zone.capacity, baseOccupancy + randomVariation)
    );
    const percentage = current / zone.capacity;

    // Determine status
    let status;
    if (percentage < 0.3) status = "Low";
    else if (percentage < 0.6) status = "Moderate";
    else if (percentage < 0.85) status = "High";
    else status = "Very High";

    return {
      ...zone,
      current,
      percentage,
      status,
    };
  });
}

// Generate historical occupancy data for trend charts
export function generateHistoricalData(hours = 12) {
  const data = [];
  const now = new Date();

  // Generate data for each hour
  for (let i = 0; i < hours; i++) {
    const time = new Date(now);
    time.setHours(now.getHours() - i);

    // Skip hours when library is closed
    const hour = time.getHours();
    if (hour < 8 || hour > 22) continue;

    // Calculate total occupancy for this hour
    let totalOccupancy = 0;
    let totalCapacity = 0;

    const zoneData = LIBRARY_ZONES.map((zone) => {
      // Similar logic to current occupancy but with more randomness for historical data
      let baseOccupancyFactor;

      if (hour < 12) {
        baseOccupancyFactor = 0.3 + (hour - 8) * 0.1;
      } else if (hour < 18) {
        baseOccupancyFactor = 0.7 + Math.random() * 0.2;
      } else {
        baseOccupancyFactor = 0.8 - (hour - 18) * 0.1;
      }

      const dayOfWeek = time.getDay();
      const isWeekend = dayOfWeek === 0 || dayOfWeek === 6;
      const weekendFactor = isWeekend ? 0.7 : 1;

      // More randomness for historical data
      const randomFactor = 0.7 + Math.random() * 0.6;

      const count = Math.floor(
        zone.capacity * baseOccupancyFactor * weekendFactor * randomFactor
      );
      const capped = Math.max(0, Math.min(zone.capacity, count));

      totalOccupancy += capped;
      totalCapacity += zone.capacity;

      return {
        id: zone.id,
        name: zone.name,
        count: capped,
        capacity: zone.capacity,
        percentage: capped / zone.capacity,
      };
    });

    data.push({
      time: time.toISOString(),
      hour: time.getHours(),
      formattedTime: `${time.getHours()}:00`,
      overall: totalOccupancy / totalCapacity,
      totalOccupancy,
      totalCapacity,
      zones: zoneData,
    });
  }

  // Sort chronologically (oldest to newest)
  return data.sort(
    (a, b) => new Date(a.time).getTime() - new Date(b.time).getTime()
  );
}

// Get overall library occupancy
export function getOverallOccupancy() {
  const zoneData = generateCurrentOccupancy();
  const totalOccupied = zoneData.reduce((sum, zone) => sum + zone.current, 0);
  const totalCapacity = zoneData.reduce((sum, zone) => sum + zone.capacity, 0);

  const percentage = totalOccupied / totalCapacity;

  let status;
  if (percentage < 0.3) status = "Low";
  else if (percentage < 0.6) status = "Moderate";
  else if (percentage < 0.85) status = "High";
  else status = "Very High";

  return {
    occupied: totalOccupied,
    capacity: totalCapacity,
    percentage,
    status,
    zones: zoneData,
  };
}
```

### 3. Create Main Occupancy Page Structure

```typescript
// app/occupancy/page.tsx
import { Suspense } from "react";
import OccupancyDashboard from "./components/OccupancyDashboard";

export default function OccupancyPage() {
  return (
    <div className="container mx-auto p-4">
      <h1 className="text-2xl font-bold mb-6">Library Occupancy</h1>

      <Suspense
        fallback={
          <div className="text-center py-10">Loading occupancy data...</div>
        }
      >
        <OccupancyDashboard />
      </Suspense>
    </div>
  );
}
```

### 4. Create Main Dashboard Component

```typescript
// app/occupancy/components/OccupancyDashboard.tsx
"use client";

import { useState, useEffect } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  getOverallOccupancy,
  generateCurrentOccupancy,
  generateHistoricalData,
} from "@/utils/mockOccupancyData";
import OccupancyGauge from "./OccupancyGauge";
import OccupancyZones from "./OccupancyZones";
import OccupancyTrends from "./OccupancyTrends";

export default function OccupancyDashboard() {
  const [overallData, setOverallData] = useState(null);
  const [zonesData, setZonesData] = useState([]);
  const [historicalData, setHistoricalData] = useState([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    // Fetch initial data
    const fetchData = () => {
      try {
        // In a real app, this would be API calls
        const overall = getOverallOccupancy();
        const zones = generateCurrentOccupancy();
        const historical = generateHistoricalData(12); // Last 12 hours

        setOverallData(overall);
        setZonesData(zones);
        setHistoricalData(historical);
      } catch (error) {
        console.error("Error fetching occupancy data:", error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchData();

    // Set up polling for real-time updates (every minute)
    const intervalId = setInterval(fetchData, 60000);

    return () => clearInterval(intervalId);
  }, []);

  if (isLoading) {
    return <div className="text-center py-10">Loading occupancy data...</div>;
  }

  return (
    <div className="space-y-6">
      {/* Overall Occupancy */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card className="md:col-span-1">
          <CardHeader>
            <CardTitle>Current Occupancy</CardTitle>
            <CardDescription>Overall library space utilization</CardDescription>
          </CardHeader>
          <CardContent>
            <OccupancyGauge data={overallData} />
          </CardContent>
        </Card>

        <Card className="md:col-span-2">
          <CardHeader>
            <CardTitle>Occupancy Trends</CardTitle>
            <CardDescription>Occupancy patterns over time</CardDescription>
          </CardHeader>
          <CardContent>
            <OccupancyTrends data={historicalData} />
          </CardContent>
        </Card>
      </div>

      {/* Zone Details */}
      <Card>
        <CardHeader>
          <CardTitle>Zone Occupancy</CardTitle>
          <CardDescription>Current occupancy by library zone</CardDescription>
        </CardHeader>
        <CardContent>
          <OccupancyZones data={zonesData} />
        </CardContent>
      </Card>
    </div>
  );
}
```

### 5. Create Gauge Component for Overall Occupancy

```typescript
// app/occupancy/components/OccupancyGauge.tsx
"use client";

import { GaugeComponent } from "react-gauge-component";

interface OccupancyGaugeProps {
  data: {
    percentage: number;
    occupied: number;
    capacity: number;
    status: string;
  };
}

export default function OccupancyGauge({ data }: OccupancyGaugeProps) {
  // Determine color based on occupancy percentage
  const getColor = () => {
    const p = data.percentage;
    if (p < 0.3) return "#22c55e"; // green
    if (p < 0.6) return "#f59e0b"; // amber
    if (p < 0.85) return "#f97316"; // orange
    return "#ef4444"; // red
  };

  return (
    <div className="flex flex-col items-center justify-center space-y-4">
      <div className="w-full">
        <GaugeComponent
          id="occupancy-gauge"
          type="radial"
          arc={{
            width: 0.2,
            padding: 0.05,
            subArcs: [
              {
                limit: 30,
                color: "#22c55e",
                showTick: true,
              },
              {
                limit: 60,
                color: "#f59e0b",
                showTick: true,
              },
              {
                limit: 85,
                color: "#f97316",
                showTick: true,
              },
              {
                limit: 100,
                color: "#ef4444",
                showTick: true,
              },
            ],
          }}
          pointer={{
            elastic: true,
            animationDelay: 0,
          }}
          value={data.percentage * 100}
          minValue={0}
          maxValue={100}
          labels={{
            valueLabel: {
              formatTextValue: (value) => `${Math.round(value)}%`,
              style: { fontSize: "1.5rem", fontWeight: "bold" },
            },
          }}
        />
      </div>

      <div className="text-center space-y-1">
        <div
          className="text-sm font-semibold rounded-full px-3 py-1 inline-block"
          style={{
            backgroundColor: getColor(),
            color: data.percentage > 0.5 ? "white" : "black",
          }}
        >
          {data.status}
        </div>

        <p className="text-gray-600 font-medium">
          {data.occupied} / {data.capacity} spots occupied
        </p>
      </div>
    </div>
  );
}
```

### 6. Create Zone Occupancy Component

```typescript
// app/occupancy/components/OccupancyZones.tsx
"use client";

import { useState } from "react";
import { Progress } from "@/components/ui/progress";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import chroma from "chroma-js";

interface OccupancyZonesProps {
  data: any[];
}

export default function OccupancyZones({ data }: OccupancyZonesProps) {
  const [selectedFloor, setSelectedFloor] = useState("all");

  // Create a color scale from green to red
  const colorScale = chroma
    .scale(["#22c55e", "#f59e0b", "#ef4444"])
    .domain([0, 1]);

  // Get unique floors for tabs
  const floors = [...new Set(data.map((zone) => zone.floor))].sort();

  // Filter zones by selected floor
  const filteredZones =
    selectedFloor === "all"
      ? data
      : data.filter((zone) => zone.floor === parseInt(selectedFloor));

  return (
    <div>
      <Tabs defaultValue="all" onValueChange={setSelectedFloor}>
        <TabsList className="mb-4">
          <TabsTrigger value="all">All Floors</TabsTrigger>
          {floors.map((floor) => (
            <TabsTrigger key={floor} value={floor.toString()}>
              Floor {floor}
            </TabsTrigger>
          ))}
        </TabsList>

        <div className="space-y-4">
          {filteredZones.map((zone) => {
            const color = colorScale(zone.percentage).hex();

            return (
              <div key={zone.id} className="flex items-center space-x-4">
                <div className="flex-1">
                  <div className="flex justify-between mb-1">
                    <div>
                      <span className="font-medium">{zone.name}</span>
                      <span className="text-xs text-gray-500 ml-2">
                        Floor {zone.floor}
                      </span>
                    </div>
                    <span className="text-sm text-gray-600">
                      {zone.current} / {zone.capacity}
                    </span>
                  </div>
                  <Progress
                    value={zone.percentage * 100}
                    className="h-2"
                    style={
                      {
                        "--progress-background": color,
                      } as React.CSSProperties
                    }
                  />
                </div>
                <div
                  className="text-sm font-medium rounded-full px-2 py-1"
                  style={{
                    backgroundColor: color,
                    color: zone.percentage > 0.5 ? "white" : "black",
                  }}
                >
                  {Math.round(zone.percentage * 100)}%
                </div>
              </div>
            );
          })}
        </div>
      </Tabs>
    </div>
  );
}
```

### 7. Create Trends Chart Component

```typescript
// app/occupancy/components/OccupancyTrends.tsx
"use client";

import { useState, useEffect } from "react";
import { format, parseISO } from "date-fns";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from "recharts";

interface OccupancyTrendsProps {
  data: any[];
}

export default function OccupancyTrends({ data }: OccupancyTrendsProps) {
  const [chartData, setChartData] = useState([]);

  // Format data for the chart
  useEffect(() => {
    const formattedData = data.map((item) => ({
      time: item.formattedTime,
      occupancy: Math.round(item.overall * 100),
    }));

    setChartData(formattedData);
  }, [data]);

  // Custom tooltip
  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-white p-2 border rounded shadow-sm text-sm">
          <p className="font-medium">{label}</p>
          <p>
            Occupancy:{" "}
            <span className="font-semibold">{payload[0].value}%</span>
          </p>
        </div>
      );
    }

    return null;
  };

  return (
    <div className="h-[300px] w-full">
      <ResponsiveContainer width="100%" height="100%">
        <LineChart
          data={chartData}
          margin={{ top: 10, right: 10, left: 0, bottom: 10 }}
        >
          <CartesianGrid strokeDasharray="3 3" opacity={0.3} />
          <XAxis
            dataKey="time"
            tickFormatter={(value) => value}
            tick={{ fontSize: 12 }}
          />
          <YAxis
            tickFormatter={(value) => `${value}%`}
            domain={[0, 100]}
            tick={{ fontSize: 12 }}
          />
          <Tooltip content={<CustomTooltip />} />
          <Legend />
          <Line
            type="monotone"
            dataKey="occupancy"
            name="Occupancy"
            stroke="#3b82f6"
            strokeWidth={2}
            dot={false}
            activeDot={{ r: 6 }}
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}
```

### 8. Update Navigation to Include Occupancy Link

Make sure to update your navigation component to include a link to the occupancy page:

```typescript
// components/navigation.tsx (or similar)
const navItems = [
  // ...existing items
  {
    title: "Occupancy",
    href: "/occupancy",
    icon: LibraryIcon, // Or another appropriate icon
  },
  // ...other items
];
```

### 9. Implementation Timeline

1. **Day 1**: Set up project structure, install libraries, create mock data utilities
2. **Day 2**: Implement the Occupancy Gauge and Zone Occupancy components
3. **Day 3**: Implement the Trends Chart component and integrate everything
4. **Day 4**: Polish UI, add loading states, and test across devices

### 10. Future Enhancements

1. **Real-time data integration**: Replace mock data with actual sensor data when available
2. **Predictive analytics**: Add time-based predictions for future occupancy
3. **Notifications**: Add alerts when favorite zones reach capacity thresholds
4. **Interactive floor maps**: Add visual floor maps with color-coded occupancy levels
