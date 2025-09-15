import type { Markers } from '~~/types/map'
import type { Database } from '~~/types/supabase'
import { serverSupabaseClient } from '#supabase/server'
import { createClient } from '@supabase/supabase-js'
import { BoundingBoxSchema, ZoomSchema } from '~~/lib/schemas'
import { intersect, object, optional, safeParse, string } from 'valibot'

// TODO Rename zoom_level
const Schema = object({
  ...BoundingBoxSchema.entries,
  zoom_level: ZoomSchema,
  dataset_id: optional(string(), 'prod'), // Add dataset parameter with default
})

export default defineEventHandler(async (event) => {
  // Validate the route parameters
  const { output: query, issues, success } = await getValidatedQuery(event, query => safeParse(Schema, query))
  if (!success || !query)
    throw createError({ statusCode: 400, message: `Invalid query parameters ${JSON.stringify(issues)}` })
  const { url, key } = useRuntimeConfig().public.supabase
  const client = createClient<Database>(url, key)
  // const client = await serverSupabaseClient<Database>() - Currently supabase nuxt server composable requires auth
  // https://github.com/nuxt-modules/supabase/issues/388

  // Extract dataset_id from query
  const datasetId = query.dataset_id || 'prod'

  await clustering(client, datasetId)

  // Fetch the pre-computed markers from Supabase with dataset parameter
  const supabase = await serverSupabaseClient<Database>(event)
  const { data, error } = await supabase.rpc('get_markers', { ...query, p_dataset_id: datasetId }) as unknown as { data: Markers, error: any }
  if (error || !data)
    return createError({ statusCode: 404, message: `No markers found` })

  return data
})
