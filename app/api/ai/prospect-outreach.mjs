import { requestHandler } from '../../dealdispatch-handler.mjs'

export default function handler(req, res) {
  req.url = '/api/ai/prospect-outreach'
  return requestHandler(req, res)
}
