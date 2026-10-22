import { mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import { dirname, resolve } from 'node:path'
import initSqlJs, { type Database as SqlDatabase, type SqlValue } from 'sql.js'

export type DbRow = Record<string, string | number | null>

const databasePath = resolve(process.env.DRAVIT_DATABASE_FILE ?? 'data/dravit.sqlite')
let database: SqlDatabase | undefined

const schema = `
  PRAGMA foreign_keys = ON;
  CREATE TABLE IF NOT EXISTS users (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    email TEXT NOT NULL UNIQUE COLLATE NOCASE,
    password_hash TEXT NOT NULL,
    role TEXT NOT NULL DEFAULT 'customer' CHECK (role IN ('customer', 'admin')),
    created_at TEXT NOT NULL
  );
  CREATE TABLE IF NOT EXISTS sessions (
    token_hash TEXT PRIMARY KEY,
    user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    expires_at TEXT NOT NULL,
    created_at TEXT NOT NULL
  );
  CREATE INDEX IF NOT EXISTS sessions_expiry_idx ON sessions(expires_at);
  CREATE TABLE IF NOT EXISTS orders (
    id TEXT PRIMARY KEY,
    user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    business_name TEXT NOT NULL,
    website_name TEXT,
    package_name TEXT,
    project_type TEXT NOT NULL,
    requirements TEXT NOT NULL,
    budget TEXT,
    desired_timeline TEXT,
    status TEXT NOT NULL DEFAULT 'received' CHECK (status IN ('received', 'reviewing', 'in_progress', 'waiting_on_customer', 'completed', 'cancelled')),
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL
  );
  CREATE INDEX IF NOT EXISTS orders_user_idx ON orders(user_id, created_at DESC);
  CREATE TABLE IF NOT EXISTS files (
    id TEXT PRIMARY KEY,
    order_id TEXT NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
    user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    original_name TEXT NOT NULL,
    storage_name TEXT NOT NULL UNIQUE,
    mime_type TEXT NOT NULL,
    byte_size INTEGER NOT NULL,
    created_at TEXT NOT NULL
  );
  CREATE TABLE IF NOT EXISTS analytics (
    id TEXT PRIMARY KEY,
    visitor_id TEXT NOT NULL,
    user_id TEXT REFERENCES users(id) ON DELETE SET NULL,
    event_type TEXT NOT NULL CHECK (event_type IN ('page_view', 'demo_view')),
    page_path TEXT NOT NULL,
    project_slug TEXT,
    created_at TEXT NOT NULL
  );
  CREATE INDEX IF NOT EXISTS analytics_created_idx ON analytics(created_at);
  CREATE TABLE IF NOT EXISTS inquiries (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    email TEXT NOT NULL,
    business_name TEXT,
    website_name TEXT,
    package_name TEXT,
    details TEXT NOT NULL,
    created_at TEXT NOT NULL
  );
  CREATE TABLE IF NOT EXISTS demo_categories (
    id TEXT PRIMARY KEY,
    slug TEXT NOT NULL UNIQUE,
    name TEXT NOT NULL UNIQUE,
    sort_order INTEGER NOT NULL
  );
  CREATE TABLE IF NOT EXISTS demos (
    id TEXT PRIMARY KEY,
    slug TEXT NOT NULL UNIQUE,
    name TEXT NOT NULL,
    category_id TEXT NOT NULL REFERENCES demo_categories(id),
    description TEXT NOT NULL,
    live_url TEXT,
    preview_image TEXT,
    mobile_preview_image TEXT,
    highlights_json TEXT NOT NULL DEFAULT '[]',
    is_live INTEGER NOT NULL DEFAULT 0 CHECK (is_live IN (0, 1)),
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL
  );
  CREATE INDEX IF NOT EXISTS demos_category_idx ON demos(category_id, name);
`

const catalogCategories = [
  { slug: 'restaurant-websites', name: 'Restaurant Websites' },
  { slug: 'salon-and-beauty-websites', name: 'Salon and Beauty Websites' },
  { slug: 'e-commerce-websites', name: 'E-commerce Websites' },
  { slug: 'business-websites', name: 'Business Websites' },
  { slug: 'portfolio-websites', name: 'Portfolio Websites' },
  { slug: 'real-estate-websites', name: 'Real Estate Websites' },
  { slug: 'education-websites', name: 'Education Websites' },
  { slug: 'healthcare-websites', name: 'Healthcare Websites' },
  { slug: 'gym-and-fitness-websites', name: 'Gym and Fitness Websites' },
  { slug: 'travel-and-tourism-websites', name: 'Travel and Tourism Websites' },
  { slug: 'hotel-websites', name: 'Hotel Websites' },
  { slug: 'photography-websites', name: 'Photography Websites' },
  { slug: 'digital-agency-websites', name: 'Digital Agency Websites' },
  { slug: 'landing-pages', name: 'Landing Pages' },
  { slug: 'custom-websites', name: 'Custom Websites' },
]

const initialDemos = [
  {
    slug: 'onebite',
    name: 'OneBite',
    category: 'restaurant-websites',
    description: 'A neighbourhood restaurant site for OneBite in Nehru Nagar, Bhopal, built around the menu, directions, and a direct phone enquiry.',
    liveUrl: 'https://onebite-0d0avu13.share.landingsite.dev/',
    previewImage: 'https://onebite-0d0avu13.share.landingsite.dev/assets/provider/istock/2246302951.jpg?w=1440',
    mobilePreviewImage: 'https://onebite-0d0avu13.share.landingsite.dev/assets/provider/istock/2226223333.jpg?w=720',
    highlights: ['Menu category browsing', 'Location and directions', 'Phone-first enquiry'],
  },
  {
    slug: 'glam-up-salon',
    name: 'Glam Up Salon',
    category: 'salon-and-beauty-websites',
    description: 'A beauty studio site for GlamUp Salon & Makeup Studio in Jahangirabad, Bhopal, with services, editorial inspiration, and call-led enquiries.',
    liveUrl: 'https://glam-up-salon-website--nateriyadravit.replit.app',
    previewImage: 'https://glam-up-salon-website--nateriyadravit.replit.app/assets/hero-editorial-Cd4OXSJg.jpg',
    mobilePreviewImage: 'https://glam-up-salon-website--nateriyadravit.replit.app/assets/beauty-detail-Ck04Z-MO.jpg',
    highlights: ['Beauty service explorer', 'Editorial inspiration gallery', 'Call and map enquiries'],
  },
]

function seedDemoCatalog(): void {
  for (const [sortOrder, category] of catalogCategories.entries()) {
    run('INSERT OR IGNORE INTO demo_categories (id, slug, name, sort_order) VALUES (?, ?, ?, ?)', [
      category.slug, category.slug, category.name, sortOrder,
    ])
  }

  const now = new Date().toISOString()
  for (const demo of initialDemos) {
    run(`INSERT OR IGNORE INTO demos
      (id, slug, name, category_id, description, live_url, preview_image, mobile_preview_image, highlights_json, is_live, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 1, ?, ?)`, [
      demo.slug, demo.slug, demo.name, demo.category, demo.description, demo.liveUrl,
      demo.previewImage, demo.mobilePreviewImage, JSON.stringify(demo.highlights), now, now,
    ])
  }
}

export async function initializeDatabase(): Promise<void> {
  if (database) return

  mkdirSync(dirname(databasePath), { recursive: true })
  const sql = await initSqlJs({
    locateFile: (file) => resolve(process.cwd(), 'node_modules/sql.js/dist', file),
  })
  const bytes = exists(databasePath) ? readFileSync(databasePath) : undefined
  database = bytes ? new sql.Database(bytes) : new sql.Database()
  database.run(schema)
  seedDemoCatalog()
  persistDatabase()
}

function exists(path: string): boolean {
  try {
    readFileSync(path)
    return true
  } catch {
    return false
  }
}

function getDatabase(): SqlDatabase {
  if (!database) throw new Error('Database is not initialized')
  return database
}

export function run(sql: string, values: SqlValue[] = []): void {
  getDatabase().run(sql, values)
  persistDatabase()
}

export function all<T extends DbRow = DbRow>(sql: string, values: SqlValue[] = []): T[] {
  const statement = getDatabase().prepare(sql)
  try {
    statement.bind(values)
    const rows: T[] = []
    while (statement.step()) rows.push(statement.getAsObject() as T)
    return rows
  } finally {
    statement.free()
  }
}

export function first<T extends DbRow = DbRow>(sql: string, values: SqlValue[] = []): T | undefined {
  return all<T>(sql, values)[0]
}

export function persistDatabase(): void {
  if (!database) return
  mkdirSync(dirname(databasePath), { recursive: true })
  writeFileSync(databasePath, Buffer.from(database.export()))
}

export function closeDatabase(): void {
  persistDatabase()
  database?.close()
  database = undefined
}

export function getDatabasePath(): string {
  return databasePath
}
