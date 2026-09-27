import { requestHandler } from '../../../dealdispatch-handler.mjs'

export default function handler(req, res) {
  req.url = '/api/graph8/prospects/search'
  return requestHandler(req, res)
}
