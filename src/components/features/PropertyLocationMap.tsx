import { MapContainer, Marker, TileLayer } from 'react-leaflet'
import L from 'leaflet'
import 'leaflet/dist/leaflet.css'
import { Button } from '../ui/Button'

interface PropertyLocationMapProps {
  latitude?: number | null
  longitude?: number | null
}

const MAP_ZOOM = 15

const markerIcon = L.icon({
  iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
  iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
  shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
  shadowSize: [41, 41],
})

function getValidCoordinates(
  latitude?: number | null,
  longitude?: number | null,
): { latitude: number; longitude: number } | null {
  if (
    typeof latitude !== 'number' ||
    typeof longitude !== 'number' ||
    !Number.isFinite(latitude) ||
    !Number.isFinite(longitude)
  ) {
    return null
  }
  if (latitude < -90 || latitude > 90) return null
  if (longitude < -180 || longitude > 180) return null
  return { latitude, longitude }
}

export function PropertyLocationMap({
  latitude,
  longitude,
}: PropertyLocationMapProps) {
  const coords = getValidCoordinates(latitude, longitude)
  const center: [number, number] | null = coords
    ? [coords.latitude, coords.longitude]
    : null

  if (!coords || !center) {
    return (
      <p className="mt-4 text-sm text-rentify-grayMuted" role="status">
        Location map is not available for this property.
      </p>
    )
  }

  const query = `${coords.latitude},${coords.longitude}`
  const openUrl = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(query)}`
  const directionsUrl = `https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(query)}`

  return (
    <section
      className="relative z-0 mt-5"
      aria-labelledby="property-location-map-heading"
      data-testid="property-location-map"
    >
      <h2
        id="property-location-map-heading"
        className="font-display text-base font-semibold text-rentify-navy"
      >
        Location
      </h2>

      <div className="relative isolate z-0 mt-2.5 overflow-hidden rounded-2xl border border-rentify-grayLight bg-rentify-whiteOff">
        <MapContainer
          center={center}
          zoom={MAP_ZOOM}
          className="h-[260px] w-full sm:h-[320px]"
          zoomControl
          attributionControl
        >
          <TileLayer
            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          />
          <Marker position={center} icon={markerIcon} title="Property location" />
        </MapContainer>
      </div>

      <div className="mt-3 flex flex-col gap-2 sm:flex-row sm:flex-wrap">
        <a
          href={directionsUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex"
          data-testid="get-directions-link"
        >
          <Button size="sm" variant="primary" className="w-full sm:w-auto">
            Get Directions
          </Button>
        </a>
        <a
          href={openUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex"
          data-testid="open-google-maps-link"
        >
          <Button size="sm" variant="outline" className="w-full sm:w-auto">
            Open in Google Maps
          </Button>
        </a>
      </div>
    </section>
  )
}

export default PropertyLocationMap
