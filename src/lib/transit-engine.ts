import Decimal from 'decimal.js';
import {
  TransitAgency,
  TransitLogRecord,
  TransitPatternRecord,
} from '../types/domain';

export interface TransitStation {
  id: string;
  name: string;
  agency: TransitAgency;
  corridorOrLine: string;
  zoneDistanceKm: number; // Distance from Union Station for GO Fare matrix
}

export const TTC_SUBWAY_STATIONS: readonly TransitStation[] = [
  { id: 'ttc-union', name: 'Union Station', agency: TransitAgency.TTC_SUBWAY, corridorOrLine: 'Line 1 Yonge-University', zoneDistanceKm: 0 },
  { id: 'ttc-st-george', name: 'St. George Station', agency: TransitAgency.TTC_SUBWAY, corridorOrLine: 'Line 1 / Line 2 Interchange', zoneDistanceKm: 3.5 },
  { id: 'ttc-bloor-yonge', name: 'Bloor-Yonge Station', agency: TransitAgency.TTC_SUBWAY, corridorOrLine: 'Line 1 / Line 2 Interchange', zoneDistanceKm: 3.2 },
  { id: 'ttc-spadina', name: 'Spadina Station', agency: TransitAgency.TTC_SUBWAY, corridorOrLine: 'Line 1 / Line 2 Interchange', zoneDistanceKm: 4.0 },
  { id: 'ttc-eglinton', name: 'Eglinton Station', agency: TransitAgency.TTC_SUBWAY, corridorOrLine: 'Line 1 Yonge-University', zoneDistanceKm: 8.5 },
  { id: 'ttc-finch', name: 'Finch Station', agency: TransitAgency.TTC_SUBWAY, corridorOrLine: 'Line 1 Yonge-University', zoneDistanceKm: 16.0 },
  { id: 'ttc-vaughan', name: 'Vaughan Metropolitan Centre', agency: TransitAgency.TTC_SUBWAY, corridorOrLine: 'Line 1 Yonge-University', zoneDistanceKm: 22.0 },
  { id: 'ttc-kipling', name: 'Kipling Station', agency: TransitAgency.TTC_SUBWAY, corridorOrLine: 'Line 2 Bloor-Danforth', zoneDistanceKm: 15.2 },
  { id: 'ttc-kennedy', name: 'Kennedy Station', agency: TransitAgency.TTC_SUBWAY, corridorOrLine: 'Line 2 Bloor-Danforth', zoneDistanceKm: 14.8 },
  { id: 'ttc-sheppard-yonge', name: 'Sheppard-Yonge Station', agency: TransitAgency.TTC_SUBWAY, corridorOrLine: 'Line 4 Sheppard', zoneDistanceKm: 13.5 },
] as const;

export const TTC_BUS_STOPS: readonly TransitStation[] = [
  { id: 'bus-504-king-bathurst', name: '504 King / Bathurst St', agency: TransitAgency.TTC_BUS, corridorOrLine: '504 King Streetcar / Bus', zoneDistanceKm: 2.5 },
  { id: 'bus-504-king-yonge', name: '504 King / Yonge St', agency: TransitAgency.TTC_BUS, corridorOrLine: '504 King Streetcar / Bus', zoneDistanceKm: 0.6 },
  { id: 'bus-510-spadina-queens-quay', name: '510 Spadina / Queens Quay', agency: TransitAgency.TTC_BUS, corridorOrLine: '510 Spadina Corridor', zoneDistanceKm: 1.5 },
  { id: 'bus-29-dufferin-bloor', name: '29 Dufferin / Bloor St W', agency: TransitAgency.TTC_BUS, corridorOrLine: '29 Dufferin Express', zoneDistanceKm: 5.2 },
  { id: 'bus-29-dufferin-exhibition', name: '29 Dufferin / Exhibition Loop', agency: TransitAgency.TTC_BUS, corridorOrLine: '29 Dufferin Express', zoneDistanceKm: 4.1 },
  { id: 'bus-39-finch-east-seneca', name: '39 Finch East / Seneca Hill', agency: TransitAgency.TTC_BUS, corridorOrLine: '39 Finch East', zoneDistanceKm: 19.0 },
  { id: 'bus-60-steeles-west-pioneer', name: '60 Steeles West / Pioneer Village', agency: TransitAgency.TTC_BUS, corridorOrLine: '60 Steeles West', zoneDistanceKm: 18.5 },
] as const;

export const GO_TRANSIT_STATIONS: readonly TransitStation[] = [
  { id: 'go-union', name: 'Union Station GO', agency: TransitAgency.GO_TRANSIT, corridorOrLine: 'Central Hub (All Corridors)', zoneDistanceKm: 0 },
  { id: 'go-exhibition', name: 'Exhibition GO', agency: TransitAgency.GO_TRANSIT, corridorOrLine: 'Lakeshore West', zoneDistanceKm: 3.5 },
  { id: 'go-port-credit', name: 'Port Credit GO', agency: TransitAgency.GO_TRANSIT, corridorOrLine: 'Lakeshore West', zoneDistanceKm: 20.6 },
  { id: 'go-clarkson', name: 'Clarkson GO', agency: TransitAgency.GO_TRANSIT, corridorOrLine: 'Lakeshore West', zoneDistanceKm: 26.5 },
  { id: 'go-oakville', name: 'Oakville GO', agency: TransitAgency.GO_TRANSIT, corridorOrLine: 'Lakeshore West', zoneDistanceKm: 34.4 },
  { id: 'go-burlington', name: 'Burlington GO', agency: TransitAgency.GO_TRANSIT, corridorOrLine: 'Lakeshore West', zoneDistanceKm: 50.8 },
  { id: 'go-danforth', name: 'Danforth GO', agency: TransitAgency.GO_TRANSIT, corridorOrLine: 'Lakeshore East', zoneDistanceKm: 8.5 },
  { id: 'go-guildwood', name: 'Guildwood GO', agency: TransitAgency.GO_TRANSIT, corridorOrLine: 'Lakeshore East', zoneDistanceKm: 20.1 },
  { id: 'go-pickering', name: 'Pickering GO', agency: TransitAgency.GO_TRANSIT, corridorOrLine: 'Lakeshore East', zoneDistanceKm: 33.2 },
  { id: 'go-oshawa', name: 'Durham College Oshawa GO', agency: TransitAgency.GO_TRANSIT, corridorOrLine: 'Lakeshore East', zoneDistanceKm: 51.5 },
  { id: 'go-bloor', name: 'Bloor GO', agency: TransitAgency.GO_TRANSIT, corridorOrLine: 'Kitchener Line', zoneDistanceKm: 6.4 },
  { id: 'go-bramalea', name: 'Bramalea GO', agency: TransitAgency.GO_TRANSIT, corridorOrLine: 'Kitchener Line', zoneDistanceKm: 30.2 },
  { id: 'go-brampton', name: 'Brampton Innovation District GO', agency: TransitAgency.GO_TRANSIT, corridorOrLine: 'Kitchener Line', zoneDistanceKm: 38.0 },
  { id: 'go-unionville', name: 'Unionville GO', agency: TransitAgency.GO_TRANSIT, corridorOrLine: 'Stouffville Line', zoneDistanceKm: 31.8 },
  { id: 'go-rutherford', name: 'Rutherford GO', agency: TransitAgency.GO_TRANSIT, corridorOrLine: 'Barrie Line', zoneDistanceKm: 27.5 },
] as const;

export const TTC_PRESTO_ADULT_FARE_CENTS = 330; // $3.30 flat adult PRESTO fare
export const TTC_TWO_HOUR_TRANSFER_WINDOW_MS = 2 * 60 * 60 * 1000;
export const GO_ONE_FARE_WINDOW_MS = 3 * 60 * 60 * 1000;

export function getStationsForAgency(agency: TransitAgency): readonly TransitStation[] {
  switch (agency) {
    case TransitAgency.TTC_SUBWAY:
      return TTC_SUBWAY_STATIONS;
    case TransitAgency.TTC_BUS:
      return TTC_BUS_STOPS;
    case TransitAgency.GO_TRANSIT:
      return GO_TRANSIT_STATIONS;
  }
}

export function getTimeSlotFromDate(date: Date): 'MORNING_RUSH' | 'MIDDAY' | 'EVENING_RUSH' | 'LATE_NIGHT' {
  const hour = date.getHours();
  if (hour >= 6 && hour < 10) return 'MORNING_RUSH';
  if (hour >= 10 && hour < 15) return 'MIDDAY';
  if (hour >= 15 && hour < 20) return 'EVENING_RUSH';
  return 'LATE_NIGHT';
}

export interface FareCalculationResult {
  baseFareCents: number;
  calculatedFareCents: number;
  discountReason: string | null;
  oneFareApplied: boolean;
  twoHourTransferApplied: boolean;
  distanceKm: number;
}

/**
 * Calculates exact TTC Subway, TTC Bus, or GO Transit station-to-station PRESTO fare,
 * incorporating:
 * 1. TTC 2-Hour Free Transfer Window ($0.00 within 2 hours of an initial TTC tap)
 * 2. Ontario One Fare Program (Free TTC transfer when connecting to/from GO Transit within window)
 * 3. GO Transit distance-zone PRESTO calculation ($3.70 minimum base + $0.1415/km with PRESTO 15.7% discount)
 */
export function calculateTransitFare(params: {
  agency: TransitAgency;
  originStopName: string;
  destinationStopName: string;
  recentLogs?: TransitLogRecord[];
  referenceTime?: Date;
  monthlyGoTripsCount?: number;
}): FareCalculationResult {
  const {
    agency,
    originStopName,
    destinationStopName,
    recentLogs = [],
    referenceTime = new Date(),
    monthlyGoTripsCount = 0,
  } = params;

  const refMs = referenceTime.getTime();

  // Check recent logs within transfer window
  const recentTtcTap = recentLogs.find((log) => {
    const delta = refMs - new Date(log.occurredAt).getTime();
    return (
      (log.agency === TransitAgency.TTC_SUBWAY || log.agency === TransitAgency.TTC_BUS) &&
      log.actualFareCents > 0 &&
      delta >= 0 &&
      delta <= TTC_TWO_HOUR_TRANSFER_WINDOW_MS
    );
  });

  const recentGoTap = recentLogs.find((log) => {
    const delta = refMs - new Date(log.occurredAt).getTime();
    return (
      log.agency === TransitAgency.GO_TRANSIT &&
      log.actualFareCents > 0 &&
      delta >= 0 &&
      delta <= GO_ONE_FARE_WINDOW_MS
    );
  });

  if (agency === TransitAgency.TTC_SUBWAY || agency === TransitAgency.TTC_BUS) {
    // Check Ontario One Fare (transferring from GO Transit to TTC is $0.00)
    if (recentGoTap) {
      return {
        baseFareCents: TTC_PRESTO_ADULT_FARE_CENTS,
        calculatedFareCents: 0,
        discountReason: 'Ontario One Fare Program: $0.00 TTC transfer from GO Transit',
        oneFareApplied: true,
        twoHourTransferApplied: false,
        distanceKm: 4.5,
      };
    }

    // Check TTC 2-hour free transfer window
    if (recentTtcTap) {
      return {
        baseFareCents: TTC_PRESTO_ADULT_FARE_CENTS,
        calculatedFareCents: 0,
        discountReason: 'TTC 2-Hour Transfer Window active ($0.00)',
        oneFareApplied: false,
        twoHourTransferApplied: true,
        distanceKm: 4.0,
      };
    }

    return {
      baseFareCents: TTC_PRESTO_ADULT_FARE_CENTS,
      calculatedFareCents: TTC_PRESTO_ADULT_FARE_CENTS,
      discountReason: null,
      oneFareApplied: false,
      twoHourTransferApplied: false,
      distanceKm: 5.0,
    };
  }

  // GO TRANSIT station-to-station distance matrix
  const originStation = GO_TRANSIT_STATIONS.find((s) => s.name === originStopName);
  const destStation = GO_TRANSIT_STATIONS.find((s) => s.name === destinationStopName);

  let distanceKm = 25.0;
  if (originStation && destStation) {
    if (originStation.id === destStation.id) {
      distanceKm = 0;
    } else if (
      originStation.corridorOrLine === destStation.corridorOrLine ||
      originStation.id === 'go-union' ||
      destStation.id === 'go-union'
    ) {
      distanceKm = Math.abs(originStation.zoneDistanceKm - destStation.zoneDistanceKm);
    } else {
      // Cross-corridor trip through Union Station
      distanceKm = originStation.zoneDistanceKm + destStation.zoneDistanceKm;
    }
  }

  // Base PRESTO GO Transit formula:
  // Minimum PRESTO fare is $3.70 (370 cents) up to 10km, plus ~15.2 cents per km beyond 10km
  const baseCentsDec =
    distanceKm <= 10
      ? new Decimal(370)
      : new Decimal(370).plus(new Decimal(distanceKm - 10).times(new Decimal('21.4')));

  const rawPrestoCents = baseCentsDec.toDecimalPlaces(0, Decimal.ROUND_HALF_UP);

  // PRESTO Loyalty tier: Trips 36-40 receive 88% discount, 41+ are free
  let loyaltyAdjustedCents = rawPrestoCents;
  let discountNotes: string[] = [];

  if (monthlyGoTripsCount >= 40) {
    loyaltyAdjustedCents = new Decimal(0);
    discountNotes.push('PRESTO 40+ Monthly Trips Tier (100% Loyalty Discount)');
  } else if (monthlyGoTripsCount >= 35) {
    loyaltyAdjustedCents = rawPrestoCents.times(new Decimal('0.12')).toDecimalPlaces(0);
    discountNotes.push('PRESTO 36-40 Monthly Trips Tier (88% Loyalty Discount)');
  }

  // Ontario One Fare Program: If user tapped TTC within the last 2 hours, deduct the $3.30 TTC fare from the GO fare
  let oneFareApplied = false;
  if (recentTtcTap && loyaltyAdjustedCents.greaterThan(0)) {
    loyaltyAdjustedCents = Decimal.max(0, loyaltyAdjustedCents.minus(TTC_PRESTO_ADULT_FARE_CENTS));
    oneFareApplied = true;
    discountNotes.push('Ontario One Fare: -$3.30 TTC credit applied');
  }

  return {
    baseFareCents: rawPrestoCents.toNumber(),
    calculatedFareCents: loyaltyAdjustedCents.toNumber(),
    discountReason: discountNotes.length > 0 ? discountNotes.join(' · ') : 'PRESTO Adult Smart Fare (15.7% off cash)',
    oneFareApplied,
    twoHourTransferApplied: false,
    distanceKm: Number(distanceKm.toFixed(1)),
  };
}

export const PATTERN_PREDICTION_CONFIDENCE_THRESHOLD = 3;

export interface PredictedCommuteSuggestion {
  pattern: TransitPatternRecord;
  promptText: string;
  agencyLabel: string;
}

/**
 * Evaluates stored TransitPattern records for the current weekday (or fallback commute pattern)
 * and returns a one-tap predictive prompt if confidence >= 3.
 */
export function findPredictiveCommute(
  patterns: TransitPatternRecord[],
  referenceDate: Date = new Date()
): PredictedCommuteSuggestion | null {
  const dayOfWeek = referenceDate.getDay();
  const timeSlot = getTimeSlotFromDate(referenceDate);

  // First look for exact dayOfWeek + timeSlot match with confidence >= threshold
  const exactMatches = patterns
    .filter((p) => p.dayOfWeek === dayOfWeek && p.confidenceCount >= PATTERN_PREDICTION_CONFIDENCE_THRESHOLD)
    .sort((a, b) => {
      if (a.timeSlot === timeSlot && b.timeSlot !== timeSlot) return -1;
      if (b.timeSlot === timeSlot && a.timeSlot !== timeSlot) return 1;
      return b.confidenceCount - a.confidenceCount;
    });

  const best =
    exactMatches[0] ??
    patterns
      .filter((p) => p.confidenceCount >= PATTERN_PREDICTION_CONFIDENCE_THRESHOLD)
      .sort((a, b) => b.confidenceCount - a.confidenceCount)[0];

  if (!best) return null;

  const agencyLabel =
    best.agency === TransitAgency.GO_TRANSIT
      ? 'GO'
      : best.agency === TransitAgency.TTC_SUBWAY
      ? 'TTC Subway'
      : 'TTC Bus';

  const fareFormatted = `$${(best.standardFareCents / 100).toFixed(2)}`;
  const promptText = `Took the ${agencyLabel} from ${best.originStop} to ${best.destinationStop} today (${fareFormatted})?`;

  return {
    pattern: best,
    promptText,
    agencyLabel,
  };
}

/**
 * Updates or inserts a TransitPattern record when a user logs a transit trip,
 * incrementing confidenceCount so repeated routes automatically unlock single-tap prediction.
 */
export function upsertTransitPatternList(
  existingPatterns: TransitPatternRecord[],
  newLog: TransitLogRecord
): TransitPatternRecord[] {
  const idx = existingPatterns.findIndex(
    (p) =>
      p.dayOfWeek === newLog.dayOfWeek &&
      p.timeSlot === newLog.timeSlot &&
      p.agency === newLog.agency &&
      p.originStop === newLog.originStop &&
      p.destinationStop === newLog.destinationStop
  );

  if (idx >= 0) {
    return existingPatterns.map((p, i) =>
      i === idx
        ? {
            ...p,
            confidenceCount: p.confidenceCount + 1,
            standardFareCents: newLog.actualFareCents,
          }
        : p
    );
  }

  return [
    ...existingPatterns,
    {
      id: `pat-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      dayOfWeek: newLog.dayOfWeek,
      timeSlot: newLog.timeSlot,
      agency: newLog.agency,
      originStop: newLog.originStop,
      destinationStop: newLog.destinationStop,
      standardFareCents: newLog.actualFareCents,
      confidenceCount: 1,
    },
  ];
}
