import type { Args, DatabaseAuthArgs, DatabaseAuthenticateUserArgs, MapLocation, Returns } from '../../types/src/index.ts'
import { AuthWriteDbFunction } from '../../types/src/index.ts'
import { authenticateUser } from './auth.ts'
import { fetchDb } from './fetch.ts'

export async function addLocation(dbArgs: DatabaseAuthArgs | DatabaseAuthenticateUserArgs, { location, datasetId }: Args[AuthWriteDbFunction.UpsertRawLocation]) {
  return await fetchDb<MapLocation>(AuthWriteDbFunction.UpsertRawLocation, await authenticateUser(dbArgs), { body: { location, p_dataset_id: datasetId } })
}

export async function addLocationWithPlaceId(dbArgs: DatabaseAuthArgs | DatabaseAuthenticateUserArgs, locations: Args[AuthWriteDbFunction.UpsertLocationsWithGMaps]) {
  return await fetchDb<Returns[AuthWriteDbFunction.UpsertLocationsWithGMaps]>(AuthWriteDbFunction.UpsertLocationsWithGMaps, await authenticateUser(dbArgs), { body: { locations } })
}

export async function deleteLocation(dbArgs: DatabaseAuthArgs | DatabaseAuthenticateUserArgs, location_uuid: string) {
  return await fetchDb<MapLocation>(AuthWriteDbFunction.DeleteLocation, await authenticateUser(dbArgs), { body: { location_uuid } })
}

export async function insertMarkers(dbArgs: DatabaseAuthArgs | DatabaseAuthenticateUserArgs, { items, zoom_level, datasetId }: Args[AuthWriteDbFunction.InsertMarkers]) {
  return await fetchDb<MapLocation>(AuthWriteDbFunction.InsertMarkers, await authenticateUser(dbArgs), { body: { items, zoom_level, p_dataset_id: datasetId } })
}

export async function flushMarkersTable(dbArgs: DatabaseAuthArgs | DatabaseAuthenticateUserArgs, { datasetId }: Args[AuthWriteDbFunction.FlushMarkersTable] = {}) {
  return await fetchDb<MapLocation>(AuthWriteDbFunction.FlushMarkersTable, await authenticateUser(dbArgs), { body: { p_dataset_id: datasetId } })
}
