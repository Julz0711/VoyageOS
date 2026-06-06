'use client';

import { useActionState, useState, useTransition } from 'react';
import { LocateFixed, Loader2, Check } from 'lucide-react';
import {
  createTrip,
  lookupBaseCoordinates,
  type CreateTripState,
} from '@/lib/trips/actions';
import { strings } from '@/lib/strings';
import { Button } from '@/components/ui/button';
import { Input, Label } from '@/components/ui/input';

export function CreateTripForm() {
  const [state, action, pending] = useActionState<CreateTripState, FormData>(createTrip, undefined);
  const [detecting, startDetect] = useTransition();

  const [destination, setDestination] = useState('');
  const [baseLabel, setBaseLabel] = useState('');
  const [lat, setLat] = useState('');
  const [lng, setLng] = useState('');
  const [resolved, setResolved] = useState<string | null>(null);
  const [detectError, setDetectError] = useState<string | null>(null);

  function detect() {
    setResolved(null);
    setDetectError(null);
    startDetect(async () => {
      const res = await lookupBaseCoordinates({ baseLabel, destination });
      if (res.ok) {
        setLat(res.lat.toFixed(5));
        setLng(res.lng.toFixed(5));
        setResolved(res.label);
      } else {
        setDetectError(res.error);
      }
    });
  }

  return (
    <form action={action} className="space-y-4">
      <div>
        <Label htmlFor="name">{strings.trips.name}</Label>
        <Input id="name" name="name" required placeholder="A long weekend in Lisbon" />
      </div>

      <div>
        <Label htmlFor="destination">{strings.trips.destination}</Label>
        <Input
          id="destination"
          name="destination"
          required
          placeholder="Lisbon, Portugal"
          value={destination}
          onChange={(e) => setDestination(e.target.value)}
        />
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div>
          <Label htmlFor="dateStart">{strings.trips.startDate}</Label>
          <Input id="dateStart" name="dateStart" type="date" required />
        </div>
        <div>
          <Label htmlFor="dateEnd">{strings.trips.endDate}</Label>
          <Input id="dateEnd" name="dateEnd" type="date" required />
        </div>
      </div>

      <div>
        <Label htmlFor="baseLabel">{strings.trips.baseLabel}</Label>
        <Input
          id="baseLabel"
          name="baseLabel"
          required
          placeholder="Our apartment · Alfama"
          value={baseLabel}
          onChange={(e) => setBaseLabel(e.target.value)}
        />
      </div>

      <div className="rounded-md border border-border bg-canvas/40 p-3">
        <div className="flex items-center justify-between gap-3">
          <span className="eyebrow text-muted">Base coordinates</span>
          <Button
            type="button"
            variant="secondary"
            size="sm"
            onClick={detect}
            disabled={detecting || !destination.trim()}
          >
            {detecting ? (
              <Loader2 className="size-4 animate-spin" aria-hidden />
            ) : (
              <LocateFixed className="size-4" aria-hidden />
            )}
            {detecting ? 'Detecting…' : 'Auto-detect'}
          </Button>
        </div>

        <div className="mt-3 grid grid-cols-2 gap-3">
          <div>
            <Label htmlFor="baseLat">Latitude</Label>
            <Input
              id="baseLat"
              name="baseLat"
              type="number"
              step="any"
              required
              placeholder="38.7139"
              value={lat}
              onChange={(e) => setLat(e.target.value)}
            />
          </div>
          <div>
            <Label htmlFor="baseLng">Longitude</Label>
            <Input
              id="baseLng"
              name="baseLng"
              type="number"
              step="any"
              required
              placeholder="-9.1331"
              value={lng}
              onChange={(e) => setLng(e.target.value)}
            />
          </div>
        </div>

        {resolved ? (
          <p className="mt-2 flex items-start gap-1.5 text-xs text-success">
            <Check className="mt-0.5 size-3.5 shrink-0" aria-hidden />
            <span>Found: {resolved}</span>
          </p>
        ) : detectError ? (
          <p className="mt-2 text-xs text-danger">{detectError}</p>
        ) : (
          <p className="mt-2 text-xs text-muted">
            Auto-detect from your destination, or fine-tune the coordinates by hand.
          </p>
        )}
      </div>

      {state?.error && <p className="text-sm text-danger">{state.error}</p>}

      <div className="flex justify-end">
        <Button type="submit" disabled={pending}>
          {pending ? strings.common.loading : strings.trips.create}
        </Button>
      </div>
    </form>
  );
}
