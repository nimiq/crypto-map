// eslint-disable no-console
import type { AnonDbFunction, DatabaseAnonArgs, DatabaseAuthArgs } from '../types/database.ts'
import { AuthDbFunction, DatabaseUser } from '../types/database.ts'

const HEADERS: HeadersInit = {
  'Content-Type': 'application/json',
  'Accept': 'application/json',
}

type Parameters = { query: URLSearchParams; body?: undefined } | { query?: undefined; body: object }
export async function fetchDb<T, FnName extends AuthDbFunction | AnonDbFunction = any>(fnName: FnName, dbArgs: DatabaseAuthArgs | DatabaseAnonArgs, params?: Parameters): Promise<T | undefined> {
  const { apikey, url: baseUrl, user } = dbArgs

  if (Object.values(AuthDbFunction).includes(fnName as AuthDbFunction) && user === DatabaseUser.Anonymous)
    throw new Error(`The function ${fnName} requires an authenticated user.`)
  if (user === DatabaseUser.Anonymous && !dbArgs.captchaToken)
    throw new Error('Missing captcha token for anon user.')
  else if (user === DatabaseUser.Authenticated && !dbArgs.authToken)
    throw new Error('Missing token for authenticated user. Make sure to call getAuth first to retrieve the token.')

  const method = params?.body ? 'POST' : 'GET'
  const url = new URL(`${baseUrl}/rest/v1/rpc/${fnName}`)
  url.search = params?.query?.toString() ?? ''
  if (user === DatabaseUser.Anonymous)
    url.searchParams.append('captcha_uuid', dbArgs.captchaToken)

  const headers = { ...HEADERS, apikey, ...(dbArgs.user === DatabaseUser.Authenticated ? { Authorization: `Bearer ${dbArgs.authToken}` } : {}) }
  const body = params?.body ? JSON.stringify(params?.body) : undefined

  /* eslint-disable no-console */
  const response = await fetch(url, { method, headers, body }).catch(error => `Error ${method} ${url.href}: ${error}`)

  if (typeof response === 'string') {
    console.error(response)
    return undefined
  }

  if (!response.ok) {
    console.error(`Error fetching database: ${response.status} ${response.statusText}. Response ${JSON.stringify(response)}`)
    return undefined
  }

  if (response.status === 204) {
    console.warn(`No content for query: ${url.href} | ${response.status} ${response.statusText}`)
    return undefined
  }

  const data: T = await response.json()

  console.group(`🔍 Database ${method} "${url.pathname.split('/').pop()}${url.search}"`)
  console.log(data)
  console.groupEnd()
  /* eslint-enable no-console */

  return data
}
