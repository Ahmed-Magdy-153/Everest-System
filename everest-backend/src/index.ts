import 'dotenv/config'
import app from './app'

const PORT = parseInt(process.env.PORT ?? '3001', 10)

app.listen(PORT, () => {
  console.log(`\n🚀  Everest API running at http://localhost:${PORT}`)
  console.log(`📋  Health check:   http://localhost:${PORT}/api/health`)
  console.log(`🔐  Auth:           POST http://localhost:${PORT}/api/auth/login\n`)
})
