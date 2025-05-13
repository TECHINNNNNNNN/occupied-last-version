/**
 * COMPONENT: CustomTooltip
 * PURPOSE: Provides a styled tooltip for chart data points
 * CONTEXT: Used within chart components to show data details on hover
 * DATA FLOW: Receives active state and payload data from the chart component
 * KEY DEPENDENCIES: None - pure presentational component
 */

import { CustomTooltipProps } from '../types';

/**
 * A customized tooltip component for chart data visualization
 * Shows tooltip only when active with formatted content
 */
const CustomTooltip = ({ active, payload, label }: CustomTooltipProps) => {
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

export default CustomTooltip; 