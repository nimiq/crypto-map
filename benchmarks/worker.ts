import process from 'node:process'
import { pathToFileURL } from 'node:url'

export interface TileCoordinate {
  lat: number
  lng: number
  zoom: number
}

export interface CountViewport {
  min_lat: number
  min_lon: number
  max_lat: number
  max_lon: number
}

export interface TileScenario {
  name: string
  kind: 'tile'
  coordinate: TileCoordinate
  description: string
}

export interface CountScenario {
  name: string
  kind: 'count'
  viewport: CountViewport
  description: string
}

export type Scenario = TileScenario | CountScenario

export interface CliOptions {
  baseUrl: string
  iterations: number
  concurrency: number
  warmup: number
  timeoutMs: number
  cacheBust: boolean
}

export interface BenchmarkSample {
  scenarioName: string
  endpointKind: Scenario['kind']
  url: string
  status: number
  latencyMs: number
  sizeBytes: number
  empty: boolean
  locationsCount?: number
  timestamp: string
  error?: string
}

export interface BenchmarkSummary {
  scenarioName: string
  endpointKind: Scenario['kind']
  url: string
  iterations: number
  avg: number
  min: number
  p50: number
  p90: number
  p95: number
  max: number
  errorCount: number
  emptyCount: number
  emptyRatio: number
  locationsCount: string
  statusCounts: Record<string, number>
}

export const DEFAULT_BASE_URL = 'https://crypto-map.je-cf9.workers.dev'

const EUROPE_FAILING_VIEWPORT: CountViewport = {
  min_lat: 44.339366454488584,
  min_lon: -0.23168937412350488,
  max_lat: 50.215329807422705,
  max_lon: 16.87677493928524,
}

const SWITZERLAND_VIEWPORT: CountViewport = {
  min_lat: 45.82,
  min_lon: 5.96,
  max_lat: 47.81,
  max_lon: 10.49,
}

const EL_SALVADOR_VIEWPORT: CountViewport = {
  min_lat: 13.15,
  min_lon: -90.13,
  max_lat: 14.45,
  max_lon: -87.7,
}

const MADRID_EMPTY_VIEWPORT: CountViewport = {
  min_lat: 40.2,
  min_lon: -3.9,
  max_lat: 40.6,
  max_lon: -3.5,
}

export const SCENARIOS: readonly Scenario[] = [
  {
    name: 'switzerland-cluster-tile',
    kind: 'tile',
    coordinate: { lat: 46.8, lng: 8.2, zoom: 6 },
    description: 'Low zoom cluster tile around Switzerland hotspot.',
  },
  {
    name: 'el-salvador-cluster-tile',
    kind: 'tile',
    coordinate: { lat: 13.7942, lng: -88.8965, zoom: 6 },
    description: 'Low zoom cluster tile around El Salvador hotspot.',
  },
  {
    name: 'lugano-city-tile',
    kind: 'tile',
    coordinate: { lat: 46.00503, lng: 8.95606, zoom: 13 },
    description: 'High zoom city tile around Lugano / Plan B Forum.',
  },
  {
    name: 'empty-ocean-tile',
    kind: 'tile',
    coordinate: { lat: 0, lng: -140, zoom: 6 },
    description: 'Expected empty tile over open ocean.',
  },
  {
    name: 'europe-failing-count',
    kind: 'count',
    viewport: EUROPE_FAILING_VIEWPORT,
    description: 'Viewport copied from the reported failing console request.',
  },
  {
    name: 'switzerland-count',
    kind: 'count',
    viewport: SWITZERLAND_VIEWPORT,
    description: 'Country viewport around Switzerland hotspot.',
  },
  {
    name: 'el-salvador-count',
    kind: 'count',
    viewport: EL_SALVADOR_VIEWPORT,
    description: 'Country viewport around El Salvador hotspot.',
  },
  {
    name: 'madrid-empty-count',
    kind: 'count',
    viewport: MADRID_EMPTY_VIEWPORT,
    description: 'Madrid viewport expected to have no locations.',
  },
] as const

function assertPositiveInteger(value: number, flagName: string): number {
  if (!Number.isInteger(value) || value <= 0) {
    throw new Error(`${flagName} must be a positive integer`)
  }
  return value
}

function assertNonNegativeInteger(value: number, flagName: string): number {
  if (!Number.isInteger(value) || value < 0) {
    throw new Error(`${flagName} must be a non-negative integer`)
  }
  return value
}

function parseNumberFlag(value: string | undefined, flagName: string): number | undefined {
  if (value === undefined)
    return undefined

  const parsed = Number(value)
  if (!Number.isFinite(parsed)) {
    throw new TypeError(`${flagName} must be a finite number`)
  }

  return parsed
}

export function normalizeBaseUrl(baseUrl: string): string {
  return baseUrl.replace(/\/+$/, '')
}

export function latLngZoomToTile(lat: number, lng: number, zoom: number): { x: number, y: number, z: number } {
  const scale = 2 ** zoom
  const x = Math.floor(((lng + 180) / 360) * scale)
  const latRad = (lat * Math.PI) / 180
  const y = Math.floor(((1 - Math.log(Math.tan(latRad) + (1 / Math.cos(latRad))) / Math.PI) / 2) * scale)

  return { x, y, z: zoom }
}

export function percentile(values: number[], value: number): number {
  if (values.length === 0)
    return 0

  const sorted = [...values].sort((a, b) => a - b)
  const index = (value / 100) * (sorted.length - 1)
  const lowerIndex = Math.floor(index)
  const upperIndex = Math.ceil(index)
  const lowerValue = sorted[lowerIndex] ?? sorted[sorted.length - 1] ?? 0
  const upperValue = sorted[upperIndex] ?? lowerValue

  if (lowerIndex === upperIndex)
    return lowerValue

  return lowerValue + (upperValue - lowerValue) * (index - lowerIndex)
}

export function classifyEmptyResponse(kind: Scenario['kind'], status: number, sizeBytes: number): boolean {
  if (kind !== 'tile')
    return false

  return status === 204 || sizeBytes === 0
}

export function summarizeSamples(scenario: Scenario, url: string, samples: BenchmarkSample[]): BenchmarkSummary {
  const latencies = samples.map(sample => sample.latencyMs)
  const total = latencies.reduce((sum, latency) => sum + latency, 0)
  const statusCounts = samples.reduce<Record<string, number>>((accumulator, sample) => {
    const key = String(sample.status)
    accumulator[key] = (accumulator[key] ?? 0) + 1
    return accumulator
  }, {})
  const errorCount = samples.filter(sample => sample.status === 0 || sample.status >= 400).length
  const emptyCount = samples.filter(sample => sample.empty).length
  const locationCounts = [...new Set(samples.flatMap(sample => sample.locationsCount === undefined ? [] : [sample.locationsCount]))]
  const locationsCount = scenario.kind === 'count'
    ? (locationCounts.length === 1 ? String(locationCounts[0]) : locationCounts.length > 1 ? locationCounts.join(', ') : '?')
    : '-'

  return {
    scenarioName: scenario.name,
    endpointKind: scenario.kind,
    url,
    iterations: samples.length,
    avg: samples.length > 0 ? total / samples.length : 0,
    min: samples.length > 0 ? Math.min(...latencies) : 0,
    p50: percentile(latencies, 50),
    p90: percentile(latencies, 90),
    p95: percentile(latencies, 95),
    max: samples.length > 0 ? Math.max(...latencies) : 0,
    errorCount,
    emptyCount,
    emptyRatio: samples.length > 0 ? emptyCount / samples.length : 0,
    locationsCount,
    statusCounts,
  }
}

function formatMs(value: number): string {
  return `${value.toFixed(1)}ms`
}

function formatRatio(value: number): string {
  return `${(value * 100).toFixed(1)}%`
}

function formatStatusCounts(statusCounts: Record<string, number>): string {
  return Object.entries(statusCounts)
    .sort(([left], [right]) => Number(left) - Number(right))
    .map(([status, count]) => `${status}:${count}`)
    .join(', ')
}

function writeStdout(line = '') {
  process.stdout.write(`${line}\n`)
}

function parseArgs(argv: string[]): CliOptions {
  const values = new Map<string, string>()

  for (let index = 0; index < argv.length; index += 1) {
    const current = argv[index]
    if (!current?.startsWith('--'))
      continue

    const [rawKey, inlineValue] = current.slice(2).split('=', 2)
    const next = argv[index + 1]
    const value = inlineValue ?? (next && !next.startsWith('--') ? next : 'true')
    values.set(rawKey, value)
    if (inlineValue === undefined && next && !next.startsWith('--'))
      index += 1
  }

  const baseUrl = values.get('base-url') ?? DEFAULT_BASE_URL

  const iterations = parseNumberFlag(values.get('iterations'), '--iterations') ?? 30
  const concurrency = parseNumberFlag(values.get('concurrency'), '--concurrency') ?? 4
  const warmup = parseNumberFlag(values.get('warmup'), '--warmup') ?? 3
  const timeoutMs = parseNumberFlag(values.get('timeout-ms'), '--timeout-ms') ?? 10000
  const cacheBust = values.get('cache-bust') !== 'false'

  return {
    baseUrl: normalizeBaseUrl(baseUrl),
    iterations: assertPositiveInteger(iterations, '--iterations'),
    concurrency: assertPositiveInteger(concurrency, '--concurrency'),
    warmup: assertNonNegativeInteger(warmup, '--warmup'),
    timeoutMs: assertPositiveInteger(timeoutMs, '--timeout-ms'),
    cacheBust,
  }
}

function buildScenarioUrl(baseUrl: string, scenario: Scenario): string {
  if (scenario.kind === 'tile') {
    const { x, y, z } = latLngZoomToTile(scenario.coordinate.lat, scenario.coordinate.lng, scenario.coordinate.zoom)
    return `${baseUrl}/api/tiles/${z}/${x}/${y}`
  }

  const params = new URLSearchParams(
    Object.entries(scenario.viewport).map(([key, value]) => [key, String(value)]),
  )
  return `${baseUrl}/api/locations/count?${params.toString()}`
}

export function withCacheBypass(url: string, cacheBustToken: string, enabled: boolean): string {
  if (!enabled)
    return url

  const target = new URL(url)
  target.searchParams.set('__benchmark', cacheBustToken)
  return target.toString()
}

async function runSingleRequest(
  scenario: Scenario,
  url: string,
  timeoutMs: number,
  cacheBust: boolean,
  cacheBustToken: string,
): Promise<BenchmarkSample> {
  const startedAt = performance.now()
  const timestamp = new Date().toISOString()
  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), timeoutMs)
  const finalUrl = withCacheBypass(url, cacheBustToken, cacheBust)

  try {
    const response = await fetch(finalUrl, {
      signal: controller.signal,
      cache: 'no-store',
      headers: {
        'accept': scenario.kind === 'tile'
          ? 'application/vnd.mapbox-vector-tile,application/octet-stream,*/*'
          : 'application/json,*/*',
        'cache-control': 'no-cache, no-store, max-age=0',
        'pragma': 'no-cache',
      },
    })

    const body = new Uint8Array(await response.arrayBuffer())
    const latencyMs = performance.now() - startedAt
    const sizeBytes = body.byteLength
    let locationsCount: number | undefined

    if (scenario.kind === 'count' && sizeBytes > 0) {
      const parsed = JSON.parse(new TextDecoder().decode(body)) as { count?: unknown }
      if (typeof parsed.count === 'number')
        locationsCount = parsed.count
    }

    return {
      scenarioName: scenario.name,
      endpointKind: scenario.kind,
      url: finalUrl,
      status: response.status,
      latencyMs,
      sizeBytes,
      empty: classifyEmptyResponse(scenario.kind, response.status, sizeBytes),
      locationsCount,
      timestamp,
    }
  }
  catch (error) {
    return {
      scenarioName: scenario.name,
      endpointKind: scenario.kind,
      url: finalUrl,
      status: 0,
      latencyMs: performance.now() - startedAt,
      sizeBytes: 0,
      empty: false,
      timestamp,
      error: error instanceof Error ? error.message : String(error),
    }
  }
  finally {
    clearTimeout(timer)
  }
}

async function runWithConcurrency<T>(items: T[], concurrency: number, worker: (item: T, index: number) => Promise<BenchmarkSample>): Promise<BenchmarkSample[]> {
  const results: Array<BenchmarkSample | undefined> = Array.from({ length: items.length })
  let nextIndex = 0

  async function runWorker() {
    while (true) {
      const currentIndex = nextIndex
      nextIndex += 1
      if (currentIndex >= items.length)
        return

      results[currentIndex] = await worker(items[currentIndex], currentIndex)
    }
  }

  const workerCount = Math.min(concurrency, items.length)
  await Promise.all(Array.from({ length: workerCount }, () => runWorker()))
  return results.map((sample, index) => {
    if (sample === undefined)
      throw new Error(`Missing benchmark sample at index ${index}`)

    return sample
  })
}

async function benchmarkScenario(scenario: Scenario, options: CliOptions): Promise<{ summary: BenchmarkSummary, samples: BenchmarkSample[] }> {
  const url = buildScenarioUrl(options.baseUrl, scenario)

  for (let iteration = 0; iteration < options.warmup; iteration += 1) {
    await runSingleRequest(
      scenario,
      url,
      options.timeoutMs,
      options.cacheBust,
      `${scenario.name}:warmup:${iteration}:${Date.now()}`,
    )
  }

  const measuredIterations = Array.from({ length: options.iterations }, (_, index) => index)
  const samples = await runWithConcurrency(
    measuredIterations,
    options.concurrency,
    async (_, index) => runSingleRequest(
      scenario,
      url,
      options.timeoutMs,
      options.cacheBust,
      `${scenario.name}:sample:${index}:${Date.now()}`,
    ),
  )

  return {
    summary: summarizeSamples(scenario, url, samples),
    samples,
  }
}

function printScenarioSummary(summary: BenchmarkSummary) {
  const rows = [
    ['endpoint', summary.endpointKind],
    ['iterations', String(summary.iterations)],
    ['avg', formatMs(summary.avg)],
    ['min', formatMs(summary.min)],
    ['p50', formatMs(summary.p50)],
    ['p90', formatMs(summary.p90)],
    ['p95', formatMs(summary.p95)],
    ['max', formatMs(summary.max)],
    ['errors', String(summary.errorCount)],
    ['empty', String(summary.emptyCount)],
    ['emptyRatio', formatRatio(summary.emptyRatio)],
    ['locationsCount', summary.locationsCount],
    ['statuses', formatStatusCounts(summary.statusCounts)],
  ] as const
  const labelWidth = Math.max(...rows.map(([label]) => label.length))

  writeStdout()
  writeStdout(summary.scenarioName)
  for (const [label, value] of rows)
    writeStdout(`${label.padEnd(labelWidth)}  ${value}`)
}

async function main() {
  const options = parseArgs(process.argv.slice(2))

  writeStdout(`Running worker benchmark against ${options.baseUrl}`)
  writeStdout(`Scenarios: ${SCENARIOS.length}, warmup: ${options.warmup}, iterations: ${options.iterations}, concurrency: ${options.concurrency}, timeout: ${options.timeoutMs}ms, cacheBust: ${options.cacheBust}`)

  for (const scenario of SCENARIOS) {
    writeStdout()
    writeStdout(`Benchmarking ${scenario.name}: ${scenario.description}`)
    const result = await benchmarkScenario(scenario, options)
    printScenarioSummary(result.summary)
  }
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  main().catch((error) => {
    console.error(error instanceof Error ? error.message : error)
    process.exitCode = 1
  })
}
