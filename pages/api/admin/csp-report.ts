import type { NextApiRequest, NextApiResponse } from 'next';

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  console.log("CSP Violation:", JSON.stringify(req.body, null, 2));
  res.status(204).end(); // No Content
}
