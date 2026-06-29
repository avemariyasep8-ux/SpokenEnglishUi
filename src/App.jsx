import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom'
import { AuthProvider, useAuth } from './context/AuthContext'
import Landing      from './pages/Landing'
import Login        from './pages/Login'
import Register     from './pages/Register'
import Dashboard    from './pages/Dashboard'
import Lessons      from './pages/Lessons'
import WordMeaning  from './pages/WordMeaning'
import ArrangeWord  from './pages/ArrangeWord'
import Reading      from './pages/Reading'
import Progress     from './pages/Progress'
import LessonExplanation from './pages/LessonExplanation'
import LessonFlow        from './pages/LessonFlow'
import LessonPlay        from './pages/LessonPlay'
import AdminLessons from './pages/AdminLessons'
import AdminMeaningQuestions from './pages/AdminMeaningQuestions'
import AdminArrangeSentences from './pages/AdminArrangeSentences'
import AdminBulkUpload from './pages/AdminBulkUpload'
import AdminDashboard from './pages/AdminDashboard'
import AdminAddLesson from './pages/AdminAddLesson'
import AdminLessonContent from './pages/AdminLessonContent'
import AdminSchools from './pages/AdminSchools'
import AdminSubscriptions from './pages/AdminSubscriptions'
import Subscription from './pages/Subscription'

// ── Route Wrappers ────────────────────────────────────
function PrivateRoute({ children }) {
  const { user, loading } = useAuth()
  if (loading) return <div className="loading-center"><div className="spinner" /></div>
  return user ? children : <Navigate to="/login" />
}

function AdminRoute({ children }) {
  const { user, loading } = useAuth()
  if (loading) return <div className="loading-center"><div className="spinner" /></div>
  if (!user) return <Navigate to="/login" />
  if (user.role !== 'Admin') return <Navigate to="/dashboard" />
  return children
}

function SchoolRoute({ children, roles }) {
  const { user, loading } = useAuth()
  if (loading) return <div className="loading-center"><div className="spinner" /></div>
  if (!user) return <Navigate to="/login" />
  const allowed = roles || ['Admin', 'Teacher', 'Headmaster']
  if (!allowed.includes(user.role) && !allowed.includes(user.schoolRole)) return <Navigate to="/dashboard" />
  return children
}

export default function App() {
  return (
    <Router>
      <AuthProvider>
        <Routes>
          {/* Public Routes */}
          <Route path="/"         element={<Landing />} />
          <Route path="/login"    element={<Login />} />
          <Route path="/register" element={<Register />} />

          {/* Protected Routes */}
          <Route path="/dashboard" element={<PrivateRoute><Dashboard /></PrivateRoute>} />
          <Route path="/lessons"   element={<PrivateRoute><Lessons /></PrivateRoute>} />
          <Route path="/progress"  element={<PrivateRoute><Progress /></PrivateRoute>} />
          <Route path="/lesson/:lessonId/play" element={<PrivateRoute><LessonPlay /></PrivateRoute>} />
          <Route path="/lesson/:lessonId/flow" element={<PrivateRoute><LessonFlow /></PrivateRoute>} />

          {/* Activity Routes */}
          <Route path="/meaning/:lessonId" element={<PrivateRoute><WordMeaning /></PrivateRoute>} />
          <Route path="/arrange/:lessonId" element={<PrivateRoute><ArrangeWord /></PrivateRoute>} />
          <Route path="/reading/:lessonId" element={<PrivateRoute><Reading /></PrivateRoute>} />

          {/* Subscription */}
          <Route path="/subscription" element={<PrivateRoute><Subscription /></PrivateRoute>} />

          {/* Admin Routes */}
          <Route path="/admin"                          element={<AdminRoute><AdminDashboard /></AdminRoute>} />
          <Route path="/admin/add-lesson"               element={<AdminRoute><AdminAddLesson /></AdminRoute>} />
          <Route path="/admin/lessons"                  element={<AdminRoute><AdminLessons /></AdminRoute>} />
          <Route path="/admin/lesson/:lessonId/content" element={<AdminRoute><AdminLessonContent /></AdminRoute>} />
          <Route path="/admin/meaning/:lessonId"        element={<AdminRoute><AdminMeaningQuestions /></AdminRoute>} />
          <Route path="/admin/arrange/:lessonId"        element={<AdminRoute><AdminArrangeSentences /></AdminRoute>} />
          <Route path="/admin/bulk"                     element={<AdminRoute><AdminBulkUpload /></AdminRoute>} />
          <Route path="/admin/schools"                  element={<AdminRoute><AdminSchools /></AdminRoute>} />
          <Route path="/admin/subscriptions"            element={<AdminRoute><AdminSubscriptions /></AdminRoute>} />

          <Route path="*" element={<Navigate to="/" />} />
        </Routes>
      </AuthProvider>
    </Router>
  )
}
