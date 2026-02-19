import { consola } from 'consola'

export default defineEventHandler((event) => {
  const start = performance.now()
  event.node.res.on('finish', () => {
    const ms = (performance.now() - start).toFixed(0)
    consola.info(`[perf] ${event.node.req.method} ${event.path} ${ms}ms`)
  })
})
