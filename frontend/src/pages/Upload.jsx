import React, { useState, useRef } from 'react'
import {
  Box,
  Card,
  CardContent,
  Typography,
  Button,
  LinearProgress,
  Alert,
  Stepper,
  Step,
  StepLabel,
  StepContent,
  Paper,
  Chip,
  IconButton,
  Backdrop,
  CircularProgress,
  Grid,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions
} from '@mui/material'
import {
  CloudUpload,
  CheckCircle,
  Error,
  PlayArrow,
  Download,
  Visibility,
  Delete,
  Assignment
} from '@mui/icons-material'
import { useNavigate } from 'react-router-dom'
import axios from 'axios'

const steps = [
  {
    label: 'העלאת קובץ CSV',
    description: 'בחר קובץ CSV מהמחשב שלך'
  },
  {
    label: 'אימות נתונים',
    description: 'המערכת בודקת את תקינות הקובץ'
  },
  {
    label: 'עיבוד הנתונים',
    description: 'המרת הקובץ לפורמט Excel'
  },
  {
    label: 'סיום העיבוד',
    description: 'הקובץ מוכן להורדה'
  }
]

function Upload() {
  const navigate = useNavigate()
  const fileInputRef = useRef()
  
  const [activeStep, setActiveStep] = useState(0)
  const [selectedFile, setSelectedFile] = useState(null)
  const [uploading, setUploading] = useState(false)
  const [processing, setProcessing] = useState(false)
  const [uploadResult, setUploadResult] = useState(null)
  const [processingResult, setProcessingResult] = useState(null)
  const [error, setError] = useState('')
  const [dragOver, setDragOver] = useState(false)
  const [showResults, setShowResults] = useState(false)

  const handleFileSelect = (file) => {
    if (!file) return
    
    if (!file.name.toLowerCase().endsWith('.csv')) {
      setError('רק קבצי CSV מותרים')
      return
    }
    
    if (file.size > 50 * 1024 * 1024) {
      setError('גודל הקובץ לא יכול לעלות על 50MB')
      return
    }
    
    setSelectedFile(file)
    setError('')
    setActiveStep(1)
  }

  const handleDrop = (e) => {
    e.preventDefault()
    setDragOver(false)
    const files = Array.from(e.dataTransfer.files)
    if (files.length > 0) {
      handleFileSelect(files[0])
    }
  }

  const handleDragOver = (e) => {
    e.preventDefault()
    setDragOver(true)
  }

  const handleDragLeave = (e) => {
    e.preventDefault()
    setDragOver(false)
  }

  const uploadFile = async () => {
    if (!selectedFile) return
    
    setUploading(true)
    setError('')
    
    const formData = new FormData()
    formData.append('csvFile', selectedFile)
    
    try {
      const response = await axios.post('/api/upload', formData, {
        headers: {
          'Content-Type': 'multipart/form-data'
        }
      })
      
      // Handle response structure
      const uploadData = response.data.data || response.data;
      // Ensure fileId is set correctly (backend returns 'id')
      if (uploadData.id && !uploadData.fileId) {
        uploadData.fileId = uploadData.id;
      }
      setUploadResult(uploadData)
      setActiveStep(2)
    } catch (error) {
      // Provide detailed error messages based on error type
      let errorMessage = 'שגיאה בהעלאת הקובץ'

      if (error.response) {
        // Server responded with error
        const status = error.response.status
        const data = error.response.data

        if (status === 409 && data.isDuplicate) {
          // Duplicate billing period detected
          errorMessage = `${data.message}\n\nקובץ קיים: ${data.existingFile?.name || 'לא ידוע'}\nתקופת חיוב: ${data.existingFile?.billingPeriod || 'לא ידוע'}`
        } else if (status === 400) {
          if (data.details) {
            errorMessage = data.message + ': ' + data.details
          } else if (data.message) {
            errorMessage = data.message
          } else {
            errorMessage = 'פורמט קובץ לא תקין. ודא שהקובץ הוא CSV תקני'
          }
        } else if (status === 401) {
          errorMessage = 'לא מורשה. יש להתחבר מחדש'
        } else if (status === 413) {
          errorMessage = 'הקובץ גדול מדי (מעל 50MB)'
        } else if (status === 415) {
          errorMessage = 'סוג קובץ לא נתמך. יש להעלות קובץ CSV בלבד'
        } else if (status === 500) {
          errorMessage = 'שגיאת שרת. נסה שוב מאוחר יותר'
        } else if (data.message) {
          errorMessage = data.message
        }
      } else if (error.request) {
        // Request was made but no response received
        errorMessage = 'לא ניתן להתחבר לשרת. בדוק את חיבור האינטרנט'
      } else {
        // Something else happened
        errorMessage = error.message || 'שגיאה לא צפויה'
      }

      setError(errorMessage)
    } finally {
      setUploading(false)
    }
  }

  const processFile = async () => {
    console.log('uploadResult:', uploadResult); // Debug log
    if (!uploadResult?.fileId) {
      console.error('No fileId in uploadResult');
      setError('שגיאה: לא נמצא מזהה קובץ');
      return;
    }
    
    setProcessing(true)
    setError('')
    
    try {
      const response = await axios.post('/api/process', {
        fileId: uploadResult.fileId
      })
      console.log('Process response:', response.data); // Debug log
      const processData = response.data.data || response.data;
      setProcessingResult(processData)
      setActiveStep(3)
      setShowResults(true) // Auto show results after processing
    } catch (error) {
      console.error('Process error:', error); // Debug log
      let errorMessage = 'שגיאה בעיבוד הקובץ'
      
      if (error.response?.data) {
        const data = error.response.data
        if (data.details) {
          errorMessage = data.details
        } else if (data.message) {
          errorMessage = data.message
        }
        
        // Show full error details
        if (data.error) {
          console.error('Processing error details:', data.error)
        }
      }
      
      setError(errorMessage)
    } finally {
      setProcessing(false)
    }
  }

  const resetUpload = () => {
    setActiveStep(0)
    setSelectedFile(null)
    setUploadResult(null)
    setProcessingResult(null)
    setError('')
    setShowResults(false)
    // Reset the file input element
    if (fileInputRef.current) {
      fileInputRef.current.value = ''
    }
  }

  const formatCurrency = (amount) => {
    if (!amount) return '₪0.00'
    return new Intl.NumberFormat('he-IL', {
      style: 'currency',
      currency: 'ILS'
    }).format(amount)
  }

  const formatFileSize = (bytes) => {
    if (bytes === 0) return '0 Bytes'
    const k = 1024
    const sizes = ['Bytes', 'KB', 'MB', 'GB']
    const i = Math.floor(Math.log(bytes) / Math.log(k))
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i]
  }

  const downloadFile = async (type) => {
    // If we have download URLs from processing, use them directly
    if (processingResult?.downloadUrls) {
      const url = type === 'excel' ? processingResult.downloadUrls.excel : processingResult.downloadUrls.tsv
      if (url) {
        window.open(url, '_blank')
        return
      }
    }
    
    // Fallback to API download
    if (!uploadResult?.fileId) return
    
    try {
      const endpoint = type === 'excel' ? '/api/download/excel' : '/api/download/tsv'
      const response = await axios.get(endpoint, {
        params: { fileId: uploadResult.fileId },
        responseType: 'blob'
      })
      
      // Create download link
      const url = window.URL.createObjectURL(new Blob([response.data]))
      const link = document.createElement('a')
      link.href = url
      
      // Set filename based on type (use camelCase to match backend response)
      if (type === 'excel') {
        link.setAttribute('download', processingResult?.excelFilename || 'output.xlsx')
      } else {
        link.setAttribute('download', processingResult?.tsvFilename || 'output.txt')
      }
      
      document.body.appendChild(link)
      link.click()
      link.remove()
      window.URL.revokeObjectURL(url)
    } catch (error) {
      console.error('Download error:', error)
      if (error.response?.status === 404) {
        setError(`קובץ ${type === 'excel' ? 'Excel' : 'TSV'} לא נמצא. נסה לעבד את הקובץ מחדש`)
      } else {
        setError('שגיאה בהורדת הקובץ')
      }
    }
  }

  return (
    <Box sx={{ width: '100%' }}>
      <Box sx={{ mb: 4 }}>
        <Typography variant="h4" component="h1" gutterBottom fontWeight="bold">
          העלאת קבצים
        </Typography>
        <Typography variant="subtitle1" color="text.secondary">
          העלה קובץ CSV לעיבוד אוטומטי והמרה לפורמט Excel
        </Typography>
      </Box>

      {error && (
        <Alert severity="error" sx={{ mb: 3, borderRadius: 2 }} onClose={() => setError('')}>
          {error}
        </Alert>
      )}

      <Grid container spacing={3}>
        <Grid item xs={12} md={8}>
          <Card sx={{ borderRadius: 3, boxShadow: '0 4px 20px rgba(0,0,0,0.08)' }}>
            <CardContent sx={{ p: 4 }}>
              <Stepper activeStep={activeStep} orientation="vertical">
                {steps.map((step, index) => (
                  <Step key={step.label}>
                    <StepLabel
                      optional={
                        index === 3 ? (
                          <Typography variant="caption">שלב אחרון</Typography>
                        ) : null
                      }
                    >
                      <Typography fontWeight="bold">{step.label}</Typography>
                    </StepLabel>
                    <StepContent>
                      <Typography sx={{ mb: 2 }}>{step.description}</Typography>
                      
                      {/* Step 0: File Upload */}
                      {index === 0 && (
                        <Box>
                          <Paper
                            sx={{
                              p: 4,
                              textAlign: 'center',
                              border: '2px dashed',
                              borderColor: dragOver ? 'primary.main' : 'grey.300',
                              backgroundColor: dragOver ? 'primary.50' : 'background.paper',
                              borderRadius: 3,
                              cursor: 'pointer',
                              transition: 'all 0.3s ease',
                              '&:hover': {
                                borderColor: 'primary.main',
                                backgroundColor: 'primary.50'
                              }
                            }}
                            onDrop={handleDrop}
                            onDragOver={handleDragOver}
                            onDragLeave={handleDragLeave}
                            onClick={() => fileInputRef.current?.click()}
                          >
                            <CloudUpload sx={{ fontSize: 60, color: 'primary.main', mb: 2 }} />
                            <Typography variant="h6" gutterBottom>
                              גרור קובץ CSV לכאן או לחץ לבחירה
                            </Typography>
                            <Typography variant="body2" color="text.secondary">
                              תמיכה בקבצים עד 50MB
                            </Typography>
                            <input
                              ref={fileInputRef}
                              type="file"
                              accept=".csv"
                              style={{ display: 'none' }}
                              onChange={(e) => handleFileSelect(e.target.files[0])}
                            />
                          </Paper>
                        </Box>
                      )}

                      {/* Step 1: File Validation */}
                      {index === 1 && selectedFile && (
                        <Box>
                          <Paper sx={{ p: 3, mb: 2, borderRadius: 2 }}>
                            <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                              <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                                <Assignment sx={{ color: 'primary.main' }} />
                                <Box>
                                  <Typography fontWeight="bold">{selectedFile.name}</Typography>
                                  <Typography variant="body2" color="text.secondary">
                                    {formatFileSize(selectedFile.size)}
                                  </Typography>
                                </Box>
                              </Box>
                              <IconButton onClick={() => {
                                setSelectedFile(null)
                                setActiveStep(0)
                                if (fileInputRef.current) {
                                  fileInputRef.current.value = ''
                                }
                              }} color="error">
                                <Delete />
                              </IconButton>
                            </Box>
                          </Paper>
                          
                          <Box sx={{ display: 'flex', gap: 2 }}>
                            <Button
                              variant="contained"
                              onClick={uploadFile}
                              disabled={uploading}
                              endIcon={uploading ? <CircularProgress size={20} /> : <CloudUpload />}
                            >
                              {uploading ? 'מעלה...' : 'העלה קובץ'}
                            </Button>
                            <Button onClick={() => setActiveStep(0)}>
                              בחר קובץ אחר
                            </Button>
                          </Box>
                        </Box>
                      )}

                      {/* Step 2: Processing */}
                      {index === 2 && uploadResult && (
                        <Box>
                          <Alert severity="success" sx={{ mb: 2, borderRadius: 2 }}>
                            הקובץ הועלה בהצלחה! מוכן לעיבוד
                          </Alert>
                          
                          <Box sx={{ display: 'flex', gap: 2 }}>
                            <Button
                              variant="contained"
                              onClick={() => {
                                console.log('Process button clicked!');
                                console.log('Current uploadResult:', uploadResult);
                                console.log('Processing state:', processing);
                                processFile();
                              }}
                              disabled={processing}
                              endIcon={processing ? <CircularProgress size={20} /> : <PlayArrow />}
                              color="secondary"
                            >
                              {processing ? 'מעבד...' : 'התחל עיבוד'}
                            </Button>
                            <Button onClick={resetUpload}>
                              התחל מחדש
                            </Button>
                          </Box>
                          
                          {processing && (
                            <Box sx={{ mt: 3 }}>
                              <Typography variant="body2" gutterBottom>
                                מעבד קובץ...
                              </Typography>
                              <LinearProgress sx={{ borderRadius: 1 }} />
                            </Box>
                          )}
                        </Box>
                      )}

                      {/* Step 3: Results */}
                      {index === 3 && processingResult && (
                        <Box>
                          <Alert severity="success" sx={{ mb: 3, borderRadius: 2 }}>
                            <Typography fontWeight="bold">
                              הקובץ עובד בהצלחה!
                            </Typography>
                          </Alert>
                          
                          <Box sx={{ display: 'flex', gap: 2, mb: 2 }}>
                            <Button
                              variant="contained"
                              endIcon={<Download />}
                              onClick={() => downloadFile('excel')}
                            >
                              הורד קובץ Excel
                            </Button>
                            <Button
                              variant="outlined"
                              endIcon={<Visibility />}
                              onClick={() => setShowResults(true)}
                            >
                              צפה בתוצאות
                            </Button>
                            <Button onClick={resetUpload}>
                              עבד קובץ חדש
                            </Button>
                          </Box>
                          
                          <Button
                            variant="text"
                            onClick={() => navigate('/history')}
                            sx={{ mt: 1 }}
                          >
                            עבר להיסטוריה →
                          </Button>
                        </Box>
                      )}
                    </StepContent>
                  </Step>
                ))}
              </Stepper>
            </CardContent>
          </Card>
        </Grid>

        {/* Progress Summary */}
        <Grid item xs={12} md={4}>
          <Card sx={{ borderRadius: 3, boxShadow: '0 4px 20px rgba(0,0,0,0.08)', position: 'sticky', top: 24 }}>
            <CardContent>
              <Typography variant="h6" gutterBottom fontWeight="bold">
                סיכום תהליך
              </Typography>
              
              <Box sx={{ mt: 3 }}>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 2 }}>
                  <CheckCircle color={activeStep >= 1 ? 'success' : 'disabled'} />
                  <Typography color={activeStep >= 1 ? 'text.primary' : 'text.disabled'}>
                    קובץ נבחר
                  </Typography>
                </Box>
                
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 2 }}>
                  <CheckCircle color={activeStep >= 2 ? 'success' : 'disabled'} />
                  <Typography color={activeStep >= 2 ? 'text.primary' : 'text.disabled'}>
                    הקובץ הועלה
                  </Typography>
                </Box>
                
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 2 }}>
                  <CheckCircle color={activeStep >= 3 ? 'success' : 'disabled'} />
                  <Typography color={activeStep >= 3 ? 'text.primary' : 'text.disabled'}>
                    עיבוד הושלם
                  </Typography>
                </Box>
                
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 2 }}>
                  <CheckCircle color={activeStep >= 4 ? 'success' : 'disabled'} />
                  <Typography color={activeStep >= 4 ? 'text.primary' : 'text.disabled'}>
                    מוכן להורדה
                  </Typography>
                </Box>
              </Box>

              {selectedFile && (
                <Box sx={{ mt: 3, p: 2, backgroundColor: 'grey.50', borderRadius: 2 }}>
                  <Typography variant="subtitle2" gutterBottom>
                    פרטי קובץ נוכחי:
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    שם: {selectedFile.name}
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    גודל: {formatFileSize(selectedFile.size)}
                  </Typography>
                </Box>
              )}
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      {/* Processing Results Dialog */}
      <Dialog
        open={showResults}
        onClose={() => setShowResults(false)}
        maxWidth="md"
        fullWidth
        PaperProps={{
          sx: { borderRadius: 3 }
        }}
      >
        <DialogTitle>
          <Typography variant="h6" fontWeight="bold">
            תוצאות עיבוד הקובץ
          </Typography>
        </DialogTitle>
        <DialogContent>
          {console.log('Dialog processingResult:', processingResult)}
          {processingResult ? (
            <Box>
              <Typography variant="h6" gutterBottom fontWeight="bold">
                סיכום עיבוד
              </Typography>
              <Grid container spacing={2}>
                <Grid item xs={12} md={6}>
                  <Paper sx={{ p: 3, backgroundColor: 'primary.50', borderRadius: 2 }}>
                    <Typography variant="subtitle2" color="text.secondary" gutterBottom>
                      קובץ CSV מקורי
                    </Typography>
                    <Typography variant="h4" color="primary.main" fontWeight="bold">
                      {formatCurrency(processingResult?.csvTotal || processingResult?.csv_total || processingResult?.stats?.csv_total)}
                    </Typography>
                    <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
                      סה"כ שורות: {processingResult?.totalRows || processingResult?.total_rows || processingResult?.stats?.total_rows || 0}
                    </Typography>
                  </Paper>
                </Grid>
                <Grid item xs={12} md={6}>
                  <Paper sx={{ p: 3, backgroundColor: 'secondary.50', borderRadius: 2 }}>
                    <Typography variant="subtitle2" color="text.secondary" gutterBottom>
                      קובץ Excel מעובד
                    </Typography>
                    <Typography variant="h4" color="secondary.main" fontWeight="bold">
                      {formatCurrency(processingResult?.excelTotal || processingResult?.excel_total || processingResult?.stats?.excel_total)}
                    </Typography>
                    <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
                      שורות שעובדו: {processingResult?.rowsProcessed || processingResult?.processed_rows || processingResult?.totalRows || processingResult?.stats?.processed_rows || 0}
                    </Typography>
                  </Paper>
                </Grid>
                <Grid item xs={12}>
                  <Paper sx={{ 
                    p: 3, 
                    borderRadius: 2,
                    backgroundColor: Math.abs(processingResult?.gapAmount || processingResult?.gap_amount || 0) < 10 ? 'success.50' : 'warning.50'
                  }}>
                    <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <Box>
                        <Typography variant="subtitle2" color="text.secondary">
                          פער בין הקבצים
                        </Typography>
                        <Typography 
                          variant="h5" 
                          fontWeight="bold"
                          color={Math.abs(processingResult?.gapAmount || processingResult?.gap_amount || 0) < 10 ? 'success.main' : 'warning.main'}
                        >
                          {formatCurrency(processingResult?.gapAmount || processingResult?.gap_amount || processingResult?.stats?.gap || 0)}
                        </Typography>
                      </Box>
                      <Chip 
                        label={Math.abs(processingResult?.gapAmount || processingResult?.gap_amount || 0) < 10 ? 'תקין' : 'יש פער'}
                        color={Math.abs(processingResult?.gapAmount || processingResult?.gap_amount || 0) < 10 ? 'success' : 'warning'}
                      />
                    </Box>
                  </Paper>
                </Grid>
              </Grid>
              
              <Box sx={{ mt: 3, display: 'flex', gap: 2 }}>
                <Button
                  variant="contained"
                  endIcon={<Download />}
                  onClick={() => {
                    setShowResults(false)
                    downloadFile('excel')
                  }}
                  disabled={!processingResult}
                >
                  הורד Excel
                </Button>
                <Button
                  variant="outlined"
                  endIcon={<Download />}
                  onClick={() => {
                    setShowResults(false)
                    downloadFile('tsv')
                  }}
                  disabled={!processingResult}
                >
                  הורד TSV
                </Button>
              </Box>
            </Box>
          ) : (
            <Alert severity="info">
              אין תוצאות זמינות
            </Alert>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setShowResults(false)}>
            סגור
          </Button>
          <Button variant="contained" endIcon={<Download />}>
            הורד Excel
          </Button>
        </DialogActions>
      </Dialog>

      {/* Loading Backdrop */}
      <Backdrop
        sx={{ color: '#fff', zIndex: (theme) => theme.zIndex.drawer + 1 }}
        open={uploading || processing}
      >
        <Box sx={{ textAlign: 'center' }}>
          <CircularProgress color="inherit" size={60} sx={{ mb: 2 }} />
          <Typography variant="h6">
            {uploading ? 'מעלה קובץ...' : 'מעבד נתונים...'}
          </Typography>
          <Typography variant="body2" sx={{ opacity: 0.8 }}>
            אנא המתן, התהליך עלול לקחת מספר דקות
          </Typography>
        </Box>
      </Backdrop>
    </Box>
  )
}

export default Upload