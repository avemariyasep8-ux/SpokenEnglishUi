import axios from 'axios'

const BASE = import.meta.env.VITE_API_URL
  ? `${import.meta.env.VITE_API_URL}/api`
  : '/api'

const API = axios.create({
  baseURL: BASE,
  headers: { 'Content-Type': 'application/json' },
})

// Attach JWT token to every request
API.interceptors.request.use((config) => {
  const token = localStorage.getItem('token')
  if (token) config.headers.Authorization = `Bearer ${token}`
  return config
})

// Handle 401 globally
API.interceptors.response.use(
  (res) => res,
  (err) => {
    // Only redirect on 401 for non-auth requests (login errors should show inline)
    if (err.response?.status === 401 && !err.config?.url?.includes('/auth/')) {
      localStorage.removeItem('token')
      localStorage.removeItem('user')
      window.location.href = '/login'
    }
    return Promise.reject(err)
  }
)

// ── Auth ──────────────────────────────────────────────
export const login    = (data) => API.post('/auth/login', data)
export const register = (data) => API.post('/auth/register', data)
export const refresh  = (data) => API.post('/auth/refresh', data)

// ── Lessons ───────────────────────────────────────────
export const getLessons      = (languageId) => API.get(`/lessons/${languageId}`)
export const getLessonDetail  = (lessonId)  => API.get(`/lessons/detail/${lessonId}`)
export const addLesson       = (data)      => API.post('/lessons', data)
export const updateLesson    = (data)      => API.put('/lessons', data)
export const deleteLesson    = (lessonId)  => API.delete(`/lessons/${lessonId}`)
export const getSequentialLesson = (lessonId, languageId) =>
  API.get(`/lessons/flow/${lessonId}/${languageId}`)

// ── Meaning Quiz ──────────────────────────────────────
export const getMeaningQuestions = (lessonId, languageId) =>
  API.get(`/meaning/${lessonId}/${languageId}`)

export const getMeaningQuestionsAdmin = (lessonId, languageId) =>
  API.get(`/meaning/admin/${lessonId}/${languageId}`)

export const addMeaningQuestion    = (data) => API.post('/meaning/question', data)
export const updateMeaningQuestion = (data) => API.put('/meaning/question', data)
export const deleteMeaningQuestion = (id)   => API.delete(`/meaning/question/${id}`)

export const addMeaningOption    = (data) => API.post('/meaning/option', data)
export const updateMeaningOption = (data) => API.put('/meaning/option', data)
export const deleteMeaningOption = (id)   => API.delete(`/meaning/option/${id}`)

// ── Arrange ───────────────────────────────────────────
export const getArrangeSentences = (lessonId, languageId) =>
  API.get(`/arrange/${lessonId}/${languageId}`)
export const addArrangeSentence = (data) => API.post('/arrange', data)
export const deleteArrangeSentence = (id) => API.delete(`/arrange/${id}`)

// ── Reading ───────────────────────────────────────────
export const getReadingSentences = (lessonId, languageId) =>
  API.get(`/reading/${lessonId}/${languageId}`)

// ── Admin – Reading sentences CRUD ─────────────────────
export const adminGetReading    = (lessonId) => API.get(`/admin/reading/${lessonId}`)
export const adminAddReading    = (data) => API.post('/admin/reading', data)
export const adminUpdateReading = (id, data) => API.put(`/admin/reading/${id}`, data)
export const adminDeleteReading = (id) => API.delete(`/admin/reading/${id}`)

// ── Admin – Arrange/Translate CRUD (persists tamilMeaning) ──
export const adminAddArrange    = (data) => API.post('/admin/arrange', data)
export const adminUpdateArrange = (id, data) => API.put(`/admin/arrange/${id}`, data)
export const adminDeleteArrange = (id) => API.delete(`/admin/arrange/${id}`)

// ── Progress ──────────────────────────────────────────
export const saveAnswer        = (data)              => API.post('/progress/answer', data)
export const getUserProgress   = (userId, languageId)=> API.get(`/progress/${userId}/${languageId}`)
export const getLessonSummary  = (userId)            => API.get(`/progress/lesson-summary/${userId}`)
export const completeLesson    = (data)              => API.post('/progress/complete-lesson', data)
export const resetLessonProgress = (userId, lessonId)=> API.delete(`/progress/reset/${userId}/${lessonId}`)

// ── Word Content (definition/pattern cards) ───────────
export const getWordContent    = (lessonId, languageId) => API.get(`/wordcontent/${lessonId}/${languageId}`)
export const addWordContent    = (data) => API.post('/wordcontent', data)
export const updateWordContent = (id, data) => API.put(`/wordcontent/${id}`, data)
export const deleteWordContent = (id) => API.delete(`/wordcontent/${id}`)

// ── Arrange CRUD ───────────────────────────────────────
export const updateArrangeSentence = (data) => API.put('/arrange', data)
export const addArrangeWord    = (data) => API.post('/arrange/word', data)
export const deleteArrangeWord = (id)   => API.delete(`/arrange/word/${id}`)

// ── Subscription ──────────────────────────────────────
export const getSubscriptionPlans   = () => API.get('/subscription/plans')
export const subscribe              = (data) => API.post('/subscription/subscribe', data)
export const getMySubscription      = (userId) => API.get(`/subscription/my/${userId}`)

// ── Streak ────────────────────────────────────────────
export const getStreak    = (userId) => API.get(`/streak/${userId}`)
export const updateStreak = (data)   => API.post('/streak/update', data)

// ── Admin Import / Export / Templates ─────────────────────────────────────────
export const getBulkTemplate  = () => API.get('/admin/template', { responseType: 'blob' })
export const uploadBulkExcel  = (file) => { const fd = new FormData(); fd.append('file', file); return API.post('/admin/upload', fd, { headers: { 'Content-Type': 'multipart/form-data' } }) }
export const downloadTemplate = (type) => API.get(`/admin/template/${type}`, { responseType: 'blob' })
export const importLessons    = (file) => { const fd = new FormData(); fd.append('file', file); return API.post('/admin/import/lessons', fd, { headers: { 'Content-Type': 'multipart/form-data' } }) }
export const importWordContent= (file) => { const fd = new FormData(); fd.append('file', file); return API.post('/admin/import/wordcontent', fd, { headers: { 'Content-Type': 'multipart/form-data' } }) }
export const importMcq        = (file) => { const fd = new FormData(); fd.append('file', file); return API.post('/admin/import/mcq', fd, { headers: { 'Content-Type': 'multipart/form-data' } }) }
export const importArrange    = (file) => { const fd = new FormData(); fd.append('file', file); return API.post('/admin/import/arrange', fd, { headers: { 'Content-Type': 'multipart/form-data' } }) }
export const importTranslate  = (file) => { const fd = new FormData(); fd.append('file', file); return API.post('/admin/import/arrange', fd, { headers: { 'Content-Type': 'multipart/form-data' } }) }
export const importReading    = (file) => { const fd = new FormData(); fd.append('file', file); return API.post('/admin/import/reading', fd, { headers: { 'Content-Type': 'multipart/form-data' } }) }
export const getLessonStats        = () => API.get('/admin/lesson-stats')
export const grantUserAccess       = (id, grant) => API.post(`/admin/users/${id}/grant-access`, { grant })

// ── Admin – Lessons CRUD ───────────────────────────────────────────────────
export const adminGetLessons       = () => API.get('/admin/lessons-list')
export const adminCreateLesson     = (data) => API.post('/admin/lessons', data)
export const adminUpdateLesson     = (id, data) => API.put(`/admin/lessons/${id}`, data)
export const adminDeleteLesson     = (id) => API.delete(`/admin/lessons/${id}`)
export const adminSetPremium       = (id, isPremium) => API.post(`/admin/lessons/${id}/premium`, { isPremium })

// ── Admin – Users CRUD ─────────────────────────────────────────────────────
export const adminGetUsers         = () => API.get('/admin/users')
export const adminCreateUser       = (data) => API.post('/admin/users', data)
export const adminUpdateUser       = (id, data) => API.put(`/admin/users/${id}`, data)
export const adminDeleteUser       = (id) => API.delete(`/admin/users/${id}`)
export const adminSetRole          = (id, role) => API.post(`/admin/users/${id}/role`, { role })
export const adminToggleUser       = (id) => API.post(`/admin/users/${id}/toggle`)
export const adminResetPassword    = (id, newPassword) => API.post(`/admin/users/${id}/password`, { newPassword })
export const adminGetStats         = () => API.get('/admin/stats')

// ── Admin – Reports ────────────────────────────────────────────────────────
export const adminReportsOverview  = () => API.get('/admin/reports/overview')
export const adminReportsUsers     = () => API.get('/admin/reports/users')
export const adminReportUser       = (userId) => API.get(`/admin/reports/user/${userId}`)

// ── Admin – Lesson Access per user ────────────────────────────────────────
export const adminGetUserAccess    = (userId) => API.get(`/admin/users/${userId}/lesson-access`)
export const adminSetLessonAccess  = (userId, lessonId, hasAccess) =>
  API.post(`/admin/users/${userId}/lesson-access`, { lessonId, hasAccess })

// ── Admin – Export CSV ────────────────────────────────────────────────────
export const adminExportCsv        = (type) => API.get(`/admin/export/${type}`, { responseType: 'blob' })

// ── Schools ───────────────────────────────────────────────────────────────────
export const getSchools            = () => API.get('/school')
export const createSchool          = (data) => API.post('/school', data)
export const updateSchool          = (id, data) => API.put(`/school/${id}`, data)
export const getSchoolUsers        = (schoolId) => API.get(`/school/${schoolId}/users`)
export const getSchoolProgress     = (schoolId, teacherId) => API.get(`/school/${schoolId}/progress${teacherId ? `?teacherId=${teacherId}` : ''}`)
export const getSchoolStats        = (schoolId) => API.get(`/school/${schoolId}/stats`)
export const approveSchoolUser     = (schoolId, userId) => API.post(`/school/${schoolId}/users/${userId}/approve`)
export const getWeeklyActivity     = (userId) => API.get(`/school/weekly-activity/${userId}`)

export default API
