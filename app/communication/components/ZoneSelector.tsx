"use client";

/**
 * ZONE SELECTOR COMPONENT
 * 
 * This component provides a dropdown selection for library zones.
 * Users can tag a specific zone in the library when creating a post,
 * allowing for location-specific updates and filtering.
 * 
 * CONTEXT:
 * Part of the communication platform's location tagging system, helping users
 * provide context about which area of the library they're discussing.
 * 
 * DATA FLOW:
 * - Receives the currently selected zone and a callback for when selection changes
 * - Uses mock zone data for the dropdown options
 * - Passes the selected zone object back to the parent component
 * 
 * KEY DEPENDENCIES:
 * - shadcn/ui Select components
 * - MOCK_ZONES data from mockCommunicationData
 */

import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { MOCK_ZONES, Zone } from "../utils/mockCommunicationData";

interface ZoneSelectorProps {
  selectedZone: Zone | null;
  onSelectZone: (zone: Zone | null) => void;
}

/**
 * Dropdown for selecting library zones
 * 
 * @param selectedZone - Currently selected zone or null
 * @param onSelectZone - Callback function when zone selection changes
 * @returns A dropdown component for selecting library zones
 */
export default function ZoneSelector({ 
  selectedZone, 
  onSelectZone 
}: ZoneSelectorProps) {
  
  /**
   * Handles zone selection from the dropdown
   * 
   * @param zoneId - The ID of the selected zone, or "none" to clear selection
   */
  const handleSelectZone = (zoneId: string) => {
    if (zoneId === "none") {
      onSelectZone(null);
      return;
    }

    const zone = MOCK_ZONES.find((zone) => zone.id === zoneId);
    if (zone) {
      onSelectZone(zone);
    }
  };

  return (
    <Select 
      value={selectedZone?.id || "none"} 
      onValueChange={handleSelectZone}
    >
      <SelectTrigger className="w-[200px]">
        <SelectValue placeholder="Tag a library zone" />
      </SelectTrigger>
      <SelectContent>
        <SelectItem value="none">No zone tag</SelectItem>
        {MOCK_ZONES.map((zone) => (
          <SelectItem key={zone.id} value={zone.id}>
            {zone.name} (Floor {zone.floor})
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
} 