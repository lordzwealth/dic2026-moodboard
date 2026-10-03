// Saves one form submission into Neon.
import { neon } from '@neondatabase/serverless';

const sql = neon(process.env.DATABASE_URL);

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

// Trim text and cap its length; empty becomes null
const text = (v, max = 300) => {
  if (typeof v !== 'string') return null;
  const t = v.trim().slice(0, max);
  return t.length ? t : null;
};

// Only accept file links that point to our own Vercel Blob store
const blobUrl = (v) => {
  if (typeof v !== 'string' || !v) return null;
  try {
    const u = new URL(v);
    return u.protocol === 'https:' && u.hostname.endsWith('.blob.vercel-storage.com') ? u.toString() : null;
  } catch {
    return null;
  }
};

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Use POST' });
  }

  const b = req.body || {};

  const row = {
    id: UUID.test(b.id || '') ? b.id : null,
    full_name: text(b.full_name, 120),
    phone: text(b.phone, 30),
    email: text(b.email, 160),
    department: text(b.department, 120),
    business_name: text(b.business_name, 120),
    category: text(b.category, 80),
    tagline: text(b.tagline, 80),
    description: text(b.description, 300),
    website: text(b.website, 200),
    instagram: text(b.instagram, 80),
    tiktok: text(b.tiktok, 80),
    x_handle: text(b.x_handle, 80),
    facebook: text(b.facebook, 120),
    whatsapp_business: text(b.whatsapp_business, 30),
    location: text(b.location, 200),
    brand_colors: text(b.brand_colors, 120),
    package: text(b.package, 40),
    placement_pref: text(b.placement_pref, 80),
    payment_ref: text(b.payment_ref, 80),
    payment_proof_url: blobUrl(b.payment_proof_url),
    logo_primary_url: blobUrl(b.logo_primary_url),
    logo_reversed_url: blobUrl(b.logo_reversed_url),
    logo_mono_url: blobUrl(b.logo_mono_url),
    logo_icon_url: blobUrl(b.logo_icon_url),
    logo_horizontal_url: blobUrl(b.logo_horizontal_url),
    logo_stacked_url: blobUrl(b.logo_stacked_url),
    low_quality_logo: b.low_quality_logo === true,
    agreed_terms: b.agreed_terms === true,
  };

  const missing = ['id', 'full_name', 'phone', 'email', 'business_name', 'category', 'package', 'logo_primary_url']
    .filter((k) => !row[k]);
  if (missing.length) {
    return res.status(400).json({ error: `Missing or invalid: ${missing.join(', ')}` });
  }
  if (!row.agreed_terms) {
    return res.status(400).json({ error: 'You need to accept the agreement before submitting.' });
  }

  try {
    await sql`
      insert into moodboard_submissions (
        id, full_name, phone, email, department,
        business_name, category, tagline, description, website, instagram, tiktok, x_handle, facebook,
        whatsapp_business, location, brand_colors,
        package, placement_pref, payment_ref, payment_proof_url,
        logo_primary_url, logo_reversed_url, logo_mono_url, logo_icon_url, logo_horizontal_url, logo_stacked_url,
        low_quality_logo, agreed_terms
      ) values (
        ${row.id}, ${row.full_name}, ${row.phone}, ${row.email}, ${row.department},
        ${row.business_name}, ${row.category}, ${row.tagline}, ${row.description}, ${row.website}, ${row.instagram},
        ${row.tiktok}, ${row.x_handle}, ${row.facebook},
        ${row.whatsapp_business}, ${row.location}, ${row.brand_colors},
        ${row.package}, ${row.placement_pref}, ${row.payment_ref}, ${row.payment_proof_url},
        ${row.logo_primary_url}, ${row.logo_reversed_url}, ${row.logo_mono_url}, ${row.logo_icon_url},
        ${row.logo_horizontal_url}, ${row.logo_stacked_url},
        ${row.low_quality_logo}, ${row.agreed_terms}
      )
    `;
    return res.status(200).json({ ok: true });
  } catch (err) {
    console.error('Neon insert failed:', err);
    return res.status(500).json({ error: 'Your submission could not be saved. Try again in a minute.' });
  }
}
