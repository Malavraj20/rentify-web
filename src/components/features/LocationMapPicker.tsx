import { useEffect, useMemo, useRef, useState, type FormEvent } from 'react'
import { MapContainer, Marker, TileLayer, useMapEvents } from 'react-leaflet'
import L from 'leaflet'
import 'leaflet/dist/leaflet.css'
import { Button } from '../ui/Button'
import { Input } from '../ui/Input'

const DEFAULT_CENTER: [number, number] = [22.3072, 73.1812]
const DEFAULT_ZOOM = 12

const markerIcon = L.icon({
  iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
  iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
  shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
  shadowSize: [41, 41],
})

interface LocationMapPickerProps {
  latitude?: number
  longitude?: number
  onChange: (latitude: number, longitude: number) => void
}

function ClickHandler({
  onPick,
}: {
  onPick: (lat: number, lng: number) => void
}) {
  useMapEvents({
    click(event) {
      onPick(event.latlng.lat, event.latlng.lng)
    },
  })
  return null
}

export function LocationMapPicker({
  latitude,
  longitude,
  onChange,
}: LocationMapPickerProps) {
  const hasCoords =
    typeof latitude === 'number' && Number.isFinite(latitude) &&
    typeof longitude === 'number' && Number.isFinite(longitude)

  const center = useMemo<[number, number]>(
    () => (hasCoords ? [latitude as number, longitude as number] : DEFAULT_CENTER),
    [hasCoords, latitude, longitude],
  )

  const [searchQuery, setSearchQuery] = useState('')
  const [searching, setSearching] = useState(false)
  const [searchError, setSearchError] = useState('')
  const mapRef = useRef<L.Map | null>(null)

  useEffect(() => {
    if (hasCoords && mapRef.current) {
      mapRef.current.setView(center, Math.max(mapRef.current.getZoom(), DEFAULT_ZOOM))
    }
  }, [center, hasCoords])

  const handlePick = (lat: number, lng: number) => {
    onChange(Number(lat.toFixed(6)), Number(lng.toFixed(6)))
  }

  const handleSearch = async (event: FormEvent) => {
    event.preventDefault()
    const query = searchQuery.trim()
    if (!query) return
    setSearching(true)
    setSearchError('')
    try {
      const url =
        `https://nominatim.openstreetmap.org/search?format=json&limit=1&q=${encodeURIComponent(query)}`
      const res = await fetch(url, {
        headers: { Accept: 'application/json' },
      })
      if (!res.ok) throw new Error('Search failed')
      const results: unknown = await res.json()
      const first = Array.isArray(results) ? (results[0] as { lat?: string; lon?: string } | undefined) : undefined
      const lat = first?.lat ? Number(first.lat) : NaN
      const lng = first?.lon ? Number(first.lon) : NaN
      if (!Number.isFinite(lat) || !Number.isFinite(lng)) {
        setSearchError('No location found for that search.')
        return
      }
      onChange(Number(lat.toFixed(6)), Number(lng.toFixed(6)))
      mapRef.current?.setView([lat, lng], DEFAULT_ZOOM)
    } catch {
      setSearchError('Location search is unavailable right now. Click the map instead.')
    } finally {
      setSearching(false)
    }
  }

  return (
    <div className="rounded-2xl border border-rentify-grayLight bg-white p-5 shadow-sm sm:p-6">
      <h2 className="font-display text-lg font-semibold text-rentify-navy">
        Property Location
      </h2>
      <p className="mt-1 text-sm text-rentify-grayMuted">
        Select the exact location of the property on the map.
      </p>

      <form onSubmit={handleSearch} className="mt-4 flex flex-col gap-2 sm:flex-row">
        <Input
          id="pf-map-search"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          placeholder="Search an address or place…"
          aria-label="Search address or location"
          className="min-w-0 flex-1"
        />
        <Button type="submit" variant="outline" size="sm" disabled={searching || !searchQuery.trim()}>
          {searching ? 'Searching…' : 'Search'}
        </Button>
      </form>
      {searchError && (
        <p className="mt-2 text-xs text-red-500" role="alert">
          {searchError}
        </p>
      )}

      <div className="mt-3 overflow-hidden rounded-xl border border-rentify-grayLight">
        <MapContainer
          center={center}
          zoom={DEFAULT_ZOOM}
          style={{ height: 280, width: '100%' }}
          className="h-[280px] w-full"
          ref={(map) => {
            mapRef.current = map
          }}
        >
          <TileLayer
            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          />
          <ClickHandler onPick={handlePick} />
          {hasCoords && (
            <Marker
              position={[latitude as number, longitude as number]}
              icon={markerIcon}
              draggable
              eventHandlers={{
                dragend: (event) => {
                  const pos = event.target.getLatLng()
                  handlePick(pos.lat, pos.lng)
                },
              }}
            />
          )}
        </MapContainer>
      </div>

      {hasCoords ? (
        <p className="mt-2 text-xs font-medium text-rentify-successGreen" aria-live="polite">
          Location selected ·{' '}
          <span className="font-mono text-rentify-grayMuted">
            {Number(latitude).toFixed(5)}, {Number(longitude).toFixed(5)}
          </span>
        </p>
      ) : (
        <p className="mt-2 text-xs text-rentify-grayMuted">
          Click the map or search to select a location.
        </p>
      )}
    </div>
  )
}
