// @ts-check
const { chromium } = require('playwright')

const BASE_URL = 'https://spoken-english-ui.vercel.app'
const API_URL  = 'https://spoken-english-api-production.up.railway.app'

const SCENARIOS = [
  { label: 'Admin login',          email: 'Admin@gmail.com',   password: 'Admin@2026',  expectRoute: '/admin',     expectPass: true,  needsError: false },
  { label: 'User login',           email: 'Andrews@gmail.com', password: 'Andrews@123', expectRoute: '/dashboard', expectPass: true,  needsError: false },
  { label: 'Wrong password',       email: 'Admin@gmail.com',   password: 'WrongPass',   expectRoute: '/login',     expectPass: false, needsError: true  },
  { label: 'Unknown email',        email: 'nobody@x.com',      password: 'any',         expectRoute: '/login',     expectPass: false, needsError: true  },
  { label: 'Empty email',          email: '',                   password: 'Admin@2026',  expectRoute: '/login',     expectPass: false, needsError: false }, // HTML5 native validation blocks
  { label: 'Empty password',       email: 'Admin@gmail.com',   password: '',            expectRoute: '/login',     expectPass: false, needsError: false }, // HTML5 native validation blocks
]

const PASS = '✅ PASS'
const FAIL = '❌ FAIL'
const results = []

;(async () => {
  const browser = await chromium.launch({
    headless: false,
    slowMo: 300,
    executablePath: 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
  })
  const context = await browser.newContext()
  const page    = await context.newPage()

  // Capture ALL network responses to trace the full call chain
  const apiCalls = []
  page.on('request', (req) => {
    const url = req.url()
    if (url.includes('auth') || url.includes('login') || url.includes('railway') || url.includes('vercel')) {
      console.log(`  [REQ] ${req.method()} ${url}`)
    }
  })
  page.on('response', async (res) => {
    const url = res.url()
    if (url.includes('auth') || url.includes('login') || url.includes('railway') || url.includes('vercel')) {
      let body = ''
      try { body = (await res.text()).substring(0, 200) } catch {}
      console.log(`  [RES] ${res.status()} ${url} → ${body}`)
    }
    if (url.includes('/auth/login') || url.includes('railway')) {
      apiCalls.push({ status: res.status(), url, body: '' })
    }
  })

  for (const s of SCENARIOS) {
    console.log(`\n--- Running: ${s.label} ---`)
    apiCalls.length = 0

    // Navigate fresh, hard-reload clears any cached state
    await page.goto(`${BASE_URL}/login`, { waitUntil: 'networkidle' })
    await page.waitForTimeout(500)

    // Screenshot: initial state
    await page.screenshot({ path: `src/test/screenshots/${s.label.replace(/\s/g,'-')}-1-initial.png` })

    // Fill form
    const emailField    = page.locator('#login-email')
    const passwordField = page.locator('#login-password')
    const submitBtn     = page.locator('#login-btn')

    await emailField.clear()
    await emailField.fill(s.email)
    await passwordField.clear()
    await passwordField.fill(s.password)

    // Screenshot: filled form
    await page.screenshot({ path: `src/test/screenshots/${s.label.replace(/\s/g,'-')}-2-filled.png` })

    // Submit
    await submitBtn.click()

    // Wait for navigation or error message (max 8s)
    await Promise.race([
      page.waitForURL(`**${s.expectRoute}**`, { timeout: 8000 }).catch(() => {}),
      page.waitForSelector('.alert-error', { timeout: 8000 }).catch(() => {}),
    ])
    await page.waitForTimeout(800)

    // Screenshot: result
    await page.screenshot({ path: `src/test/screenshots/${s.label.replace(/\s/g,'-')}-3-result.png` })

    const currentUrl  = page.url()
    const errorEl     = await page.locator('.alert-error').first().textContent().catch(() => '')
    const apiCall     = apiCalls[0] || null
    const onExpected  = currentUrl.includes(s.expectRoute)
    const stayedOnLogin = currentUrl.includes('/login')
    const passed = s.expectPass
      ? onExpected
      : stayedOnLogin && (!s.needsError || !!errorEl)

    const result = {
      scenario:    s.label,
      email:       s.email || '(empty)',
      password:    s.password ? '***' : '(empty)',
      expectPass:  s.expectPass,
      landed:      currentUrl.replace(BASE_URL, ''),
      expected:    s.expectRoute,
      apiStatus:   apiCall?.status ?? '(no call)',
      uiError:     errorEl || '(none)',
      result:      passed ? PASS : FAIL,
    }
    results.push(result)

    console.log(`  ${result.result} | landed: ${result.landed} | api: ${result.apiStatus} | uiErr: ${result.uiError}`)

    // Log out if we navigated away from login
    if (!currentUrl.includes('/login')) {
      await page.goto(`${BASE_URL}/login`, { waitUntil: 'networkidle' })
      // Clear localStorage so next test starts fresh
      await page.evaluate(() => localStorage.clear())
    }
  }

  await browser.close()

  // ── Report ────────────────────────────────────────────
  console.log('\n\n════════════════════════════════════════════')
  console.log('  UI LOGIN TEST RESULTS')
  console.log('════════════════════════════════════════════')
  for (const r of results) {
    console.log(`\n${r.result}  ${r.scenario}`)
    console.log(`   Email:      ${r.email}`)
    console.log(`   Password:   ${r.password}`)
    console.log(`   Expected:   ${r.expectPass ? 'PASS → '+r.expected : 'FAIL (stay on /login)'}`)
    console.log(`   Landed on:  ${r.landed}`)
    console.log(`   API status: ${r.apiStatus}`)
    console.log(`   UI error:   ${r.uiError}`)
  }

  const passed = results.filter(r => r.result === PASS).length
  const total  = results.length
  console.log(`\n════════════════════════════════════════════`)
  console.log(`  ${passed}/${total} scenarios passed`)
  console.log(`════════════════════════════════════════════\n`)

  process.exit(passed === total ? 0 : 1)
})()
