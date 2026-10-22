import 'dotenv/config'
import { randomUUID } from 'node:crypto'
import { mkdir, writeFile, readFile } from 'node:fs/promises'
import { existsSync } from 'node:fs'
import { basename, extname, resolve } from 'node:path'
import bcrypt from 'bcryptjs'
import express, { type ErrorRequestHandler, type Request } from 'express'
import rateLimit from 'express-rate-limit'
import helmet from 'helmet'
import multer from 'multer'
import { fileTypeFromBuffer } from 'file-type'
import { z } from 'zod'
import { all, first, initializeDatabase, run } from './database.js'
import { sendBusinessNotification } from './mailer.js'
import { authenticate, clearSession, createSession, requireAdmin, requireSameOrigin, type PublicUser } from './security.js'

const appPort = Number(process.env.PORT || 4000)
const uploadDirectory = resolve(process.env.DRAVIT_UPLOAD_DIRECTORY || 'storage/private')
const maximumFileBytes = 10 * 1024 * 1024
const maximumFilesPerOrder = 25
const maximumOrderUploadBytes = 100 * 1024 * 1024
const app = express()

app.disable('x-powered-by')
app.set('trust proxy', process.env.NODE_ENV === 'production' ? 1 : false)
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      baseUri: ["'self'"],
      fontSrc: ["'self'", 'https://fonts.gstatic.com'],
      formAction: ["'self'", 'mailto:'],
      imgSrc: [
        "'self'", 'data:', 'https://images.unsplash.com',
        'https://onebite-0d0avu13.share.landingsite.dev',
        'https://glam-up-salon-website--nateriyadravit.replit.app',
      ],
      objectSrc: ["'none'"],
      scriptSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'", 'https://fonts.googleapis.com'],
      connectSrc: ["'self'"],
    },
  },
  crossOriginEmbedderPolicy: false,
}))
app.use(express.json({ limit: '48kb' }))
app.use(requireSameOrigin)
app.use('/api', rateLimit({ windowMs: 15 * 60 * 1000, limit: 180, standardHeaders: 'draft-8', legacyHeaders: false }))

const authLimiter = rateLimit({ windowMs: 15 * 60 * 1000, limit: 8, standardHeaders: 'draft-8', legacyHeaders: false, message: { error: 'Too many sign-in attempts. Try again later.' } })
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: maximumFileBytes, files: 1, fields: 2, parts: 3 },
  fileFilter: (_request, file, callback) => {
    const allowedClaimedTypes = new Set([
      'image/png', 'image/jpeg', 'image/gif', 'image/webp', 'application/pdf',
      'text/plain', 'text/csv', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    ])
    callback(null, allowedClaimedTypes.has(file.mimetype))
  },
})

const registerSchema = z.object({
  name: z.string().trim().min(2).max(80),
  email: z.email().trim().max(254),
  password: z.string().min(12).max(128),
})
const loginSchema = z.object({ email: z.string().trim().min(1).max(254), password: z.string().min(1).max(128) })
const inquirySchema = z.object({
  name: z.string().trim().min(2).max(80),
  email: z.email().trim().max(254),
  business: z.string().trim().max(120).optional().default(''),
  website: z.string().trim().max(120).optional().default(''),
  package: z.string().trim().max(120).optional().default(''),
  details: z.string().trim().min(10).max(5000),
})
const orderSchema = z.object({
  businessName: z.string().trim().min(2).max(120),
  websiteName: z.string().trim().max(120).optional().default(''),
  packageName: z.string().trim().max(120).optional().default(''),
  projectType: z.string().trim().min(2).max(80),
  requirements: z.string().trim().min(20).max(10000),
  budget: z.string().trim().max(80).optional().default(''),
  desiredTimeline: z.string().trim().max(120).optional().default(''),
})
const analyticsSchema = z.object({
  visitorId: z.string().regex(/^[\w-]{12,80}$/),
  eventType: z.enum(['page_view', 'demo_view']),
  pagePath: z.string().startsWith('/').max(200).refine((value) => !value.startsWith('//')),
  projectSlug: z.string().regex(/^[a-z0-9-]{1,80}$/).optional(),
})
const statusSchema = z.object({ status: z.enum(['received', 'reviewing', 'in_progress', 'waiting_on_customer', 'completed', 'cancelled']) })
const demoSchema = z.object({
  slug: z.string().trim().regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/).max(80),
  name: z.string().trim().min(2).max(120),
  categorySlug: z.string().trim().regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/).max(80),
  description: z.string().trim().min(10).max(1000),
  liveUrl: z.url().optional().default(''),
  previewImage: z.url().optional().default(''),
  mobilePreviewImage: z.url().optional().default(''),
  highlights: z.array(z.string().trim().min(2).max(100)).max(12).default([]),
})

type OrderRow = {
  id: string
  user_id: string
  business_name: string
  website_name: string | null
  package_name: string | null
  project_type: string
  requirements: string
  budget: string | null
  desired_timeline: string | null
  status: string
  created_at: string
  updated_at: string
}

type UserRow = PublicUser & { password_hash?: string }

function parsed<T>(schema: z.ZodType<T>, value: unknown): T | undefined {
  const result = schema.safeParse(value)
  return result.success ? result.data : undefined
}

function publicUser(user: UserRow): PublicUser {
  return { id: user.id, name: user.name, email: user.email, role: user.role, created_at: user.created_at }
}

function requireUser(request: Request, response: express.Response): PublicUser | undefined {
  if (!request.user) {
    response.status(401).json({ error: 'Sign in to continue.' })
    return undefined
  }
  return request.user
}

async function bootstrapAdmin(): Promise<void> {
  const email = process.env.ADMIN_EMAIL?.trim().toLowerCase()
  const password = process.env.ADMIN_PASSWORD
  if (!email || !password) return
  if (password.length < 12 || Buffer.byteLength(password, 'utf8') > 72) {
    console.warn('DRAVIT admin bootstrap skipped: ADMIN_PASSWORD must be 12-72 UTF-8 bytes.')
    return
  }

  const existing = first<UserRow>('SELECT id, role FROM users WHERE email = ?', [email])
  if (existing) return
  const now = new Date().toISOString()
  run('INSERT INTO users (id, name, email, password_hash, role, created_at) VALUES (?, ?, ?, ?, ?, ?)', [
    randomUUID(), process.env.ADMIN_NAME?.trim() || 'DRAVIT NATERIYA', email,
    await bcrypt.hash(password, 12), 'admin', now,
  ])
}

function notify(subject: string, lines: string[]): void {
  void sendBusinessNotification(subject.replace(/[\r\n]+/g, ' ').slice(0, 180), lines.join('\n')).catch(() => undefined)
}

function orderSummary(order: OrderRow, user: PublicUser): string[] {
  return [
    `Customer: ${user.name} <${user.email}>`,
    `Business: ${order.business_name}`,
    `Project type: ${order.project_type}`,
    `Selected website: ${order.website_name || 'Not selected'}`,
    `Package: ${order.package_name || 'Not selected'}`,
    `Budget: ${order.budget || 'Not provided'}`,
    `Timeline: ${order.desired_timeline || 'Not provided'}`,
    '',
    order.requirements,
  ]
}

app.get('/api/health', (_request, response) => response.json({ status: 'ok' }))

app.get('/api/demo-categories', (_request, response) => {
  const categories = all(`SELECT demo_categories.slug, demo_categories.name,
    COUNT(demos.id) AS demo_count, COALESCE(SUM(demos.is_live), 0) AS live_count
    FROM demo_categories LEFT JOIN demos ON demos.category_id = demo_categories.slug
    GROUP BY demo_categories.id ORDER BY demo_categories.sort_order`)
  response.json({ categories })
})

app.get('/api/demos', (request, response) => {
  const category = typeof request.query.category === 'string' ? request.query.category.slice(0, 80) : ''
  const search = typeof request.query.search === 'string' ? request.query.search.trim().slice(0, 80) : ''
  const sort = request.query.sort === 'category' ? 'demo_categories.sort_order, demos.name' : 'demos.name'
  const clauses = ['demos.is_live = 1']
  const values: Array<string> = []
  if (category && category !== 'all') {
    clauses.push('demo_categories.slug = ?')
    values.push(category)
  }
  if (search) {
    clauses.push('(demos.name LIKE ? OR demo_categories.name LIKE ? OR demos.description LIKE ?)')
    const term = `%${search.replace(/[\\%_]/g, '\\$&')}%`
    values.push(term, term, term)
  }
  const demos = all(`SELECT demos.slug, demos.name, demo_categories.slug AS category_slug,
    demo_categories.name AS category, demos.description, demos.live_url, demos.preview_image,
    demos.mobile_preview_image, demos.highlights_json, demos.is_live, demos.created_at
    FROM demos JOIN demo_categories ON demo_categories.id = demos.category_id
    WHERE ${clauses.join(' AND ')} ORDER BY ${sort}`, values)
    .map((demo) => ({ ...demo, highlights: JSON.parse(String(demo.highlights_json)) as string[] }))
  response.json({ demos })
})

app.get('/api/demos/:slug', (request, response) => {
  const slug = String(request.params.slug)
  const demo = first(`SELECT demos.slug, demos.name, demo_categories.slug AS category_slug,
    demo_categories.name AS category, demos.description, demos.live_url, demos.preview_image,
    demos.mobile_preview_image, demos.highlights_json, demos.is_live, demos.created_at
    FROM demos JOIN demo_categories ON demo_categories.id = demos.category_id
    WHERE demos.slug = ? AND demos.is_live = 1`, [slug])
  if (!demo) {
    response.status(404).json({ error: 'Demo not found.' })
    return
  }
  response.json({ demo: { ...demo, highlights: JSON.parse(String(demo.highlights_json)) as string[] } })
})

app.post('/api/auth/register', authLimiter, async (request, response) => {
  const input = parsed(registerSchema, request.body)
  if (!input || Buffer.byteLength(input.password, 'utf8') > 72) {
    response.status(400).json({ error: 'Enter a valid name, email, and password (12-72 UTF-8 bytes).' })
    return
  }

  const email = input.email.toLowerCase()
  if (first('SELECT id FROM users WHERE email = ?', [email])) {
    response.status(409).json({ error: 'An account with this email already exists.' })
    return
  }

  const user: UserRow = {
    id: randomUUID(), name: input.name, email, role: 'customer', created_at: new Date().toISOString(),
  }
  const passwordHash = await bcrypt.hash(input.password, 12)
  try {
    run('INSERT INTO users (id, name, email, password_hash, role, created_at) VALUES (?, ?, ?, ?, ?, ?)', [
      user.id, user.name, user.email, passwordHash, user.role, user.created_at,
    ])
  } catch {
    response.status(409).json({ error: 'An account with this email already exists.' })
    return
  }

  createSession(user.id, response)
  response.status(201).json({ user: publicUser(user) })
})

app.post('/api/auth/login', authLimiter, async (request, response) => {
  const input = parsed(loginSchema, request.body)
  if (!input) {
    response.status(400).json({ error: 'Enter an email or mobile number and password.' })
    return
  }

  const loginValue = input.email.trim()
  let user = first<UserRow>('SELECT * FROM users WHERE email = ?', [loginValue.toLowerCase()])
  const configuredPhone = process.env.ADMIN_PHONE?.replace(/\D/g, '')
  if (!user && configuredPhone && loginValue.replace(/\D/g, '') === configuredPhone) {
    const adminEmail = process.env.ADMIN_EMAIL?.trim().toLowerCase()
    if (adminEmail) user = first<UserRow>("SELECT * FROM users WHERE email = ? AND role = 'admin'", [adminEmail])
  }
  if (!user?.password_hash || !(await bcrypt.compare(input.password, user.password_hash))) {
    response.status(401).json({ error: 'Email or password was incorrect.' })
    return
  }

  createSession(user.id, response)
  response.json({ user: publicUser(user) })
})

app.get('/api/auth/me', authenticate, (request, response) => {
  if (request.user) response.json({ user: request.user })
})

app.post('/api/auth/logout', authenticate, (request, response) => {
  clearSession(request, response)
  response.status(204).end()
})

app.post('/api/inquiries', async (request, response) => {
  const input = parsed(inquirySchema, request.body)
  if (!input) {
    response.status(400).json({ error: 'Check the required fields and try again.' })
    return
  }

  const id = randomUUID()
  const createdAt = new Date().toISOString()
  run('INSERT INTO inquiries (id, name, email, business_name, website_name, package_name, details, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?)', [
    id, input.name, input.email.toLowerCase(), input.business, input.website, input.package, input.details, createdAt,
  ])
  notify(`New DRAVIT enquiry from ${input.name}`, [
    `Name: ${input.name}`, `Email: ${input.email}`, `Business: ${input.business || 'Not provided'}`,
    `Website concept: ${input.website || 'Not selected'}`, `Package: ${input.package || 'Not selected'}`,
    '', input.details,
  ])
  response.status(201).json({ id, message: 'Your enquiry has been received.' })
})

app.post('/api/orders', authenticate, async (request, response) => {
  const user = requireUser(request, response)
  const input = parsed(orderSchema, request.body)
  if (!user) return
  if (!input) {
    response.status(400).json({ error: 'Check the project details and try again.' })
    return
  }

  const id = randomUUID()
  const now = new Date().toISOString()
  run(`INSERT INTO orders (id, user_id, business_name, website_name, package_name, project_type, requirements, budget, desired_timeline, status, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 'received', ?, ?)`, [
    id, user.id, input.businessName, input.websiteName, input.packageName,
    input.projectType, input.requirements, input.budget, input.desiredTimeline, now, now,
  ])
  const order = first<OrderRow>('SELECT * FROM orders WHERE id = ?', [id])
  if (order) notify(`New DRAVIT project order: ${input.businessName}`, orderSummary(order, user))
  response.status(201).json({ order: { ...order, files: [] } })
})

app.get('/api/orders', authenticate, (request, response) => {
  const user = requireUser(request, response)
  if (!user) return
  const orders = user.role === 'admin'
    ? all('SELECT orders.*, users.name AS customer_name, users.email AS customer_email FROM orders JOIN users ON users.id = orders.user_id ORDER BY created_at DESC')
    : all('SELECT * FROM orders WHERE user_id = ? ORDER BY created_at DESC', [user.id])
  response.json({ orders: orders.map((order) => ({
    ...order,
    files: all('SELECT id, original_name, mime_type, byte_size, created_at FROM files WHERE order_id = ? ORDER BY created_at DESC', [String(order.id)]),
  })) })
})

app.get('/api/orders/:id', authenticate, (request, response) => {
  const user = requireUser(request, response)
  if (!user) return
  const orderId = String(request.params.id)
  const order = first<OrderRow>('SELECT * FROM orders WHERE id = ?', [orderId])
  if (!order || (order.user_id !== user.id && user.role !== 'admin')) {
    response.status(404).json({ error: 'Project order not found.' })
    return
  }
  const files = all('SELECT id, original_name, mime_type, byte_size, created_at FROM files WHERE order_id = ? ORDER BY created_at DESC', [order.id])
  response.json({ order, files })
})

app.post('/api/orders/:id/files', authenticate, upload.single('file'), async (request, response) => {
  const user = requireUser(request, response)
  if (!user) return
  const orderId = String(request.params.id)
  const order = first<OrderRow>('SELECT * FROM orders WHERE id = ?', [orderId])
  if (!order || (order.user_id !== user.id && user.role !== 'admin')) {
    response.status(404).json({ error: 'Project order not found.' })
    return
  }
  if (!request.file) {
    response.status(400).json({ error: 'Choose a supported file of 10 MB or less.' })
    return
  }
  const usage = first<{ file_count: number; total_bytes: number }>(
    'SELECT COUNT(*) AS file_count, COALESCE(SUM(byte_size), 0) AS total_bytes FROM files WHERE order_id = ?',
    [order.id],
  )
  if ((usage?.file_count ?? 0) >= maximumFilesPerOrder || (usage?.total_bytes ?? 0) + request.file.size > maximumOrderUploadBytes) {
    response.status(413).json({ error: 'This project has reached its upload limit of 25 files or 100 MB.' })
    return
  }

  const filename = basename(request.file.originalname.replaceAll('\\', '/')).replace(/\p{Cc}/gu, '').slice(0, 180)
  const extension = extname(filename).toLowerCase()
  const detected = await fileTypeFromBuffer(request.file.buffer)
  let mimeType = detected?.mime
  let safeExtension = detected?.ext

  if (mimeType === 'application/zip' && ['.docx', '.xlsx'].includes(extension)) {
    mimeType = extension === '.docx'
      ? 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
      : 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
    safeExtension = extension.slice(1)
  }

  if (!mimeType && ['.txt', '.csv'].includes(extension) && !request.file.buffer.includes(0)) {
    try {
      new TextDecoder('utf-8', { fatal: true }).decode(request.file.buffer)
      mimeType = extension === '.csv' ? 'text/csv' : 'text/plain'
      safeExtension = extension.slice(1)
    } catch {
      mimeType = undefined
    }
  }

  const allowedTypes = new Set([
    'image/png', 'image/jpeg', 'image/gif', 'image/webp', 'application/pdf', 'text/plain', 'text/csv',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  ])
  if (!mimeType || !safeExtension || !allowedTypes.has(mimeType)) {
    response.status(415).json({ error: 'Supported files: PNG, JPEG, GIF, WebP, PDF, TXT, CSV, DOCX, and XLSX.' })
    return
  }

  const id = randomUUID()
  const storageName = `${randomUUID()}.${safeExtension}`
  await mkdir(uploadDirectory, { recursive: true })
  await writeFile(resolve(uploadDirectory, storageName), request.file.buffer, { flag: 'wx', mode: 0o600 })
  run('INSERT INTO files (id, order_id, user_id, original_name, storage_name, mime_type, byte_size, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?)', [
    id, order.id, user.id, filename || storageName, storageName, mimeType, request.file.size, new Date().toISOString(),
  ])
  response.status(201).json({ file: { id, originalName: filename, mimeType, size: request.file.size } })
})

app.get('/api/files/:id', authenticate, async (request, response) => {
  const user = requireUser(request, response)
  if (!user) return
  const fileId = String(request.params.id)
  const file = first<{ id: string; order_id: string; user_id: string; original_name: string; storage_name: string; mime_type: string }>(
    'SELECT id, order_id, user_id, original_name, storage_name, mime_type FROM files WHERE id = ?', [fileId],
  )
  if (!file || (file.user_id !== user.id && user.role !== 'admin')) {
    response.status(404).json({ error: 'File not found.' })
    return
  }

  response.setHeader('X-Content-Type-Options', 'nosniff')
  response.setHeader('Content-Type', file.mime_type)
  response.setHeader('Content-Disposition', `attachment; filename="${basename(file.original_name).replace(/["\\\r\n]/g, '_')}"`)
  response.send(await readFile(resolve(uploadDirectory, file.storage_name)))
})

app.post('/api/analytics', (request, response) => {
  const input = parsed(analyticsSchema, request.body)
  if (!input) {
    response.status(400).json({ error: 'Invalid analytics event.' })
    return
  }
  const visitorId = request.cookies?.visitor_id || input.visitorId
  run('INSERT INTO analytics (id, visitor_id, user_id, event_type, page_path, project_slug, created_at) VALUES (?, ?, ?, ?, ?, ?, ?)', [
    randomUUID(), visitorId, request.user?.id ?? null, input.eventType, input.pagePath, input.projectSlug ?? null, new Date().toISOString(),
  ])
  response.status(202).json({ accepted: true })
})

app.use('/api/admin', authenticate, requireAdmin)
app.get('/api/admin/summary', (_request, response) => {
  const users = first<{ total: number }>("SELECT COUNT(*) AS total FROM users WHERE role = 'customer'")?.total ?? 0
  const orders = first<{ total: number }>('SELECT COUNT(*) AS total FROM orders')?.total ?? 0
  const visitors = first<{ total: number }>('SELECT COUNT(DISTINCT visitor_id) AS total FROM analytics')?.total ?? 0
  const demoViews = first<{ total: number }>("SELECT COUNT(*) AS total FROM analytics WHERE event_type = 'demo_view'")?.total ?? 0
  const inquiries = first<{ total: number }>('SELECT COUNT(*) AS total FROM inquiries')?.total ?? 0
  response.json({ customers: users, orders, visitors, demoViews, inquiries })
})
app.get('/api/admin/customers', (_request, response) => {
  response.json({ customers: all(`SELECT users.id, users.name, users.email, users.created_at,
    (SELECT COUNT(*) FROM orders WHERE orders.user_id = users.id) AS order_count
    FROM users WHERE users.role = 'customer' ORDER BY users.created_at DESC`) })
})
app.get('/api/admin/orders', (_request, response) => {
  response.json({ orders: all(`SELECT orders.*, users.name AS customer_name, users.email AS customer_email
    FROM orders JOIN users ON users.id = orders.user_id ORDER BY orders.created_at DESC`) })
})
app.patch('/api/admin/orders/:id', (request, response) => {
  const input = parsed(statusSchema, request.body)
  if (!input) {
    response.status(400).json({ error: 'Choose a supported order status.' })
    return
  }
  const order = first<OrderRow>('SELECT * FROM orders WHERE id = ?', [request.params.id])
  if (!order) {
    response.status(404).json({ error: 'Project order not found.' })
    return
  }
  run('UPDATE orders SET status = ?, updated_at = ? WHERE id = ?', [input.status, new Date().toISOString(), order.id])
  response.json({ order: first('SELECT * FROM orders WHERE id = ?', [order.id]) })
})
app.get('/api/admin/analytics', (_request, response) => {
  response.json({
    daily: all(`SELECT substr(created_at, 1, 10) AS day, COUNT(DISTINCT visitor_id) AS visitors,
      SUM(CASE WHEN event_type = 'demo_view' THEN 1 ELSE 0 END) AS demo_views
      FROM analytics WHERE created_at >= datetime('now', '-30 days') GROUP BY day ORDER BY day`),
    popularDemos: all(`SELECT project_slug AS slug, COUNT(*) AS views FROM analytics
      WHERE event_type = 'demo_view' AND project_slug IS NOT NULL GROUP BY project_slug ORDER BY views DESC LIMIT 10`),
  })
})
app.get('/api/admin/inquiries', (_request, response) => {
  response.json({ inquiries: all('SELECT id, name, email, business_name, website_name, package_name, details, created_at FROM inquiries ORDER BY created_at DESC') })
})
app.post('/api/admin/demos', (request, response) => {
  const input = parsed(demoSchema, request.body)
  if (!input || [input.liveUrl, input.previewImage, input.mobilePreviewImage].some((url) => url && !url.startsWith('https://'))) {
    response.status(400).json({ error: 'Provide valid demo details and HTTPS URLs.' })
    return
  }
  const category = first('SELECT id FROM demo_categories WHERE slug = ?', [input.categorySlug])
  if (!category) {
    response.status(400).json({ error: 'Choose an existing demo category.' })
    return
  }
  const now = new Date().toISOString()
  run(`INSERT INTO demos (id, slug, name, category_id, description, live_url, preview_image, mobile_preview_image, highlights_json, is_live, created_at, updated_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`, [
    randomUUID(), input.slug, input.name, input.categorySlug, input.description,
    input.liveUrl, input.previewImage, input.mobilePreviewImage, JSON.stringify(input.highlights),
    input.liveUrl ? 1 : 0, now, now,
  ])
  response.status(201).json({ demo: { slug: input.slug, name: input.name, category: input.categorySlug } })
})

app.use('/api', (_request, response) => response.status(404).json({ error: 'API route not found.' }))

const publicDirectory = resolve('dist')
if (existsSync(publicDirectory)) {
  app.use(express.static(publicDirectory, { index: false, maxAge: process.env.NODE_ENV === 'production' ? '1h' : 0 }))
  app.get('/{*path}', (_request, response) => response.sendFile(resolve(publicDirectory, 'index.html')))
}

const errorHandler: ErrorRequestHandler = (error: unknown, _request, response, _next) => {
  if (error instanceof multer.MulterError) {
    response.status(error.code === 'LIMIT_FILE_SIZE' ? 413 : 400).json({ error: error.code === 'LIMIT_FILE_SIZE' ? 'Files must be 10 MB or smaller.' : 'The upload could not be processed.' })
    return
  }
  console.error('DRAVIT API request failed:', error instanceof Error ? error.name : 'UnknownError')
  response.status(500).json({ error: 'The request could not be completed.' })
}
app.use(errorHandler)

async function start(): Promise<void> {
  await initializeDatabase()
  await bootstrapAdmin()
  await mkdir(uploadDirectory, { recursive: true })
  app.listen(appPort, '0.0.0.0', () => console.info(`DRAVIT API listening on port ${appPort}`))
}

if (process.env.NODE_ENV !== 'test') {
  start().catch((error: unknown) => {
    console.error('DRAVIT API could not start:', error instanceof Error ? error.message : 'Unknown error')
    process.exitCode = 1
  })
}

export { app, start }
