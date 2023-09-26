import type { DatabaseArgs, DatabaseAuthArgs, DatabaseAuthenticateUserArgs } from 'types'
import { AnonDbFunction, DatabaseUser } from 'types'

export async function authenticateUser({ url, apikey, auth: { email, password } }: DatabaseAuthenticateUserArgs): Promise<DatabaseAuthArgs> {
  const urlAuth = new URL(`${url}/auth/v1/token?grant_type=password`)
  const headers = { apikey }
  const body = JSON.stringify({ email, password })
  const response = await fetch(urlAuth, { method: 'POST', headers, body }).catch(error => `Error POST ${urlAuth.href}: ${error}`)
  if (typeof response === 'string') {
    console.error(response)
    throw new Error(response)
  }
  const data = await response.json()
  if (!data?.access_token)
    throw new Error('No access token found!')
  // eslint-disable-next-line no-console
  console.log(`Created DatabaseAuthArgs structure from ${urlAuth.href} with authenticated user. Token: ${!!data.access_token}`)
  return { apikey, url, user: DatabaseUser.Authenticated, authToken: data.access_token }
}

export async function authenticateAnonUser({ apikey, url }: DatabaseArgs, captchaToken: string): Promise<string> {
  const urlAuth = new URL(`${url}/rest/v1/rpc/${AnonDbFunction.AuthAnonUser}`)
  const body = JSON.stringify({ g_token: captchaToken })
  const response = await fetch(urlAuth, { method: 'POST', headers: { apikey, 'Content-Type': 'application/json' }, body }).catch(error => `Error POST ${urlAuth.href}: ${error}`)
  if (typeof response === 'string') {
    console.error(response)
    throw new Error(response)
  }
  const data: { captcha_uuid: string } = await response.json()
  if (!data || !data.captcha_uuid)
    throw new Error('No captcha uuid found!')

  /* eslint-disable no-console */
  console.group(`🔍 Database POST "${urlAuth.pathname.split('/').pop()}"`)
  console.log(JSON.stringify({ captchaToken: `${captchaToken.slice(0, 10)}...`, uuid: `${data.captcha_uuid.slice(0, 10)}...` }))
  console.groupEnd()
  /* eslint-enable no-console */

  return data.captcha_uuid
}
