import { randomUUID } from 'node:crypto'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { test } from 'node:test'
import assert from 'node:assert/strict'
import bcrypt from 'bcryptjs'
import request from 'supertest'

process.env.NODE_ENV = 'test'
process.env.DRAVIT_DATABASE_FILE = join(tmpdir(), `dravit-test-${randomUUID()}.sqlite`)
process.env.DRAVIT_UPLOAD_DIRECTORY = join(tmpdir(), `dravit-upload-test-${randomUUID()}`)

const { app } = await import('./index.js')
const { closeDatabase, first, initializeDatabase, run } = await import('./database.js')
await initializeDatabase()

const firstAgent = request.agent(app)
const secondAgent = request.agent(app)
let firstOrderId = ''

await test('health endpoint responds', async () => {
  const response = await request(app).get('/api/health')
  assert.equal(response.status, 200)
  assert.equal(response.body.status, 'ok')
})

await test('demo catalog exposes real projects, all categories, and searchable filters', async () => {
  const [categories, demos, filtered] = await Promise.all([
    request(app).get('/api/demo-categories'),
    request(app).get('/api/demos'),
    request(app).get('/api/demos?category=salon-and-beauty-websites&search=GlamUp'),
  ])
  assert.equal(categories.status, 200)
  assert.equal(categories.body.categories.length, 15)
  assert.equal(demos.body.demos.length, 2)
  assert.equal(demos.body.demos.find((demo: { slug: string }) => demo.slug === 'onebite')?.live_url, 'https://onebite-0d0avu13.share.landingsite.dev/')
  assert.equal(filtered.body.demos[0].slug, 'glam-up-salon')
})

await test('private and administrator routes reject anonymous requests', async () => {
  assert.equal((await request(app).get('/api/orders')).status, 401)
  assert.equal((await request(app).get('/api/admin/summary')).status, 401)
})

await test('registration creates a customer session and ignores requested role', async () => {
  const response = await firstAgent.post('/api/auth/register').send({
    name: 'First Customer',
    email: 'first@example.test',
    password: 'A-long-test-password-123!',
    role: 'admin',
  })
  assert.equal(response.status, 201)
  assert.equal(response.body.user.role, 'customer')
  assert.equal((await firstAgent.get('/api/auth/me')).body.user.email, 'first@example.test')
})

await test('customer orders are persistent and visible only to their owner', async () => {
  const response = await firstAgent.post('/api/orders').send({
    businessName: 'Northwind Studio',
    websiteName: 'Atelier House',
    packageName: 'The Full Story',
    projectType: 'Business website',
    requirements: 'A responsive portfolio and enquiry site for our interior design practice.',
    budget: '5k-10k',
    desiredTimeline: 'This quarter',
  })
  assert.equal(response.status, 201)
  firstOrderId = response.body.order.id
  assert.equal((await firstAgent.get('/api/orders')).body.orders.length, 1)

  const second = await secondAgent.post('/api/auth/register').send({
    name: 'Second Customer',
    email: 'second@example.test',
    password: 'Another-long-test-password-456!',
  })
  assert.equal(second.status, 201)
  assert.equal((await secondAgent.get(`/api/orders/${firstOrderId}`)).status, 404)
})

await test('weak passwords and anonymous administrator access are rejected', async () => {
  const weakPassword = await request(app).post('/api/auth/register').send({
    name: 'Weak Customer', email: 'weak@example.test', password: 'short',
  })
  assert.equal(weakPassword.status, 400)
  assert.equal((await firstAgent.get('/api/admin/summary')).status, 403)
})

await test('uploads stay private to the project owner', async () => {
  const uploaded = await firstAgent
    .post(`/api/orders/${firstOrderId}/files`)
    .attach('file', Buffer.from('Concept feedback for the studio.'), { filename: 'brief.txt', contentType: 'text/plain' })
  assert.equal(uploaded.status, 201)
  const fileId = uploaded.body.file.id as string
  assert.equal((await secondAgent.get(`/api/files/${fileId}`)).status, 404)
  const download = await firstAgent.get(`/api/files/${fileId}`)
  assert.equal(download.status, 200)
  assert.match(download.text, /Concept feedback/)
})

await test('administrator role gates management and permits status updates', async () => {
  const email = 'admin@example.test'
  const password = 'temporary-admin-test-password'
  run('INSERT INTO users (id, name, email, password_hash, role, created_at) VALUES (?, ?, ?, ?, ?, ?)', [
    randomUUID(), 'Test Administrator', email, await bcrypt.hash(password, 4), 'admin', new Date().toISOString(),
  ])
  const adminAgent = request.agent(app)
  const login = await adminAgent.post('/api/auth/login').send({ email, password })
  assert.equal(login.status, 200)
  assert.equal((await adminAgent.get('/api/admin/summary')).status, 200)
  const originalAdminEmail = process.env.ADMIN_EMAIL
  const originalAdminPhone = process.env.ADMIN_PHONE
  process.env.ADMIN_EMAIL = email
  process.env.ADMIN_PHONE = '9238348238'
  const phoneAgent = request.agent(app)
  const phoneLogin = await phoneAgent.post('/api/auth/login').send({ email: '9238348238', password })
  assert.equal(phoneLogin.status, 200)
  assert.equal(phoneLogin.body.user.role, 'admin')
  if (originalAdminEmail === undefined) delete process.env.ADMIN_EMAIL
  else process.env.ADMIN_EMAIL = originalAdminEmail
  if (originalAdminPhone === undefined) delete process.env.ADMIN_PHONE
  else process.env.ADMIN_PHONE = originalAdminPhone
  assert.equal((await adminAgent.get('/api/admin/inquiries')).status, 200)
  assert.equal((await adminAgent.patch(`/api/admin/orders/${firstOrderId}`).send({ status: 'reviewing' })).status, 200)
  assert.equal((await firstAgent.patch(`/api/admin/orders/${firstOrderId}`).send({ status: 'completed' })).status, 403)
  const demoResponse = await adminAgent.post('/api/admin/demos').send({
    slug: 'test-commerce-demo',
    name: 'Test Commerce Demo',
    categorySlug: 'e-commerce-websites',
    description: 'A test-only demo record used to validate admin catalog creation.',
    liveUrl: 'https://example.test/store',
    previewImage: 'https://example.test/store-preview.jpg',
    highlights: ['Product browsing', 'Secure checkout'],
  })
  assert.equal(demoResponse.status, 201)
  assert.equal((await request(app).get('/api/demos?category=e-commerce-websites')).body.demos[0].slug, 'test-commerce-demo')
})

await test('business inquiries are stored persistently', async () => {
  const response = await request(app).post('/api/inquiries').send({
    name: 'Studio Lead', email: 'lead@example.test', business: 'Northwind',
    website: 'Atelier House', details: 'We need a new responsive website for our business.',
  })
  assert.equal(response.status, 201)
  assert.equal(first('SELECT email FROM inquiries WHERE id = ?', [response.body.id])?.email, 'lead@example.test')
})

await test('SQLite data survives database close and re-open', async () => {
  closeDatabase()
  await initializeDatabase()
  const response = await firstAgent.get('/api/orders')
  assert.equal(response.status, 200)
  assert.equal(response.body.orders[0].id, firstOrderId)
})
