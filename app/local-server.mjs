import { createServer } from 'node:http'
import { requestHandler } from './dealdispatch-handler.mjs'

const port = Number(process.env.PORT || 4174)
const role = process.env.DEALDISPATCH_API_ONLY === '1' ? 'API' : 'server'

createServer(requestHandler).listen(port, '127.0.0.1', () => {
  console.log(`DealDispatch ${role} listening on http://127.0.0.1:${port}`)
})
