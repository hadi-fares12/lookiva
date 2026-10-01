'use client';

import * as React from 'react';
import { List, MapPin, Search, Target } from 'lucide-react';
import Map, { Marker, NavigationControl, type MapRef } from 'react-map-gl/maplibre';
import 'maplibre-gl/dist/maplibre-gl.css';
import { useNearby } from '@/hooks/useNearby';
import { BusinessCard } from '@/components/shared/BusinessCard';
import { EmptyState } from '@/components/shared/EmptyState';
import { NetworkError } from '@/components/shared/NetworkError';
import { SkeletonCard } from '@/components/shared/SkeletonCard';

const DEFAULT_RADIUS = 3000;
const MAP_STYLE_URL = process.env.NEXT_PUBLIC_MAP_STYLE_URL;

export default function MapPage() {
  const mapRef = React.useRef<MapRef | null>(null);
  const [coords, setCoords] = React.useState<{ lat: number; lon: number } | null>(null);
  const [searchCenter, setSearchCenter] = React.useState<{ lat: number; lon: number } | null>(null);
  const [locationLoading, setLocationLoading] = React.useState(false);
  const [showList, setShowList] = React.useState(false);

  const requestLocation = React.useCallback(() => {
    if (!navigator.geolocation) return;
    setLocationLoading(true);
    navigator.geolocation.getCurrentPosition(
      (position) => {
        const next = { lat: position.coords.latitude, lon: position.coords.longitude };
        setCoords(next);
        setSearchCenter(next);
        setLocationLoading(false);
      },
      () => setLocationLoading(false),
      { timeout: 5000, enableHighAccuracy: false, maximumAge: 60_000 },
    );
  }, []);

  React.useEffect(() => requestLocation(), [requestLocation]);

  const query = useNearby({
    lat: searchCenter?.lat,
    lon: searchCenter?.lon,
    radiusMeters: DEFAULT_RADIUS,
    limit: 50,
    sort: 'nearest',
    enabled: searchCenter != null,
  });
  const businesses = query.data?.items ?? [];

  const searchThisArea = React.useCallback(() => {
    const map = mapRef.current;
    if (!map) return;
    const center = map.getCenter();
    setSearchCenter({ lat: center.lat, lon: center.lng });
  }, []);

  if (!coords && !locationLoading) {
    return (
      <div className="max-w-5xl mx-auto px-4 md:px-6 py-12">
        <EmptyState
          illustration="search"
          title="Location needed"
          description="Allow location access to show real nearby businesses on the map. LOOKIVA does not use a demo location when permission is denied."
          actionLabel="Use current location"
          onAction={requestLocation}
        />
      </div>
    );
  }

  return (
    <div className="relative min-h-[calc(100vh-4rem)] bg-surface-0">
      <div className="absolute top-4 start-4 end-4 z-20 flex items-center justify-between gap-2 pointer-events-none">
        <button
          type="button"
          onClick={searchThisArea}
          disabled={!MAP_STYLE_URL || !coords}
          className="pointer-events-auto inline-flex items-center gap-2 h-10 px-4 rounded-radius-full bg-surface-0/95 border border-border-subtle shadow-shadow-3 disabled:opacity-50"
        >
          <Search className="w-4 h-4" /> Search this area
        </button>
        <div className="flex gap-2 pointer-events-auto">
          <button type="button" onClick={requestLocation} className="w-10 h-10 rounded-radius-full bg-surface-0/95 border border-border-subtle flex items-center justify-center shadow-shadow-3">
            <Target className="w-4 h-4" />
          </button>
          <button type="button" onClick={() => setShowList((value) => !value)} className="w-10 h-10 rounded-radius-full bg-surface-0/95 border border-border-subtle flex items-center justify-center shadow-shadow-3">
            <List className="w-4 h-4" />
          </button>
        </div>
      </div>

      {locationLoading && !coords && (
        <div className="max-w-5xl mx-auto px-4 md:px-6 py-12"><SkeletonCard variant="row" count={4} /></div>
      )}

      {coords && MAP_STYLE_URL && !showList && (
        <div className="h-[calc(100vh-4rem)] w-full">
          <Map
            ref={mapRef}
            initialViewState={{ latitude: coords.lat, longitude: coords.lon, zoom: 13 }}
            mapStyle={MAP_STYLE_URL}
            reuseMaps
          >
            <NavigationControl position="bottom-right" />
            <Marker latitude={coords.lat} longitude={coords.lon} anchor="center">
              <div className="w-4 h-4 rounded-full bg-accent-blue border-2 border-white shadow-shadow-3" aria-label="Your location" />
            </Marker>
            {businesses.map((business) => {
              if (business.latitude == null || business.longitude == null) return null;
              return (
                <Marker key={business.id} latitude={business.latitude} longitude={business.longitude} anchor="bottom">
                  <a
                    href={`./businesses/${business.id}`}
                    className="flex items-center justify-center w-9 h-9 rounded-full bg-surface-0 border-2 border-accent-gold-2 shadow-shadow-3"
                    aria-label={business.companyName}
                  >
                    <MapPin className="w-5 h-5 text-accent-gold-2" />
                  </a>
                </Marker>
              );
            })}
          </Map>
        </div>
      )}

      {coords && !MAP_STYLE_URL && !showList && (
        <div className="max-w-5xl mx-auto px-4 md:px-6 py-20">
          <EmptyState
            illustration="search"
            title="Map provider not configured"
            description="Set NEXT_PUBLIC_MAP_STYLE_URL to your production MapLibre-compatible style. Nearby businesses are still available in list view."
            actionLabel="Show nearby list"
            onAction={() => setShowList(true)}
          />
        </div>
      )}

      {coords && showList && (
        <div className="max-w-5xl mx-auto px-4 md:px-6 pt-20 pb-8">
          {query.isLoading && <SkeletonCard variant="row" count={5} />}
          {!query.isLoading && query.isError && <NetworkError variant="block" onRetry={() => void query.refetch()} />}
          {!query.isLoading && !query.isError && businesses.length === 0 && (
            <EmptyState illustration="search" title="No businesses in this area" description="Move the map or try a nearby area." />
          )}
          {!query.isLoading && !query.isError && businesses.length > 0 && (
            <div className="space-y-3">{businesses.map((business) => <BusinessCard key={business.id} business={business} variant="row" />)}</div>
          )}
        </div>
      )}
    </div>
  );
}
