// Speech utilities — English TTS tuned for Tamil learners (slow, clear, British/Indian accent)

const PREFERRED_VOICES = [
  'Google UK English Female',
  'Google UK English Male',
  'Google US English',
  'Microsoft Zira - English (United States)',
  'Microsoft Mark - English (United States)',
  'Microsoft David - English (United States)',
  'en-IN-Wavenet-A', // Indian English – familiar accent
]

let voiceCache = []
function getVoices() {
  if (voiceCache.length) return voiceCache
  voiceCache = window.speechSynthesis.getVoices()
  return voiceCache
}
window.speechSynthesis?.addEventListener?.('voiceschanged', () => {
  voiceCache = window.speechSynthesis.getVoices()
})

function pickEnglishVoice() {
  const voices = getVoices()
  for (const name of PREFERRED_VOICES) {
    const v = voices.find(v => v.name === name)
    if (v) return v
  }
  // Fallback: any en-IN (Indian English) or en-GB — closest to what Tamil speakers hear
  return voices.find(v => v.lang === 'en-IN') ||
         voices.find(v => v.lang === 'en-GB') ||
         voices.find(v => v.lang.startsWith('en')) ||
         null
}

// Rate 0.78 = deliberately slow & clear for ESL learners
export const speak = (text, lang = 'en-US', rate = 0.78) => {
  if (!window.speechSynthesis || !text) return

  const utterance = new SpeechSynthesisUtterance(text)
  utterance.rate   = rate
  utterance.pitch  = 0.95
  utterance.volume = 1
  utterance.lang   = lang

  const doSpeak = () => {
    if (lang.startsWith('en')) {
      const voice = pickEnglishVoice()
      if (voice) utterance.voice = voice
    }
    // Chrome bug: cancel() then immediate speak() is silently dropped.
    // Wrapping in setTimeout(0) lets the cancel flush before the new utterance queues.
    window.speechSynthesis.cancel()
    setTimeout(() => window.speechSynthesis.speak(utterance), 50)
  }

  if (getVoices().length === 0) {
    window.speechSynthesis.addEventListener('voiceschanged', doSpeak, { once: true })
  } else {
    doSpeak()
  }
}

// Speak word-by-word with pauses so learner can follow along
export const speakWordByWord = (text, lang = 'en-US') => {
  if (!window.speechSynthesis || !text) return
  window.speechSynthesis.cancel()
  const words = text.split(/\s+/).filter(Boolean)
  let i = 0
  const next = () => {
    if (i >= words.length) return
    const u = new SpeechSynthesisUtterance(words[i++])
    u.rate = 0.65
    u.lang = lang
    const voice = pickEnglishVoice()
    if (voice) u.voice = voice
    u.onend = () => setTimeout(next, 220)
    window.speechSynthesis.speak(u)
  }
  next()
}

// Translate text using MyMemory free API (no key needed)
export const translateText = async (text, fromLang = 'en', toLang = 'ta') => {
  try {
    const url = `https://api.mymemory.translated.net/get?q=${encodeURIComponent(text)}&langpair=${fromLang}|${toLang}`
    const res  = await fetch(url)
    const data = await res.json()
    if (data.responseStatus === 200) return data.responseData.translatedText
    return null
  } catch {
    return null
  }
}

// Tamil TTS: translate then speak at slow rate
export const speakTamil = async (englishText) => {
  const tamil = await translateText(englishText, 'en', 'ta')
  if (tamil) {
    const voices = getVoices()
    const taVoice = voices.find(v => v.lang === 'ta-IN')
    const u = new SpeechSynthesisUtterance(tamil)
    u.lang = 'ta-IN'
    u.rate = 0.85
    if (taVoice) u.voice = taVoice
    window.speechSynthesis.cancel()
    window.speechSynthesis.speak(u)
  }
}

// Check if speech recognition is available (Chrome/Edge only)
export const isSpeechRecognitionSupported = () =>
  !!(window.SpeechRecognition || window.webkitSpeechRecognition)

// Speech-to-Text — stops TTS first so mic doesn't pick up speaker
export const listen = (lang = 'en-US') => {
  return new Promise((resolve, reject) => {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition
    if (!SpeechRecognition) {
      reject({ type: 'not-supported', message: 'Voice input needs Chrome or Edge browser.' })
      return
    }

    // Stop any ongoing TTS so speaker audio doesn't feed into mic
    if (window.speechSynthesis?.speaking) {
      window.speechSynthesis.cancel()
    }

    const rec = new SpeechRecognition()
    rec.lang             = lang
    rec.interimResults   = false
    rec.maxAlternatives  = 3
    rec.continuous       = false

    let settled = false
    const settle = (fn) => { if (!settled) { settled = true; fn() } }

    rec.onresult = (e) => settle(() => resolve(e.results[0][0].transcript))

    rec.onerror = (e) => settle(() => {
      const msgs = {
        'no-speech':     { type: 'no-speech',  message: 'No speech heard — speak closer to mic.' },
        'not-allowed':   { type: 'permission', message: 'Microphone blocked — tap the lock icon in the address bar and allow mic.' },
        'audio-capture': { type: 'permission', message: 'No microphone found. Please connect a mic.' },
        'network':       { type: 'network',    message: 'Network error during voice recognition.' },
        'aborted':       { type: 'aborted',    message: 'Listening was cancelled.' },
      }
      reject(msgs[e.error] ?? { type: e.error, message: `Voice error: ${e.error}` })
    })

    rec.onend = () => settle(() =>
      reject({ type: 'no-speech', message: 'No speech detected. Please try again.' })
    )

    try {
      rec.start()
    } catch (e) {
      reject({ type: 'error', message: 'Could not start microphone.' })
    }
  })
}

export const normalizeText = (text) =>
  text.toLowerCase()
      .replace(/[.,/#!$%^&*;:{}=\-_`~()'"?]/g, '')
      .replace(/\s+/g, ' ')
      .trim()

// Word-by-word diff — returns [{word, correct}]
export const diffWords = (spoken, target) => {
  const spokenNorm = normalizeText(spoken).split(' ').filter(Boolean)
  const targetWords = target.split(' ').filter(Boolean)
  const targetNorm  = normalizeText(target).split(' ').filter(Boolean)
  return targetWords.map((word, i) => {
    const t = targetNorm[i] || ''
    const correct = spokenNorm.some(sw => sw === t || sw.includes(t) || t.includes(sw))
    return { word, correct }
  })
}
