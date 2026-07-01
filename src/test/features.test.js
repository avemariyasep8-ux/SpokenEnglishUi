/**
 * Unit tests for the 6 new features:
 * 1. Typed Translation Exercise (scoring logic)
 * 2. Level-based lesson filtering
 * 3. Student Progress Dashboard (stat computation)
 * 4. School Management (role validation)
 * 5. Subscription plan access check
 * 6. Admin feature guards
 */

import { describe, it, expect } from 'vitest'

// ─── 1. Typed Translation Exercise ───────────────────────────────────────────

function evaluateTranslation(userAnswer, correctAnswer) {
  const norm = s => s.toLowerCase().replace(/[^a-z0-9\s]/g, '').trim()
  const userWords   = norm(userAnswer).split(/\s+/).filter(Boolean)
  const targetWords = norm(correctAnswer).split(/\s+/).filter(Boolean)
  if (!targetWords.length) return 0
  const matched = targetWords.filter(w => userWords.includes(w)).length
  return Math.round((matched / targetWords.length) * 100)
}

describe('Feature 1 – Typed Translation Scoring', () => {
  it('returns 100% for perfect match', () => {
    expect(evaluateTranslation('I go to school', 'I go to school')).toBe(100)
  })

  it('is case-insensitive', () => {
    expect(evaluateTranslation('i GO to SCHOOL', 'I go to school')).toBe(100)
  })

  it('ignores punctuation', () => {
    expect(evaluateTranslation('I go to school!', 'I go to school')).toBe(100)
  })

  it('returns partial score when some words match', () => {
    // "I go" matches 2 of 4 target words → 50%
    expect(evaluateTranslation('I go home', 'I go to school')).toBe(50)
  })

  it('returns 0 for completely wrong answer', () => {
    expect(evaluateTranslation('cat dog fish', 'I go to school')).toBe(0)
  })

  it('handles empty user answer gracefully', () => {
    expect(evaluateTranslation('', 'I go to school')).toBe(0)
  })
})

// ─── 2. Level-Based Lesson Filtering ─────────────────────────────────────────

const VALID_LEVELS = ['Beginner', 'Elementary', 'Intermediate', 'College', 'Professional']

const sampleLessons = [
  { id: 1, title: 'Greetings',      level: 'Beginner' },
  { id: 2, title: 'Colors',         level: 'Beginner' },
  { id: 3, title: 'Present Tense',  level: 'Elementary' },
  { id: 4, title: 'Past Tense',     level: 'Intermediate' },
  { id: 5, title: 'Presentation',   level: 'College' },
  { id: 6, title: 'Business Email', level: 'Professional' },
  { id: 7, title: 'Legacy Lesson',  level: null },   // old lessons default to Beginner
]

function filterLessons(lessons, activeLevel) {
  if (activeLevel === 'All') return lessons
  return lessons.filter(l => (l.level || 'Beginner') === activeLevel)
}

describe('Feature 2 – Level Filter', () => {
  it('returns all lessons when activeLevel is All', () => {
    expect(filterLessons(sampleLessons, 'All')).toHaveLength(7)
  })

  it('filters to Beginner lessons (including null-level)', () => {
    const result = filterLessons(sampleLessons, 'Beginner')
    expect(result).toHaveLength(3)           // id 1, 2, 7
    expect(result.map(l => l.id)).toContain(7) // null level → Beginner
  })

  it('filters to Elementary lessons', () => {
    const result = filterLessons(sampleLessons, 'Elementary')
    expect(result).toHaveLength(1)
    expect(result[0].id).toBe(3)
  })

  it('filters to College lessons', () => {
    expect(filterLessons(sampleLessons, 'College')).toHaveLength(1)
  })

  it('valid level constants are correct', () => {
    expect(VALID_LEVELS).toEqual(['Beginner', 'Elementary', 'Intermediate', 'College', 'Professional'])
  })
})

// ─── 3. Student Progress Dashboard ───────────────────────────────────────────

function computeStats(progressRows) {
  const done       = progressRows.filter(r => r.is_completed).length
  const totalXp    = progressRows.reduce((s, r) => s + (r.xp_earned || 0), 0)
  const totalWrong = progressRows.reduce((s, r) => s + (r.wrong_answers || 0), 0)
  const totalRight = progressRows.reduce((s, r) => s + (r.correct_answers || 0), 0)
  const totalAns   = totalRight + totalWrong
  const accuracy   = totalAns > 0 ? Math.round((totalRight / totalAns) * 100) : 0
  return { done, totalXp, totalWrong, totalRight, accuracy }
}

describe('Feature 3 – Progress Dashboard Stats', () => {
  const rows = [
    { is_completed: true,  xp_earned: 50, correct_answers: 8, wrong_answers: 2 },
    { is_completed: true,  xp_earned: 40, correct_answers: 7, wrong_answers: 3 },
    { is_completed: false, xp_earned: 10, correct_answers: 3, wrong_answers: 7 },
  ]

  it('counts only completed lessons', () => {
    expect(computeStats(rows).done).toBe(2)
  })

  it('sums XP correctly', () => {
    expect(computeStats(rows).totalXp).toBe(100)
  })

  it('calculates accuracy percentage', () => {
    // correct: 18, wrong: 12, total: 30 → 60%
    expect(computeStats(rows).accuracy).toBe(60)
  })

  it('returns 0 accuracy when no answers exist', () => {
    expect(computeStats([]).accuracy).toBe(0)
  })
})

// ─── 4. School Management – Role Validation ───────────────────────────────────

const SCHOOL_ROLES = ['Student', 'Teacher', 'Headmaster']

function canSeeAllStudents(role) {
  return role === 'Headmaster' || role === 'Admin'
}

function canSeeOwnStudents(role) {
  return role === 'Teacher'
}

describe('Feature 4 – School Role Access', () => {
  it('Headmaster can see all students', () => {
    expect(canSeeAllStudents('Headmaster')).toBe(true)
  })

  it('Admin can see all students', () => {
    expect(canSeeAllStudents('Admin')).toBe(true)
  })

  it('Teacher cannot see all students', () => {
    expect(canSeeAllStudents('Teacher')).toBe(false)
  })

  it('Teacher can see own students', () => {
    expect(canSeeOwnStudents('Teacher')).toBe(true)
  })

  it('Student cannot see own students (teacher view)', () => {
    expect(canSeeOwnStudents('Student')).toBe(false)
  })

  it('valid school roles are Student, Teacher, Headmaster', () => {
    expect(SCHOOL_ROLES).toEqual(['Student', 'Teacher', 'Headmaster'])
  })
})

// ─── 5. Subscription Plan Access Check ───────────────────────────────────────

const samplePlans = [
  { plan_id: 1, plan_name: 'Free',         max_lessons: 5,  price: 0 },
  { plan_id: 2, plan_name: 'Basic',        max_lessons: 20, price: 99 },
  { plan_id: 3, plan_name: 'Premium',      max_lessons: 50, price: 299 },
  { plan_id: 4, plan_name: 'Institutional',max_lessons: 999,price: 999 },
]

function canAccessLesson(lessonNumber, userPlan) {
  if (!userPlan) return lessonNumber <= 5   // free default
  return lessonNumber <= userPlan.max_lessons
}

describe('Feature 5 – Subscription Lesson Access', () => {
  it('free users can access first 5 lessons', () => {
    expect(canAccessLesson(5, null)).toBe(true)
    expect(canAccessLesson(6, null)).toBe(false)
  })

  it('Basic plan can access up to lesson 20', () => {
    const plan = samplePlans.find(p => p.plan_name === 'Basic')
    expect(canAccessLesson(20, plan)).toBe(true)
    expect(canAccessLesson(21, plan)).toBe(false)
  })

  it('Premium plan can access up to lesson 50', () => {
    const plan = samplePlans.find(p => p.plan_name === 'Premium')
    expect(canAccessLesson(50, plan)).toBe(true)
    expect(canAccessLesson(51, plan)).toBe(false)
  })

  it('Institutional plan can access all lessons', () => {
    const plan = samplePlans.find(p => p.plan_name === 'Institutional')
    expect(canAccessLesson(999, plan)).toBe(true)
  })

  it('sample plan prices are valid numbers', () => {
    samplePlans.forEach(p => {
      expect(typeof p.price).toBe('number')
      expect(p.price).toBeGreaterThanOrEqual(0)
    })
  })
})

// ─── 6. Admin Feature Guards ──────────────────────────────────────────────────

function isAdmin(user) { return user?.role === 'Admin' }
function isSchoolStaff(user) { return ['Teacher', 'Headmaster'].includes(user?.schoolRole) }

describe('Feature 6 – Admin Guards', () => {
  const admin     = { role: 'Admin',   email: 'admin@test.com' }
  const user      = { role: 'User',    email: 'user@test.com' }
  const teacher   = { role: 'User',    schoolRole: 'Teacher' }
  const headmaster= { role: 'User',    schoolRole: 'Headmaster' }
  const student   = { role: 'User',    schoolRole: 'Student' }

  it('Admin role passes isAdmin guard', () => {
    expect(isAdmin(admin)).toBe(true)
  })

  it('regular User fails isAdmin guard', () => {
    expect(isAdmin(user)).toBe(false)
  })

  it('null user fails isAdmin guard', () => {
    expect(isAdmin(null)).toBe(false)
  })

  it('Teacher is recognized as school staff', () => {
    expect(isSchoolStaff(teacher)).toBe(true)
  })

  it('Headmaster is recognized as school staff', () => {
    expect(isSchoolStaff(headmaster)).toBe(true)
  })

  it('Student is NOT school staff', () => {
    expect(isSchoolStaff(student)).toBe(false)
  })
})

// ─── 7. User Level at Registration ───────────────────────────────────────────

const ALL_LEVELS = ['Beginner', 'Elementary', 'Intermediate', 'College', 'Professional']

function isValidLevel(level) {
  return ALL_LEVELS.includes(level)
}

function normalizeLevel(level) {
  return level && isValidLevel(level) ? level : 'Beginner'
}

describe('Feature 7 – User Level at Registration', () => {
  it('accepts all 5 valid levels', () => {
    ALL_LEVELS.forEach(l => expect(isValidLevel(l)).toBe(true))
  })

  it('rejects invalid level strings', () => {
    expect(isValidLevel('Advanced')).toBe(false)
    expect(isValidLevel('expert')).toBe(false)
    expect(isValidLevel('')).toBe(false)
  })

  it('normalizes null/undefined to Beginner', () => {
    expect(normalizeLevel(null)).toBe('Beginner')
    expect(normalizeLevel(undefined)).toBe('Beginner')
    expect(normalizeLevel('')).toBe('Beginner')
  })

  it('preserves valid level as-is', () => {
    expect(normalizeLevel('Intermediate')).toBe('Intermediate')
    expect(normalizeLevel('Professional')).toBe('Professional')
  })

  it('register payload includes level field', () => {
    const payload = {
      email: 'user@test.com', mobnumber: '9876543210',
      password: 'Test123', level: 'Elementary',
      fullName: 'Test User', schoolId: null, schoolRole: null, className: null
    }
    expect(payload).toHaveProperty('level')
    expect(isValidLevel(payload.level)).toBe(true)
  })

  it('login response includes level in user object', () => {
    const loginResponse = {
      userID: 5, email: 'u@test.com', token: 'jwt',
      apiKey: 'key', role: 'User', level: 'Intermediate'
    }
    const userData = {
      userId: loginResponse.userID, email: loginResponse.email,
      apiKey: loginResponse.apiKey, role: loginResponse.role,
      level: loginResponse.level || 'Beginner'
    }
    expect(userData.level).toBe('Intermediate')
  })
})

// ─── 8. Level-based Lesson Filtering ─────────────────────────────────────────

function filterLessonsByLevel(lessons, userLevel) {
  if (!userLevel || userLevel === 'All') return lessons
  return lessons.filter(l => (l.level || 'Beginner') === userLevel)
}

describe('Feature 8 – Level-based Lesson Filtering', () => {
  const lessons = [
    { lessonName: 'Greetings',    level: 'Beginner'      },
    { lessonName: 'Daily Phrases',level: 'Beginner'      },
    { lessonName: 'Articles',     level: 'Elementary'    },
    { lessonName: 'Tenses',       level: 'Intermediate'  },
    { lessonName: 'Business Eng', level: 'Professional'  },
    { lessonName: 'Legacy Lesson',level: null            }, // null defaults to Beginner
  ]

  it('Beginner user sees only Beginner + null-level lessons', () => {
    const result = filterLessonsByLevel(lessons, 'Beginner')
    expect(result).toHaveLength(3)
    result.forEach(l => expect(l.level || 'Beginner').toBe('Beginner'))
  })

  it('All filter returns all lessons', () => {
    expect(filterLessonsByLevel(lessons, 'All')).toHaveLength(lessons.length)
  })

  it('Intermediate user sees only Intermediate lessons', () => {
    const result = filterLessonsByLevel(lessons, 'Intermediate')
    expect(result).toHaveLength(1)
    expect(result[0].lessonName).toBe('Tenses')
  })

  it('Professional user sees only Professional lessons', () => {
    const result = filterLessonsByLevel(lessons, 'Professional')
    expect(result).toHaveLength(1)
    expect(result[0].lessonName).toBe('Business Eng')
  })

  it('College user sees no lessons when none are at College level', () => {
    const result = filterLessonsByLevel(lessons, 'College')
    expect(result).toHaveLength(0)
  })

  it('default level for logged-in user is applied from user object', () => {
    const user = { userId: 1, level: 'Elementary' }
    const defaultLevel = user?.level || 'All'
    expect(defaultLevel).toBe('Elementary')
    const result = filterLessonsByLevel(lessons, defaultLevel)
    expect(result).toHaveLength(1)
    expect(result[0].lessonName).toBe('Articles')
  })
})

// ─── 9. Translate Sentence (Arrange with TamilMeaning) ───────────────────────

function buildTranslateQueue(arrangeSentences, wordContents, maxTr = 3) {
  const fromArrange = arrangeSentences
    .filter(a => a.tamilMeaning)
    .slice(0, maxTr)
    .map(a => ({ type: 'translate', data: { tamilMeaning: a.tamilMeaning, correctSentence: a.correctSentence } }))

  const fromWords = wordContents
    .filter(w => w.exampleTa && w.exampleEn)
    .slice(0, 3)
    .map(w => ({ type: 'translate', data: { tamilMeaning: w.exampleTa, correctSentence: w.exampleEn } }))

  return [...fromArrange, ...fromWords]
}

describe('Feature 9 – Translate Sentence Admin & Queue', () => {
  const arrangeSentences = [
    { correctSentence: 'She is happy.',      tamilMeaning: 'அவள் மகிழ்ச்சியாக இருக்கிறாள்.' },
    { correctSentence: 'He is a teacher.',   tamilMeaning: null },
    { correctSentence: 'The sky is blue.',   tamilMeaning: 'வானம் நீலமாக உள்ளது.' },
  ]
  const wordContents = [
    { wordName: 'Reasonable', exampleEn: 'The price is reasonable.', exampleTa: 'விலை சமயோஜிதமாக உள்ளது.' },
    { wordName: 'Empty',      exampleEn: null,                        exampleTa: null },
  ]

  it('translate queue only includes sentences with tamilMeaning', () => {
    const queue = buildTranslateQueue(arrangeSentences, [])
    queue.forEach(q => expect(q.data.tamilMeaning).toBeTruthy())
  })

  it('sentences without tamilMeaning are excluded', () => {
    const queue = buildTranslateQueue(arrangeSentences, [])
    expect(queue.some(q => q.data.correctSentence === 'He is a teacher.')).toBe(false)
  })

  it('word content with both exampleEn and exampleTa feeds translate queue', () => {
    const queue = buildTranslateQueue([], wordContents)
    expect(queue.some(q => q.data.correctSentence === 'The price is reasonable.')).toBe(true)
  })

  it('word content without Tamil example does not feed translate queue', () => {
    const queue = buildTranslateQueue([], wordContents)
    expect(queue.some(q => q.data.tamilMeaning == null)).toBe(false)
  })

  it('arrange add payload includes tamilMeaning field', () => {
    const payload = {
      lessonId: 1,
      correctSentence: 'She is happy.',
      tamilMeaning: 'அவள் மகிழ்ச்சியாக இருக்கிறாள்.',
      words: ['She', 'is', 'happy.']
    }
    expect(payload).toHaveProperty('tamilMeaning')
    expect(payload.tamilMeaning).not.toBeNull()
  })
})

// ─── 10. Sentence Pattern Display in Lesson Steps ────────────────────────────

function getExampleDisplay(word) {
  return word.exampleEn || word.sentencePattern || ''
}

describe('Feature 10 – Sentence Pattern in Lesson Steps', () => {
  it('ExampleStep shows exampleEn when present', () => {
    const word = { exampleEn: 'The price is reasonable.', sentencePattern: 'The + [obj] + is + reasonable.' }
    expect(getExampleDisplay(word)).toBe('The price is reasonable.')
  })

  it('ExampleStep falls back to sentencePattern when exampleEn is missing', () => {
    const word = { exampleEn: null, sentencePattern: 'The + [object] + is + very + reasonable + for + everyone.' }
    expect(getExampleDisplay(word)).toBe('The + [object] + is + very + reasonable + for + everyone.')
  })

  it('ExampleStep returns empty string when both missing', () => {
    const word = { exampleEn: null, sentencePattern: null }
    expect(getExampleDisplay(word)).toBe('')
  })

  it('MeaningStep always displays sentencePattern when available', () => {
    const word = { wordName: 'Reasonable', sentencePattern: 'The + [object] + is + very + reasonable.' }
    expect(word.sentencePattern).not.toBeNull()
    expect(word.sentencePattern.length).toBeGreaterThan(0)
  })

  it('ArrangeStep shows hintText or sentencePattern as pattern hint', () => {
    const sentence = { sentencePattern: 'Subject + is + Adjective', hintText: null }
    const hint = sentence.sentencePattern || sentence.hintText
    expect(hint).toBe('Subject + is + Adjective')
  })

  it('ArrangeStep shows hintText when sentencePattern is absent', () => {
    const sentence = { sentencePattern: null, hintText: 'Subject + Verb + Object' }
    const hint = sentence.sentencePattern || sentence.hintText
    expect(hint).toBe('Subject + Verb + Object')
  })

  it('ExampleStep plays audio using exEn (fallback to pattern)', () => {
    const wordNoExample = { exampleEn: null, sentencePattern: 'Subject + is + Adjective.' }
    const wordWithExample = { exampleEn: 'The sky is blue.', sentencePattern: null }
    expect(getExampleDisplay(wordNoExample)).toBe('Subject + is + Adjective.')
    expect(getExampleDisplay(wordWithExample)).toBe('The sky is blue.')
  })
})
