// pages/api/csp-report.ts
import type { NextApiRequest, NextApiResponse } from 'next'

export default function handler(req: NextApiRequest, res: NextApiResponse) {
  // If you want, uncomment to log the report:
  // console.log('CSP report:', req.body)
  res.status(200).json({ ok: true })
}
