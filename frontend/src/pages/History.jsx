import React, { useState, useEffect } from 'react'
import {
  Box,
  Card,
  CardContent,
  Typography,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  TablePagination,
  Chip,
  IconButton,
  TextField,
  InputAdornment,
  Alert,
  CircularProgress,
  Paper,
  Tooltip,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  Grid,
  Collapse,
  Divider
} from '@mui/material'
import {
  Search,
  Download,
  Visibility,
  Delete,
  CheckCircle,
  Error,
  Schedule,
  CloudUpload,
  Assessment,
  KeyboardArrowDown,
  KeyboardArrowUp,
  Description,
  TableChart,
  GetApp,
  FilterList,
  CalendarMonth
} from '@mui/icons-material'
import axios from 'axios'

function History() {
  const [files, setFiles] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [page, setPage] = useState(0)
  const [rowsPerPage, setRowsPerPage] = useState(10)
  const [searchTerm, setSearchTerm] = useState('')
  const [selectedFile, setSelectedFile] = useState(null)
  const [detailsOpen, setDetailsOpen] = useState(false)
  const [expandedRows, setExpandedRows] = useState(new Set())
  const [selectedYear, setSelectedYear] = useState('all')

  useEffect(() => {
    fetchFiles()
  }, [])

  // Extract unique years from files for the filter
  const availableYears = React.useMemo(() => {
    const years = new Set()
    files.forEach(file => {
      if (file.billing_period) {
        const year = file.billing_period.split('-')[0]
        if (year) years.add(year)
      }
    })
    return Array.from(years).sort((a, b) => b - a) // Sort descending (newest first)
  }, [files])

  const fetchFiles = async () => {
    try {
      const response = await axios.get('/api/files')
      const filesData = response.data.data || response.data || []
      setFiles(Array.isArray(filesData) ? filesData : [])
    } catch (error) {
      setError('שגיאה בטעינת היסטוריית הקבצים')
      console.error('Files fetch error:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleChangePage = (event, newPage) => {
    setPage(newPage)
  }

  const handleChangeRowsPerPage = (event) => {
    setRowsPerPage(parseInt(event.target.value, 10))
    setPage(0)
  }

  const handleViewDetails = (file) => {
    setSelectedFile(file)
    setDetailsOpen(true)
  }

  const handleDeleteFile = async (fileId) => {
    if (window.confirm('האם אתה בטוח שברצונך למחוק קובץ זה?')) {
      try {
        await axios.delete(`/api/files/${fileId}`)
        setFiles(files.filter(f => f.id !== fileId))
      } catch (error) {
        setError('שגיאה במחיקת הקובץ')
      }
    }
  }

  const handleDownloadExcel = async (file) => {
    try {
      // Check if file has been processed
      if (!file.excel_path) {
        setError('קובץ Excel עדיין לא זמין. יש לעבד את הקובץ תחילה')
        return
      }
      
      const response = await axios.get('/api/download/excel', {
        params: { fileId: file.id },
        responseType: 'blob'
      })
      const url = window.URL.createObjectURL(new Blob([response.data]))
      const link = document.createElement('a')
      link.href = url
      link.setAttribute('download', file.processed_filename || file.original_filename.replace('.csv', '.xlsx'))
      document.body.appendChild(link)
      link.click()
      link.remove()
    } catch (error) {
      if (error.response?.status === 404) {
        setError('קובץ Excel לא נמצא. נסה לעבד את הקובץ שוב')
      } else {
        setError('שגיאה בהורדת הקובץ')
      }
    }
  }

  const handleDownloadTSV = async (file) => {
    try {
      // Check if file has been processed
      if (!file.tsv_path) {
        setError('קובץ TSV עדיין לא זמין. יש לעבד את הקובץ תחילה')
        return
      }
      
      const response = await axios.get('/api/download/tsv', {
        params: { fileId: file.id },
        responseType: 'blob'
      })
      
      // Extract filename from Content-Disposition header
      const contentDisposition = response.headers['content-disposition']
      let downloadFilename = file.tsv_filename || file.original_filename.replace('.csv', '.txt') // fallback
      
      if (contentDisposition) {
        // Parse filename from header
        const filenameMatch = contentDisposition.match(/filename\*=UTF-8''(.+)/)
        if (filenameMatch) {
          downloadFilename = decodeURIComponent(filenameMatch[1])
        } else {
          // Try simple filename format
          const simpleMatch = contentDisposition.match(/filename="?(.+?)"?(?:;|$)/)
          if (simpleMatch) {
            downloadFilename = simpleMatch[1]
          }
        }
      }
      
      const url = window.URL.createObjectURL(new Blob([response.data]))
      const link = document.createElement('a')
      link.href = url
      link.setAttribute('download', downloadFilename)
      document.body.appendChild(link)
      link.click()
      link.remove()
    } catch (error) {
      if (error.response?.status === 404) {
        setError('קובץ TSV לא נמצא. נסה לעבד את הקובץ שוב')
      } else {
        setError('שגיאה בהורדת הקובץ כ-TSV')
      }
    }
  }

  const toggleRowExpansion = (fileId) => {
    const newExpanded = new Set(expandedRows)
    if (newExpanded.has(fileId)) {
      newExpanded.delete(fileId)
    } else {
      newExpanded.add(fileId)
    }
    setExpandedRows(newExpanded)
  }

  const getStatusColor = (status) => {
    switch (status) {
      case 'completed':
        return 'success'
      case 'processing':
        return 'warning'
      case 'error':
        return 'error'
      case 'uploaded':
        return 'info'
      default:
        return 'default'
    }
  }

  const getStatusText = (status) => {
    switch (status) {
      case 'completed':
        return 'הושלם'
      case 'processing':
        return 'בעיבוד'
      case 'error':
        return 'שגיאה'
      case 'uploaded':
        return 'הועלה'
      default:
        return 'לא ידוע'
    }
  }

  const getStatusIcon = (status) => {
    switch (status) {
      case 'completed':
        return <CheckCircle />
      case 'processing':
        return <Schedule />
      case 'error':
        return <Error />
      case 'uploaded':
        return <CloudUpload />
      default:
        return null
    }
  }

  const formatCurrency = (amount) => {
    if (!amount) return '₪0.00'
    return new Intl.NumberFormat('he-IL', {
      style: 'currency',
      currency: 'ILS'
    }).format(amount)
  }

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString('he-IL', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    })
  }

  const formatFileSize = (bytes) => {
    if (bytes === 0) return '0 Bytes'
    const k = 1024
    const sizes = ['Bytes', 'KB', 'MB', 'GB']
    const i = Math.floor(Math.log(bytes) / Math.log(k))
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i]
  }

  const filteredFiles = files.filter(file => {
    // Year filter
    if (selectedYear !== 'all') {
      const fileYear = file.billing_period?.split('-')[0]
      if (fileYear !== selectedYear) return false
    }
    // Search filter
    const searchLower = searchTerm.toLowerCase()
    return (
      file.original_filename?.toLowerCase().includes(searchLower) ||
      file.standardized_name?.toLowerCase().includes(searchLower) ||
      file.username?.toLowerCase().includes(searchLower) ||
      file.billing_period?.includes(searchTerm)
    )
  })

  const paginatedFiles = filteredFiles.slice(
    page * rowsPerPage,
    page * rowsPerPage + rowsPerPage
  )

  if (loading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', mt: 8 }}>
        <CircularProgress size={60} />
      </Box>
    )
  }

  return (
    <Box sx={{ width: '100%' }}>
      <Box sx={{ mb: 4 }}>
        <Typography variant="h4" component="h1" gutterBottom fontWeight="bold">
          היסטוריה
        </Typography>
        <Typography variant="subtitle1" color="text.secondary">
          רשימה מלאה של כל הקבצים שהועלו ועובדו במערכת
        </Typography>
      </Box>

      {error && (
        <Alert severity="error" sx={{ mb: 3, borderRadius: 2 }} onClose={() => setError('')}>
          {error}
        </Alert>
      )}

      <Card sx={{ borderRadius: 3, boxShadow: '0 4px 20px rgba(0,0,0,0.08)' }}>
        <CardContent>
          <Box sx={{ mb: 3, display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 2 }}>
            {/* Year Filter */}
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              <CalendarMonth sx={{ color: 'text.secondary' }} />
              <Typography variant="body2" color="text.secondary" sx={{ mr: 1 }}>
                סינון לפי שנה:
              </Typography>
              <Box sx={{ display: 'flex', gap: 0.5 }}>
                <Chip
                  label="הכל"
                  size="small"
                  variant={selectedYear === 'all' ? 'filled' : 'outlined'}
                  color={selectedYear === 'all' ? 'primary' : 'default'}
                  onClick={() => { setSelectedYear('all'); setPage(0) }}
                  sx={{ cursor: 'pointer' }}
                />
                {availableYears.map(year => (
                  <Chip
                    key={year}
                    label={year}
                    size="small"
                    variant={selectedYear === year ? 'filled' : 'outlined'}
                    color={selectedYear === year ? 'primary' : 'default'}
                    onClick={() => { setSelectedYear(year); setPage(0) }}
                    sx={{ cursor: 'pointer' }}
                  />
                ))}
              </Box>
            </Box>

            {/* Search Field */}
            <TextField
              placeholder="חיפוש קבצים..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              size="small"
              sx={{ minWidth: 300 }}
              InputProps={{
                startAdornment: (
                  <InputAdornment position="start">
                    <Search />
                  </InputAdornment>
                ),
              }}
            />
          </Box>

          {filteredFiles.length === 0 ? (
            <Box sx={{ textAlign: 'center', py: 8 }}>
              <Assessment sx={{ fontSize: 80, color: 'text.disabled', mb: 2 }} />
              <Typography variant="h6" color="text.secondary" gutterBottom>
                {searchTerm ? 'לא נמצאו קבצים מתאימים לחיפוש' : 'עדיין לא הועלו קבצים'}
              </Typography>
              <Typography variant="body2" color="text.secondary">
                {searchTerm ? 'נסה לשנות את מילות החיפוש' : 'התחל בהעלאת קובץ CSV חדש'}
              </Typography>
            </Box>
          ) : (
            <>
              <TableContainer>
                <Table>
                  <TableHead>
                    <TableRow>
                      <TableCell />
                      <TableCell><strong>שם קובץ</strong></TableCell>
                      <TableCell><strong>סטטוס</strong></TableCell>
                      <TableCell><strong>תאריך העלאה</strong></TableCell>
                      <TableCell><strong>גודל</strong></TableCell>
                      <TableCell><strong>סה"כ CSV</strong></TableCell>
                      <TableCell><strong>פער</strong></TableCell>
                      <TableCell><strong>משתמש</strong></TableCell>
                      <TableCell><strong>פעולות</strong></TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {paginatedFiles.map((file) => (
                      <React.Fragment key={file.id}>
                        <TableRow
                          sx={{
                            '&:hover': {
                              backgroundColor: 'action.hover',
                            },
                            cursor: 'pointer'
                          }}
                          onClick={() => toggleRowExpansion(file.id)}
                        >
                          <TableCell>
                            <IconButton
                              size="small"
                              onClick={(e) => {
                                e.stopPropagation()
                                toggleRowExpansion(file.id)
                              }}
                            >
                              {expandedRows.has(file.id) ? <KeyboardArrowUp /> : <KeyboardArrowDown />}
                            </IconButton>
                          </TableCell>
                          <TableCell>
                            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                              {getStatusIcon(file.processing_status)}
                              <Typography variant="body2" fontWeight="medium">
                                {file.standardized_name || file.original_filename}
                              </Typography>
                            </Box>
                          </TableCell>
                        
                        <TableCell>
                          <Chip
                            label={getStatusText(file.processing_status)}
                            color={getStatusColor(file.processing_status)}
                            size="small"
                          />
                        </TableCell>
                        
                        <TableCell>
                          <Typography variant="body2">
                            {formatDate(file.upload_time)}
                          </Typography>
                        </TableCell>
                        
                        <TableCell>
                          <Typography variant="body2">
                            {formatFileSize(file.file_size)}
                          </Typography>
                        </TableCell>
                        
                        <TableCell>
                          <Typography variant="body2" fontWeight="medium">
                            {file.csv_total ? formatCurrency(file.csv_total) : '-'}
                          </Typography>
                        </TableCell>
                        
                        <TableCell>
                          {file.gap_amount !== null ? (
                            <Typography
                              variant="body2"
                              fontWeight="bold"
                              color={Math.abs(file.gap_amount) < 10 ? 'success.main' : 'warning.main'}
                            >
                              {formatCurrency(file.gap_amount)}
                            </Typography>
                          ) : (
                            '-'
                          )}
                        </TableCell>
                        
                        <TableCell>
                          <Typography variant="body2">
                            {file.username || 'לא ידוע'}
                          </Typography>
                        </TableCell>
                        
                        <TableCell>
                          <Box sx={{ display: 'flex', gap: 1 }}>
                            <Tooltip title="צפה בפרטים">
                              <IconButton
                                size="small"
                                onClick={(e) => {
                                  e.stopPropagation()
                                  handleViewDetails(file)
                                }}
                              >
                                <Visibility />
                              </IconButton>
                            </Tooltip>
                            
                            {file.processing_status === 'completed' ? (
                              <Tooltip title={!file.excel_path ? 'קובץ Excel עדיין לא זמין' : 'הורד קובץ Excel'}>
                                <span>
                                  <IconButton 
                                    size="small" 
                                    color="primary"
                                    onClick={(e) => {
                                      e.stopPropagation()
                                      handleDownloadExcel(file)
                                    }}
                                    disabled={!file.excel_path}
                                  >
                                    <Download />
                                  </IconButton>
                                </span>
                              </Tooltip>
                            ) : (
                              <Tooltip title="הקובץ עדיין בעיבוד">
                                <span>
                                  <IconButton 
                                    size="small" 
                                    disabled
                                  >
                                    <Download />
                                  </IconButton>
                                </span>
                              </Tooltip>
                            )}
                            
                            <Tooltip title="מחק קובץ">
                              <IconButton
                                size="small"
                                color="error"
                                onClick={(e) => {
                                  e.stopPropagation()
                                  handleDeleteFile(file.id)
                                }}
                              >
                                <Delete />
                              </IconButton>
                            </Tooltip>
                          </Box>
                        </TableCell>
                      </TableRow>
                      
                      {/* Expanded Row Content */}
                      <TableRow>
                        <TableCell style={{ paddingBottom: 0, paddingTop: 0 }} colSpan={9}>
                          <Collapse in={expandedRows.has(file.id)} timeout="auto" unmountOnExit>
                            <Box sx={{ margin: 2 }}>
                              <Grid container spacing={3}>
                                {/* CSV Summary - Right Side */}
                                <Grid item xs={12} md={6}>
                                  <Paper sx={{ p: 2, backgroundColor: '#f5f5f5', borderRadius: 2 }}>
                                    <Typography variant="h6" gutterBottom sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                                      <Description color="primary" />
                                      סיכום CSV מקורי
                                    </Typography>
                                    <Divider sx={{ mb: 2 }} />
                                    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
                                      <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                                        <Typography variant="body2">סה"כ כספי:</Typography>
                                        <Typography variant="body2" fontWeight="bold">
                                          {file.csv_total ? formatCurrency(file.csv_total) : '-'}
                                        </Typography>
                                      </Box>
                                      <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                                        <Typography variant="body2">שורות:</Typography>
                                        <Typography variant="body2" fontWeight="bold">
                                          {file.total_rows || '-'}
                                        </Typography>
                                      </Box>
                                      <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                                        <Typography variant="body2">תאריך העלאה:</Typography>
                                        <Typography variant="body2" fontWeight="bold">
                                          {formatDate(file.upload_time)}
                                        </Typography>
                                      </Box>
                                    </Box>
                                  </Paper>
                                </Grid>
                                
                                {/* Excel Summary - Left Side */}
                                <Grid item xs={12} md={6}>
                                  <Paper sx={{ p: 2, backgroundColor: '#e8f5e9', borderRadius: 2 }}>
                                    <Typography variant="h6" gutterBottom sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                                      <TableChart color="success" />
                                      סיכום Excel מומר
                                    </Typography>
                                    <Divider sx={{ mb: 2 }} />
                                    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
                                      <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                                        <Typography variant="body2">סה"כ כספי:</Typography>
                                        <Typography variant="body2" fontWeight="bold">
                                          {file.excel_total ? formatCurrency(file.excel_total) : '-'}
                                        </Typography>
                                      </Box>
                                      <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                                        <Typography variant="body2">פער:</Typography>
                                        <Typography 
                                          variant="body2" 
                                          fontWeight="bold"
                                          color={file.gap_amount && Math.abs(file.gap_amount) < 10 ? 'success.main' : 'warning.main'}
                                        >
                                          {file.gap_amount !== null ? formatCurrency(file.gap_amount) : '-'}
                                        </Typography>
                                      </Box>
                                      <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                                        <Typography variant="body2">סטטוס:</Typography>
                                        <Chip 
                                          label={getStatusText(file.processing_status)} 
                                          color={getStatusColor(file.processing_status)}
                                          size="small"
                                        />
                                      </Box>
                                    </Box>
                                    
                                    {/* Action Buttons */}
                                    <Box sx={{ mt: 2, display: 'flex', gap: 1 }}>
                                      <Button
                                        size="small"
                                        variant="outlined"
                                        startIcon={<Visibility />}
                                        onClick={() => handleViewDetails(file)}
                                      >
                                        צפה
                                      </Button>
                                      <Tooltip title={!file.excel_path && file.processing_status === 'completed' ? 'קובץ Excel עדיין לא זמין' : ''}>
                                        <span>
                                          <Button
                                            size="small"
                                            variant="contained"
                                            startIcon={<GetApp />}
                                            onClick={() => handleDownloadExcel(file)}
                                            disabled={!file.excel_path || file.processing_status !== 'completed'}
                                          >
                                            הורד Excel
                                          </Button>
                                        </span>
                                      </Tooltip>
                                      <Tooltip title={!file.tsv_path && file.processing_status === 'completed' ? 'קובץ TSV עדיין לא זמין' : ''}>
                                        <span>
                                          <Button
                                            size="small"
                                            variant="contained"
                                            color="secondary"
                                            startIcon={<GetApp />}
                                            onClick={() => handleDownloadTSV(file)}
                                            disabled={!file.tsv_path || file.processing_status !== 'completed'}
                                          >
                                            הורד TSV
                                          </Button>
                                        </span>
                                      </Tooltip>
                                      <Button
                                        size="small"
                                        variant="outlined"
                                        color="error"
                                        startIcon={<Delete />}
                                        onClick={() => handleDeleteFile(file.id)}
                                      >
                                        מחק
                                      </Button>
                                    </Box>
                                  </Paper>
                                </Grid>
                              </Grid>
                            </Box>
                          </Collapse>
                        </TableCell>
                      </TableRow>
                    </React.Fragment>
                    ))}
                  </TableBody>
                </Table>
              </TableContainer>

              <TablePagination
                rowsPerPageOptions={[5, 10, 25, 50]}
                component="div"
                count={filteredFiles.length}
                rowsPerPage={rowsPerPage}
                page={page}
                onPageChange={handleChangePage}
                onRowsPerPageChange={handleChangeRowsPerPage}
                labelRowsPerPage="שורות בעמוד:"
                labelDisplayedRows={({ from, to, count }) => `${from}-${to} מתוך ${count}`}
              />
            </>
          )}
        </CardContent>
      </Card>

      {/* File Details Dialog */}
      <Dialog
        open={detailsOpen}
        onClose={() => setDetailsOpen(false)}
        maxWidth="md"
        fullWidth
        PaperProps={{
          sx: { borderRadius: 3 }
        }}
      >
        <DialogTitle>
          <Typography variant="h6" fontWeight="bold">
            פרטי קובץ
          </Typography>
        </DialogTitle>
        
        <DialogContent>
          {selectedFile && (
            <Grid container spacing={3}>
              <Grid item xs={12}>
                <Paper sx={{ p: 2, borderRadius: 2, backgroundColor: 'grey.50' }}>
                  <Typography variant="subtitle2" gutterBottom>
                    מידע כללי
                  </Typography>
                  <Typography variant="body2" sx={{ mb: 1 }}>
                    <strong>שם קובץ:</strong> {selectedFile.original_filename}
                  </Typography>
                  <Typography variant="body2" sx={{ mb: 1 }}>
                    <strong>גודל:</strong> {formatFileSize(selectedFile.file_size)}
                  </Typography>
                  <Typography variant="body2" sx={{ mb: 1 }}>
                    <strong>סטטוס:</strong> {getStatusText(selectedFile.processing_status)}
                  </Typography>
                  <Typography variant="body2" sx={{ mb: 1 }}>
                    <strong>משתמש:</strong> {selectedFile.username || 'לא ידוע'}
                  </Typography>
                  <Typography variant="body2">
                    <strong>תאריך העלאה:</strong> {formatDate(selectedFile.upload_time)}
                  </Typography>
                  {selectedFile.processed_time && (
                    <Typography variant="body2">
                      <strong>תאריך עיבוד:</strong> {formatDate(selectedFile.processed_time)}
                    </Typography>
                  )}
                </Paper>
              </Grid>

              {selectedFile.processing_status === 'completed' && (
                <>
                  <Grid item xs={12} sm={6}>
                    <Paper sx={{ p: 2, textAlign: 'center', borderRadius: 2 }}>
                      <Typography variant="h4" color="primary.main" fontWeight="bold">
                        {formatCurrency(selectedFile.csv_total)}
                      </Typography>
                      <Typography variant="body2" color="text.secondary">
                        סה"כ CSV
                      </Typography>
                    </Paper>
                  </Grid>
                  
                  <Grid item xs={12} sm={6}>
                    <Paper sx={{ p: 2, textAlign: 'center', borderRadius: 2 }}>
                      <Typography variant="h4" color="secondary.main" fontWeight="bold">
                        {formatCurrency(selectedFile.excel_total)}
                      </Typography>
                      <Typography variant="body2" color="text.secondary">
                        סה"כ Excel
                      </Typography>
                    </Paper>
                  </Grid>
                  
                  <Grid item xs={12} sm={6}>
                    <Paper sx={{ p: 2, textAlign: 'center', borderRadius: 2 }}>
                      <Typography
                        variant="h4"
                        color={Math.abs(selectedFile.gap_amount || 0) < 10 ? 'success.main' : 'warning.main'}
                        fontWeight="bold"
                      >
                        {formatCurrency(selectedFile.gap_amount)}
                      </Typography>
                      <Typography variant="body2" color="text.secondary">
                        פער
                      </Typography>
                    </Paper>
                  </Grid>
                  
                  <Grid item xs={12} sm={6}>
                    <Paper sx={{ p: 2, textAlign: 'center', borderRadius: 2 }}>
                      <Typography variant="h4" color="info.main" fontWeight="bold">
                        {selectedFile.total_rows?.toLocaleString() || '-'}
                      </Typography>
                      <Typography variant="body2" color="text.secondary">
                        שורות
                      </Typography>
                    </Paper>
                  </Grid>
                </>
              )}
            </Grid>
          )}
        </DialogContent>
        
        <DialogActions>
          <Button onClick={() => setDetailsOpen(false)}>
            סגור
          </Button>
          {selectedFile?.processing_status === 'completed' && (
            <Button variant="contained" endIcon={<Download />}>
              הורד Excel
            </Button>
          )}
        </DialogActions>
      </Dialog>
    </Box>
  )
}

export default History