import dotenv from 'dotenv'
import app from './app.js'
import { closeDatabase, connectDatabase } from './db.js'

dotenv.config()

const port = Number(process.env.PORT || 5000)

let server

async function startServer() {
  try {
    await connectDatabase()
    server = app.listen(port, () => {
      console.log(`Setu API listening on http://localhost:${port}`)
    })
  } catch (error) {
    console.error(`Setu API startup failed (${error.name || 'unknown error'}).`)
    await closeDatabase()
    process.exitCode = 1
  }
}

async function shutdown() {
  if (server) {
    await new Promise((resolve, reject) => {
      server.close((error) => error ? reject(error) : resolve())
    })
  }
  try {
    await closeDatabase()
  } catch (error) {
    console.error(`Setu API shutdown failed (${error.name || 'unknown error'}).`)
    process.exitCode = 1
  }
}

startServer()
process.on('SIGINT', shutdown)
process.on('SIGTERM', shutdown)
