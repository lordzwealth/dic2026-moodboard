// Media team review API. Every request must send the review password.
//   GET  /api/review              -> all submissions, newest first
//   POST /api/review {id, status, internal_notes} -> update one submission
import { neon } from '@neondatabase/serverless';
import { timingSafeEqual } from 'node:crypto';

const STATUSES = ['pending', 'approved', 'needs_fix', 'rejected'];

function passwordOk(req) {
  const real = process.env.REVIEW_PASSWORD || '';
  const given = String(req.headers['x-review-password'] || '');
  const a = Buffer.from(given);
  const b = Buffer.from(real);
  return real.length > 0 && a.length === b.length && timingSafeEqual(a, b);
}

export default async function handler(req, res) {
  res.setHeader('Cache-Control', 'no-store');

  if (!process.env.REVIEW_PASSWORD) {
    return res.status(500).json({ error: 'REVIEW_PASSWORD is not set in Vercel.' });
  }
  if (!process.env.DATABASE_URL) {
    return res.status(500).json({ error: 'DATABASE_URL is not set in Vercel.' });
  }
  if (!passwordOk(req)) {
    return res.status(401).json({ error: 'Wrong password.' });
  }

  const sql = neon(process.env.DATABASE_URL);

  try {
    if (req.method === 'GET') {
      const rows = await sql`select * from moodboard_submissions order by created_at desc`;
      return res.status(200).json({ rows });
    }

    if (req.method === 'POST') {
      const { id, status, internal_notes } = req.body || {};
      if (typeof id !== 'string' || !STATUSES.includes(status)) {
        return res.status(400).json({ error: 'Invalid update.' });
      }
      const notes = typeof internal_notes === 'string' ? internal_notes.trim().slice(0, 1000) || null : null;
      const updated = await sql`
        update moodboard_submissions
        set status = ${status}, internal_notes = ${notes}
        where id = ${id}
        returning id, status, internal_notes
      `;
      if (!updated.length) return res.status(404).json({ error: 'Submission not found.' });
      return res.status(200).json({ row: updated[0] });
    }

    return res.status(405).json({ error: 'Use GET or POST' });
  } catch (err) {
    console.error('Review API failed:', err);
    return res.status(500).json({ error: 'Could not reach the database.' });
  }
}
