import { requestHandler } from '../../dealdispatch-handler.mjs'

export default function handler(req, res) {
  req.url = '/api/graph8/marketplace'
  return requestHandler(req, res)
}
