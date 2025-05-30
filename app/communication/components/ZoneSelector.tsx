/**
 * ZONE SELECTOR COMPONENT
 * 
 * Dropdown selection for library zones when creating or filtering communication posts.
 * 
 * PURPOSE:
 * Allows users to tag their posts with specific library locations, providing
 * context to readers about which area is being discussed.
 * 
 * CONTEXT:
 * Used within the CreatePost component and FilterBar for location-based
 * content creation and filtering.
 * 
 * DATA FLOW:
 * - Receives zones array from database via props
 * - Maintains selected zone state and passes selection to parent
 * - Returns zone ID string (not the full zone object) for database integration
 * 
 * KEY DEPENDENCIES:
 * - shadcn/ui Select components for dropdown UI
 * - Zone type from communicationTypes
 */

"use client";

import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Zone } from "../types/communicationTypes";

interface ZoneSelectorProps {
  zones: Zone[];
  selectedZone: string | null;
  onSelectZone: (zoneId: string | null) => void;
}

export default function ZoneSelector({ 
  zones, 
  selectedZone, 
  onSelectZone 
}: ZoneSelectorProps) {
  
  /**
   * Handles zone selection from the dropdown
   * 
   * @param zoneId - The ID of the selected zone, or empty string to clear selection
   */
  const handleSelectZone = (zoneId: string) => {
    // If the value is an empty string (from clearing the selection), set to null
    if (!zoneId) {
      onSelectZone(null);
      return;
    }

    onSelectZone(zoneId);
  };

  return (
    <Select 
      value={selectedZone || ""} 
      onValueChange={handleSelectZone}
    >
      <SelectTrigger className="w-[180px]">
        <SelectValue placeholder="Select zone (optional)" />
      </SelectTrigger>
      <SelectContent>
        {zones.map((zone) => (
          <SelectItem key={zone.id} value={zone.id}>
            {zone.name} (Floor {zone.floor})
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
} 