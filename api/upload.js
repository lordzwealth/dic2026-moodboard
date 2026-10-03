// Gives the browser a short-lived permission to upload ONE file straight to Vercel Blob.
// Files go direct from the phone to Blob, so large HD logos don't hit Vercel's 4.5 MB function limit.
import { handleUpload } from '@vercel/blob/client';

const MAX_BYTES = 20 * 1024 * 1024; // 20 MB per file

const ALLOWED_TYPES = [
  'image/png',
  'image/jpeg',
  'image/webp',
  'image/svg+xml',
  'application/pdf',
  'application/postscript',   // .ai / .eps
  'application/illustrator',
  'application/eps',
  'image/x-eps',
  'application/octet-stream', // some phones send .ai / .eps with no type
];

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Use POST' });
  }

  try {
    const json = await handleUpload({
      body: req.body,
      request: req,
      onBeforeGenerateToken: async (pathname) => {
        // Only allow uploads into the moodboard folder
        if (!pathname.startsWith('moodboard/')) {
          throw new Error('Invalid upload location');
        }
        return {
          allowedContentTypes: ALLOWED_TYPES,
          maximumSizeInBytes: MAX_BYTES,
          addRandomSuffix: true, // makes file links impossible to guess
        };
      },
      onUploadCompleted: async () => {
        // Nothing needed here: /api/submit saves the links with the form answers.
      },
    });
    return res.status(200).json(json);
  } catch (err) {
    return res.status(400).json({ error: err.message });
  }
}
