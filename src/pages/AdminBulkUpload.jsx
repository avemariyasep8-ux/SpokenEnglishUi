import { useState } from 'react'
import { motion } from 'framer-motion'
import { getBulkTemplate, uploadBulkExcel } from '../services/api'

const styles = {
  card: {
    background: 'rgba(23, 23, 33, 0.7)',
    backdropFilter: 'blur(12px)',
    border: '1px solid rgba(255, 255, 255, 0.1)',
    borderRadius: '16px',
    padding: '32px',
    maxWidth: '600px',
    margin: '0 auto',
    boxShadow: '0 8px 32px rgba(0, 0, 0, 0.3)',
  },
  uploadBox: {
    border: '2px dashed rgba(255, 255, 255, 0.2)',
    borderRadius: '12px',
    padding: '40px 20px',
    textAlign: 'center',
    cursor: 'pointer',
    transition: 'all 0.3s ease',
    marginBottom: '24px',
  },
  btnPrimary: {
    background: 'linear-gradient(135deg, #8b5cf6 0%, #d946ef 100%)',
    border: 'none',
    color: 'white',
    padding: '12px 24px',
    borderRadius: '8px',
    fontWeight: 600,
    cursor: 'pointer',
    boxShadow: '0 4px 12px rgba(139, 92, 246, 0.4)',
  },
  btnSecondary: {
    background: 'rgba(255, 255, 255, 0.05)',
    border: '1px solid rgba(255, 255, 255, 0.1)',
    color: 'white',
    padding: '12px 24px',
    borderRadius: '8px',
    fontWeight: 600,
    cursor: 'pointer',
    marginRight: '12px',
  }
}

export default function AdminBulkUpload() {
  const [file, setFile] = useState(null)
  const [loading, setLoading] = useState(false)
  const [message, setMessage] = useState(null)
  const [isError, setIsError] = useState(false)

  const handleDownloadTemplate = async () => {
    try {
      const response = await getBulkTemplate()
      const url = window.URL.createObjectURL(new Blob([response.data]))
      const link = document.createElement('a')
      link.href = url
      link.setAttribute('download', 'SpokenEnglish_Template.xlsx')
      document.body.appendChild(link)
      link.click()
      link.remove()
    } catch (err) {
      console.error('Download error:', err)
      alert('Failed to download template')
    }
  }

  const handleFileChange = (e) => {
    if (e.target.files?.[0]) {
      setFile(e.target.files[0])
      setMessage(null)
    }
  }

  const handleUpload = async () => {
    if (!file) return
    setLoading(true)
    setMessage(null)
    try {
      const res = await uploadBulkExcel(file)
      setMessage(res.data.message || 'Successfully processed bulk data!')
      setIsError(false)
      setFile(null)
    } catch (err) {
      setMessage(err.response?.data || 'Failed to upload file. Please check template format.')
      setIsError(true)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="page-wrapper">
      <div className="star-bg" />
      <div className="container" style={{ paddingTop: 80, position: 'relative', zIndex: 1 }}>
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
          <h1 className="heading-md" style={{ textAlign: 'center', marginBottom: 40 }}>
            🚀 Bulk Content Manager
          </h1>

          <div style={styles.card}>
            <p style={{ color: '#aaa', marginBottom: 24, fontSize: '0.95rem', lineHeight: 1.6 }}>
              Update your entire lesson library using Excel. You can add new lessons, meaning questions, 
              and arrange-word exercises in one go.
            </p>

            <button style={styles.btnSecondary} onClick={handleDownloadTemplate}>
              📥 Download Template
            </button>

            <div style={{ marginTop: 32 }}>
              <label htmlFor="file-upload" style={{ ...styles.uploadBox, display: 'block' }}>
                <span style={{ fontSize: '2rem', display: 'block', marginBottom: 12 }}>📄</span>
                {file ? (
                  <span style={{ color: '#8b5cf6', fontWeight: 600 }}>{file.name}</span>
                ) : (
                  <span style={{ color: '#777' }}>Click or drag a .xlsx file here</span>
                )}
                <input 
                  id="file-upload" 
                  type="file" 
                  accept=".xlsx" 
                  onChange={handleFileChange} 
                  style={{ display: 'none' }} 
                />
              </label>

              {message && (
                <motion.div 
                  initial={{ opacity: 0 }} animate={{ opacity: 1 }}
                  style={{ 
                    padding: '12px', 
                    borderRadius: '8px', 
                    marginBottom: '20px',
                    textAlign: 'center',
                    background: isError ? 'rgba(239, 68, 68, 0.1)' : 'rgba(16, 185, 129, 0.1)',
                    border: `1px solid ${isError ? '#ef4444' : '#10b981'}`,
                    color: isError ? '#fca5a5' : '#6ee7b7'
                  }}
                >
                  {message}
                </motion.div>
              )}

              <button 
                style={{ ...styles.btnPrimary, width: '100%', opacity: (!file || loading) ? 0.6 : 1 }} 
                disabled={!file || loading}
                onClick={handleUpload}
              >
                {loading ? 'Uploading & Processing...' : '📤 Upload & Update Content'}
              </button>
            </div>
          </div>
        </motion.div>
      </div>
    </div>
  )
}
