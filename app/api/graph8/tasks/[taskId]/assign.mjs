import { requestHandler } from '../../../../dealdispatch-handler.mjs'

export default function handler(req, res) {
  const taskId = req.query?.taskId
  if (!taskId || Array.isArray(taskId)) {
    res.writeHead(400, { 'content-type': 'application/json; charset=utf-8' })
    return res.end(JSON.stringify({ error: 'Invalid Graph8 task ID' }))
  }
  req.url = `/api/graph8/tasks/${encodeURIComponent(String(taskId))}/assign`
  return requestHandler(req, res)
}
