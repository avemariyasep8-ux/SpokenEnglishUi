import axios from 'axios'

const API = axios.create({
  baseURL: '/api',
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
    if (err.response?.status === 401) {
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

// ── Progress ──────────────────────────────────────────
export const saveAnswer    = (data) => API.post('/progress/answer', data)
export const getUserProgress = (userId, languageId) =>
  API.get(`/progress/${userId}/${languageId}`)

// ── Word Content (definition/pattern cards) ───────────
export const getWordContent = (lessonId, languageId) =>
  API.get(`/wordcontent/${lessonId}/${languageId}`)

// ── Subscription ──────────────────────────────────────
export const getSubscriptionPlans   = () => API.get('/subscription/plans')
export const subscribe              = (data) => API.post('/subscription/subscribe', data)
export const getMySubscription      = (userId) => API.get(`/subscription/my/${userId}`)

// ── Streak ────────────────────────────────────────────
export const getStreak    = (userId) => API.get(`/streak/${userId}`)
export const updateStreak = (data)   => API.post('/streak/update', data)

// ── Admin Bulk Upload ─────────────────────────────────
export const getBulkTemplate = () => API.get('/admin/template', { responseType: 'blob' })
export const uploadBulkExcel = (file) => {
  const formData = new FormData()
  formData.append('file', file)
  return API.post('/admin/upload', formData, {
    headers: { 'Content-Type': 'multipart/form-data' }
  })
}

export default API
