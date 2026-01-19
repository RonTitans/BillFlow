import React, { useState, useEffect } from 'react'
import {
  Box,
  Grid,
  Card,
  CardContent,
  Typography,
  CircularProgress,
  LinearProgress,
  Alert,
  Chip,
  Paper
} from '@mui/material'
import {
  TrendingUp,
  Description,
  CheckCircle,
  Error,
  Schedule,
  ElectricBolt,
  Assessment
} from '@mui/icons-material'
import axios from 'axios'

function Dashboard() {
  const [stats, setStats] = useState(null)
  const [recentFiles, setRecentFiles] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    fetchDashboardData()
  }, [])

  const fetchDashboardData = async () => {
    try {
      const [statsResponse, filesResponse] = await Promise.all([
        axios.get('/api/dashboard/stats'),
        axios.get('/api/files?limit=5')
      ])

      // API returns { success, data: { stats, recentFiles } }
      setStats(statsResponse.data.data?.stats || statsResponse.data.stats || statsResponse.data)
      setRecentFiles(statsResponse.data.data?.recentFiles || filesResponse.data.slice(0, 5))
    } catch (error) {
      setError('שגיאה בטעינת נתוני הדשבורד')
      console.error('Dashboard error:', error)
    } finally {
      setLoading(false)
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

  const getStatusColor = (status) => {
    switch (status) {
      case 'completed':
        return 'success'
      case 'processing':
        return 'warning'
      case 'error':
        return 'error'
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

  if (loading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', mt: 8 }}>
        <CircularProgress size={60} />
      </Box>
    )
  }

  if (error) {
    return (
      <Alert severity="error" sx={{ mt: 2 }}>
        {error}
      </Alert>
    )
  }

  return (
    <Box>
      <Box sx={{ mb: 4 }}>
        <Typography variant="h4" component="h1" gutterBottom fontWeight="bold">
          דשבורד מערכת ניהול חשבונות
        </Typography>
        <Typography variant="subtitle1" color="text.secondary">
          סקירה כללית של פעילות העיבוד והקבצים
        </Typography>
      </Box>

      {/* Statistics Cards */}
      <Grid container spacing={3} sx={{ mb: 4 }}>
        <Grid item xs={12} sm={6} md={3}>
          <Card
            sx={{
              background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
              color: 'white',
              borderRadius: 3,
              '&:hover': {
                transform: 'translateY(-4px)',
                transition: 'transform 0.3s ease'
              }
            }}
          >
            <CardContent>
              <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <Box>
                  <Typography variant="h4" component="div" fontWeight="bold">
                    {stats?.total_files || stats?.totalFiles || 0}
                  </Typography>
                  <Typography variant="body2" sx={{ opacity: 0.8 }}>
                    סה"כ קבצים
                  </Typography>
                </Box>
                <Description sx={{ fontSize: 40, opacity: 0.8 }} />
              </Box>
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} sm={6} md={3}>
          <Card
            sx={{
              background: 'linear-gradient(135deg, #f093fb 0%, #f5576c 100%)',
              color: 'white',
              borderRadius: 3,
              '&:hover': {
                transform: 'translateY(-4px)',
                transition: 'transform 0.3s ease'
              }
            }}
          >
            <CardContent>
              <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <Box>
                  <Typography variant="h4" component="div" fontWeight="bold">
                    {stats?.completed_files || stats?.filesByStatus?.completed || 0}
                  </Typography>
                  <Typography variant="body2" sx={{ opacity: 0.8 }}>
                    קבצים שעובדו
                  </Typography>
                </Box>
                <CheckCircle sx={{ fontSize: 40, opacity: 0.8 }} />
              </Box>
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} sm={6} md={3}>
          <Card
            sx={{
              background: 'linear-gradient(135deg, #4facfe 0%, #00f2fe 100%)',
              color: 'white',
              borderRadius: 3,
              '&:hover': {
                transform: 'translateY(-4px)',
                transition: 'transform 0.3s ease'
              }
            }}
          >
            <CardContent>
              <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <Box>
                  <Typography variant="h4" component="div" fontWeight="bold">
                    {stats?.error_files || stats?.filesByStatus?.error || 0}
                  </Typography>
                  <Typography variant="body2" sx={{ opacity: 0.8 }}>
                    שגיאות
                  </Typography>
                </Box>
                <Schedule sx={{ fontSize: 40, opacity: 0.8 }} />
              </Box>
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} sm={6} md={3}>
          <Card
            sx={{
              background: 'linear-gradient(135deg, #43e97b 0%, #38f9d7 100%)',
              color: 'white',
              borderRadius: 3,
              '&:hover': {
                transform: 'translateY(-4px)',
                transition: 'transform 0.3s ease'
              }
            }}
          >
            <CardContent>
              <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <Box>
                  <Typography variant="h4" component="div" fontWeight="bold">
                    {formatCurrency(stats?.total_amount || stats?.totalAmount).replace('₪', '')}
                  </Typography>
                  <Typography variant="body2" sx={{ opacity: 0.8 }}>
                    סה"כ סכום ₪
                  </Typography>
                </Box>
                <TrendingUp sx={{ fontSize: 40, opacity: 0.8 }} />
              </Box>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      {/* Recent Files */}
      <Grid container spacing={3}>
        <Grid item xs={12} lg={8}>
          <Card sx={{ borderRadius: 3, boxShadow: '0 4px 20px rgba(0,0,0,0.08)' }}>
            <CardContent>
              <Box sx={{ display: 'flex', alignItems: 'center', mb: 3 }}>
                <Assessment sx={{ mr: 1, color: 'primary.main' }} />
                <Typography variant="h6" component="h2" fontWeight="bold">
                  קבצים אחרונים
                </Typography>
              </Box>

              {recentFiles.length === 0 ? (
                <Box sx={{ textAlign: 'center', py: 4 }}>
                  <ElectricBolt sx={{ fontSize: 60, color: 'text.disabled', mb: 2 }} />
                  <Typography color="text.secondary">
                    לא נמצאו קבצים
                  </Typography>
                </Box>
              ) : (
                <Box>
                  {recentFiles.map((file) => (
                    <Paper
                      key={file.id}
                      sx={{
                        p: 3,
                        mb: 2,
                        borderRadius: 2,
                        border: '1px solid',
                        borderColor: 'divider',
                        '&:hover': {
                          backgroundColor: 'action.hover',
                          transition: 'background-color 0.3s ease'
                        }
                      }}
                    >
                      <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 2 }}>
                        <Typography variant="h6" component="h3" fontWeight="bold">
                          {file.original_filename}
                        </Typography>
                        <Chip
                          label={getStatusText(file.processing_status)}
                          color={getStatusColor(file.processing_status)}
                          size="small"
                        />
                      </Box>

                      <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 2 }}>
                        <Typography variant="body2" color="text.secondary">
                          הועלה: {formatDate(file.upload_time)}
                        </Typography>
                        {file.processed_time && (
                          <Typography variant="body2" color="text.secondary">
                            עובד: {formatDate(file.processed_time)}
                          </Typography>
                        )}
                      </Box>

                      {file.processing_status === 'completed' && file.csv_total && (
                        <Box>
                          <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
                            <Typography variant="body2">
                              סה"כ CSV: {formatCurrency(file.csv_total)}
                            </Typography>
                            <Typography variant="body2">
                              סה"כ Excel: {formatCurrency(file.excel_total)}
                            </Typography>
                          </Box>
                          
                          {file.gap_amount !== null && (
                            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                              <Typography variant="body2" color="text.secondary">
                                פער:
                              </Typography>
                              <Typography
                                variant="body2"
                                color={Math.abs(file.gap_amount) < 10 ? 'success.main' : 'warning.main'}
                                fontWeight="bold"
                              >
                                {formatCurrency(file.gap_amount)}
                              </Typography>
                            </Box>
                          )}
                        </Box>
                      )}

                      {file.processing_status === 'processing' && (
                        <LinearProgress sx={{ mt: 1, borderRadius: 1 }} />
                      )}
                    </Paper>
                  ))}
                </Box>
              )}
            </CardContent>
          </Card>
        </Grid>

        {/* Quick Stats Summary */}
        <Grid item xs={12} lg={4}>
          <Card sx={{ borderRadius: 3, boxShadow: '0 4px 20px rgba(0,0,0,0.08)', mb: 3 }}>
            <CardContent>
              <Typography variant="h6" component="h2" gutterBottom fontWeight="bold">
                סטטיסטיקות מהירות
              </Typography>
              
              <Box sx={{ mt: 3 }}>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 2 }}>
                  <Typography variant="body2" color="text.secondary">
                    קבצים שהושלמו
                  </Typography>
                  <Typography variant="body2" fontWeight="bold" color="success.main">
                    {stats?.completed_files || stats?.filesByStatus?.completed || 0}
                  </Typography>
                </Box>

                <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 2 }}>
                  <Typography variant="body2" color="text.secondary">
                    התאמות מושלמות
                  </Typography>
                  <Typography variant="body2" fontWeight="bold" color="warning.main">
                    {stats?.perfect_matches || stats?.filesByStatus?.processing || 0}
                  </Typography>
                </Box>

                <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 2 }}>
                  <Typography variant="body2" color="text.secondary">
                    שגיאות
                  </Typography>
                  <Typography variant="body2" fontWeight="bold" color="error.main">
                    {stats?.error_files || stats?.filesByStatus?.error || 0}
                  </Typography>
                </Box>
              </Box>
            </CardContent>
          </Card>

          <Card sx={{ borderRadius: 3, boxShadow: '0 4px 20px rgba(0,0,0,0.08)' }}>
            <CardContent sx={{ textAlign: 'center' }}>
              <ElectricBolt sx={{ fontSize: 60, color: 'primary.main', mb: 2 }} />
              <Typography variant="h6" gutterBottom>
                מערכת חשבונות חשמל
              </Typography>
              <Typography variant="body2" color="text.secondary">
                עיריית ראשון לציון
              </Typography>
              <Typography variant="caption" display="block" sx={{ mt: 2 }}>
                גרסה 1.0.0
              </Typography>
            </CardContent>
          </Card>
        </Grid>
      </Grid>
    </Box>
  )
}

export default Dashboard