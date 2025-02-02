import { createServer } from 'http'
import { parse } from 'url'
import next from 'next'
import { initializeAnalytics } from './src/lib/jobs/analytics'

const dev = process.env.NODE_ENV !== 'production'
const app = next({ dev })
const handle = app.getRequestHandler()

async function startServer() {
  try {
    await app.prepare()

    createServer((req, res) => {
      const parsedUrl = parse(req.url!, true)
      handle(req, res, parsedUrl)
    }).listen(3000, () => {
      initializeAnalytics();
      console.log('> Ready on http://localhost:3000')
    })
  } catch (e) {
    console.error(e)
    process.exit(1)
  }
}

startServer()