import maplibregl from 'maplibre-gl'
import { Protocol } from 'pmtiles'

export default defineNuxtPlugin(() => {
  const protocol = new Protocol()
  maplibregl.addProtocol('pmtiles', protocol.tile)
})
