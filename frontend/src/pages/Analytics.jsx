import React, { useState, useEffect } from 'react'
import {
  Box,
  Card,
  CardContent,
  Typography,
  Grid,
  Paper,
  CircularProgress,
  Alert,
  Tabs,
  Tab,
  Chip,
  LinearProgress,
  Divider,
  Select,
  MenuItem,
  FormControl,
  InputLabel,
  useTheme
} from '@mui/material'
import {
  TrendingUp,
  TrendingDown,
  ElectricBolt,
  AttachMoney,
  Analytics as AnalyticsIcon,
  Assessment,
  ShowChart,
  BarChart,
  Timeline,
  Speed,
  Warning,
  CheckCircle
} from '@mui/icons-material'
import {
  LineChart,
  Line,
  BarChart as RechartsBarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  Area,
  AreaChart
} from 'recharts'
import axios from 'axios'

function Analytics() {
  const theme = useTheme()
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [activeTab, setActiveTab] = useState(0)
  const [analyticsData, setAnalyticsData] = useState(null)
  const [selectedYear, setSelectedYear] = useState(2025)
  const [availableYears, setAvailableYears] = useState([2025])

  useEffect(() => {
    fetchAnalyticsData()
  }, [selectedYear])

  const fetchAnalyticsData = async () => {
    try {
      const response = await axios.get(`/api/analytics/consumption?year=${selectedYear}`)
      const data = response.data.data || response.data
      setAnalyticsData(data)
      if (data.availableYears) {
        setAvailableYears(data.availableYears)
      }
    } catch (error) {
      setError('שגיאה בטעינת נתוני אנליטיקס')
      console.error('Analytics error:', error)
    } finally {
      setLoading(false)
    }
  }

  const getMonthName = (month) => {
    const months = [
      'ינואר', 'פברואר', 'מרץ', 'אפריל', 'מאי', 'יוני',
      'יולי', 'אוגוסט', 'ספטמבר', 'אוקטובר', 'נובמבר', 'דצמבר'
    ]
    return months[month - 1] || ''
  }

  const formatCurrency = (amount) => {
    if (!amount) return '₪0'
    return new Intl.NumberFormat('he-IL', {
      style: 'currency',
      currency: 'ILS',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    }).format(amount)
  }

  const formatNumber = (num) => {
    if (!num) return '0'
    return new Intl.NumberFormat('he-IL').format(num)
  }

  // Process monthly data from backend
  const monthlyData = analyticsData?.monthly?.map(item => ({
    month: getMonthName(item.billing_month),
    monthNum: item.billing_month,
    cost: parseFloat(item.total_csv || 0),
    verified: parseFloat(item.total_excel || 0),
    gap: parseFloat(item.total_gap || 0),
    fileCount: parseInt(item.file_count || 0)
  })) || []

  // Calculate totals
  const totalCost = analyticsData?.overall?.total_cost || 0
  const totalGap = analyticsData?.overall?.total_gap || 0
  const avgGapPercent = analyticsData?.overall?.avg_gap_percentage || 0
  const accuracy = 100 - parseFloat(avgGapPercent)

  const consumptionBreakdown = [
    { name: 'שעות שיא', value: 65, color: '#ff6b6b' },
    { name: 'שעות רגילות', value: 35, color: '#4ecdc4' }
  ]

  const topConsumers = [
    { name: 'בניין העירייה הראשי', consumption: 25000, cost: 450000 },
    { name: 'מרכז ספורט עירוני', consumption: 18000, cost: 320000 },
    { name: 'בית ספר אלון', consumption: 15000, cost: 270000 },
    { name: 'ספרייה עירונית', consumption: 12000, cost: 215000 },
    { name: 'מרכז קהילתי רמז', consumption: 10000, cost: 180000 }
  ]

  if (loading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '60vh' }}>
        <CircularProgress />
      </Box>
    )
  }

  return (
    <Box>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Typography variant="h4" fontWeight="bold">
          <AnalyticsIcon sx={{ mr: 1, verticalAlign: 'middle' }} />
          ניתוח צריכת חשמל עירונית
        </Typography>
        <FormControl sx={{ minWidth: 120 }}>
          <InputLabel>שנה</InputLabel>
          <Select
            value={selectedYear}
            onChange={(e) => setSelectedYear(e.target.value)}
            label="שנה"
            size="small"
          >
            {availableYears.map(year => (
              <MenuItem key={year} value={year}>{year}</MenuItem>
            ))}
          </Select>
        </FormControl>
      </Box>

      {/* Summary Cards */}
      <Grid container spacing={3} sx={{ mb: 4 }}>
        <Grid item xs={12} md={3}>
          <Card sx={{ 
            background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
            color: 'white'
          }}>
            <CardContent>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <Box>
                  <Typography variant="body2" sx={{ opacity: 0.9 }}>
                    סה"כ עלות החודש
                  </Typography>
                  <Typography variant="h4" fontWeight="bold">
                    {formatCurrency(totalCost)}
                  </Typography>
                  <Chip 
                    label="↑ 12% מהחודש הקודם" 
                    size="small" 
                    sx={{ mt: 1, backgroundColor: 'rgba(255,255,255,0.2)', color: 'white' }}
                  />
                </Box>
                <AttachMoney sx={{ fontSize: 48, opacity: 0.5 }} />
              </Box>
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} md={3}>
          <Card sx={{ 
            background: 'linear-gradient(135deg, #f093fb 0%, #f5576c 100%)',
            color: 'white'
          }}>
            <CardContent>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <Box>
                  <Typography variant="body2" sx={{ opacity: 0.9 }}>
                    צריכה חודשית (kWh)
                  </Typography>
                  <Typography variant="h4" fontWeight="bold">
                    {formatNumber(115000)}
                  </Typography>
                  <Chip 
                    label="↓ 5% מהחודש הקודם" 
                    size="small" 
                    sx={{ mt: 1, backgroundColor: 'rgba(255,255,255,0.2)', color: 'white' }}
                  />
                </Box>
                <ElectricBolt sx={{ fontSize: 48, opacity: 0.5 }} />
              </Box>
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} md={3}>
          <Card sx={{ 
            background: 'linear-gradient(135deg, #4facfe 0%, #00f2fe 100%)',
            color: 'white'
          }}>
            <CardContent>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <Box>
                  <Typography variant="body2" sx={{ opacity: 0.9 }}>
                    מחיר ממוצע לקוט"ש
                  </Typography>
                  <Typography variant="h4" fontWeight="bold">
                    ₪21.45
                  </Typography>
                  <Chip 
                    label="↑ 3% מהממוצע השנתי" 
                    size="small" 
                    sx={{ mt: 1, backgroundColor: 'rgba(255,255,255,0.2)', color: 'white' }}
                  />
                </Box>
                <Speed sx={{ fontSize: 48, opacity: 0.5 }} />
              </Box>
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} md={3}>
          <Card sx={{ 
            background: 'linear-gradient(135deg, #fa709a 0%, #fee140 100%)',
            color: 'white'
          }}>
            <CardContent>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <Box>
                  <Typography variant="body2" sx={{ opacity: 0.9 }}>
                    דיוק חיוב
                  </Typography>
                  <Typography variant="h4" fontWeight="bold">
                    {accuracy.toFixed(1)}%
                  </Typography>
                  <Chip 
                    label={`פער של ${formatCurrency(totalGap)}`} 
                    size="small" 
                    sx={{ mt: 1, backgroundColor: 'rgba(255,255,255,0.2)', color: 'white' }}
                  />
                </Box>
                <CheckCircle sx={{ fontSize: 48, opacity: 0.5 }} />
              </Box>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      {/* Tabs for different views */}
      <Paper sx={{ mb: 3 }}>
        <Tabs value={activeTab} onChange={(e, v) => setActiveTab(v)}>
          <Tab label="מגמות צריכה" icon={<Timeline />} iconPosition="start" />
          <Tab label="ניתוח עלויות" icon={<AttachMoney />} iconPosition="start" />
          <Tab label="צרכנים גדולים" icon={<BarChart />} iconPosition="start" />
          <Tab label="יעילות אנרגטית" icon={<Speed />} iconPosition="start" />
        </Tabs>
      </Paper>

      {/* Tab Content */}
      {activeTab === 0 && (
        <Grid container spacing={3}>
          <Grid item xs={12} md={8}>
            <Paper sx={{ p: 3 }}>
              <Typography variant="h6" gutterBottom fontWeight="bold">
                מגמת צריכה ועלות - 6 חודשים אחרונים
              </Typography>
              <ResponsiveContainer width="100%" height={300}>
                <AreaChart data={monthlyData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="month" />
                  <YAxis yAxisId="left" />
                  <YAxis yAxisId="right" orientation="right" />
                  <Tooltip formatter={(value) => formatNumber(value)} />
                  <Legend />
                  <Area
                    yAxisId="left"
                    type="monotone"
                    dataKey="cost"
                    stroke="#8884d8"
                    fill="#8884d8"
                    name="חיוב CSV (₪)"
                    fillOpacity={0.6}
                  />
                  <Line
                    yAxisId="right"
                    type="monotone"
                    dataKey="verified"
                    stroke="#82ca9d"
                    name="חיוב מאומת (₪)"
                  />
                </AreaChart>
              </ResponsiveContainer>
            </Paper>
          </Grid>

          <Grid item xs={12} md={4}>
            <Paper sx={{ p: 3 }}>
              <Typography variant="h6" gutterBottom fontWeight="bold">
                התפלגות צריכה
              </Typography>
              <ResponsiveContainer width="100%" height={250}>
                <PieChart>
                  <Pie
                    data={consumptionBreakdown}
                    cx="50%"
                    cy="50%"
                    labelLine={false}
                    label={(entry) => `${entry.name}: ${entry.value}%`}
                    outerRadius={80}
                    fill="#8884d8"
                    dataKey="value"
                  >
                    {consumptionBreakdown.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>
            </Paper>
          </Grid>

          <Grid item xs={12}>
            <Paper sx={{ p: 3 }}>
              <Typography variant="h6" gutterBottom fontWeight="bold">
                השוואת פערי חיוב
              </Typography>
              <ResponsiveContainer width="100%" height={250}>
                <RechartsBarChart data={monthlyData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="month" />
                  <YAxis />
                  <Tooltip formatter={(value) => formatCurrency(value)} />
                  <Bar dataKey="gap" fill="#ff6b6b" name="פער חיוב (₪)" />
                </RechartsBarChart>
              </ResponsiveContainer>
            </Paper>
          </Grid>
        </Grid>
      )}

      {activeTab === 2 && (
        <Grid container spacing={3}>
          <Grid item xs={12}>
            <Paper sx={{ p: 3 }}>
              <Typography variant="h6" gutterBottom fontWeight="bold">
                5 הצרכנים הגדולים ביותר
              </Typography>
              <Box sx={{ mt: 3 }}>
                {topConsumers.map((consumer, index) => (
                  <Box key={index} sx={{ mb: 3 }}>
                    <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1 }}>
                      <Typography variant="subtitle1" fontWeight="medium">
                        {index + 1}. {consumer.name}
                      </Typography>
                      <Box sx={{ display: 'flex', gap: 2 }}>
                        <Chip label={`${formatNumber(consumer.consumption)} kWh`} color="primary" variant="outlined" />
                        <Chip label={formatCurrency(consumer.cost)} color="secondary" />
                      </Box>
                    </Box>
                    <LinearProgress 
                      variant="determinate" 
                      value={(consumer.consumption / topConsumers[0].consumption) * 100}
                      sx={{ height: 8, borderRadius: 4 }}
                    />
                  </Box>
                ))}
              </Box>
            </Paper>
          </Grid>
        </Grid>
      )}

      {/* Insights Section */}
      <Grid container spacing={3} sx={{ mt: 2 }}>
        <Grid item xs={12}>
          <Paper sx={{ p: 3, backgroundColor: '#f5f5f5' }}>
            <Typography variant="h6" gutterBottom fontWeight="bold">
              <TrendingUp sx={{ mr: 1, verticalAlign: 'middle' }} />
              תובנות והמלצות
            </Typography>
            <Grid container spacing={2} sx={{ mt: 1 }}>
              <Grid item xs={12} md={4}>
                <Alert severity="warning" icon={<Warning />}>
                  <Typography variant="subtitle2" fontWeight="bold">
                    צריכת שיא גבוהה
                  </Typography>
                  <Typography variant="body2">
                    65% מהצריכה בשעות שיא. מומלץ להעביר פעילויות לא קריטיות לשעות הלילה
                  </Typography>
                </Alert>
              </Grid>
              <Grid item xs={12} md={4}>
                <Alert severity="success" icon={<CheckCircle />}>
                  <Typography variant="subtitle2" fontWeight="bold">
                    שיפור ביעילות
                  </Typography>
                  <Typography variant="body2">
                    ירידה של 5% בצריכה החודשית. המשיכו במגמה החיובית
                  </Typography>
                </Alert>
              </Grid>
              <Grid item xs={12} md={4}>
                <Alert severity="info" icon={<ElectricBolt />}>
                  <Typography variant="subtitle2" fontWeight="bold">
                    פוטנציאל חיסכון
                  </Typography>
                  <Typography variant="body2">
                    העברת 10% מצריכת השיא יכולה לחסוך כ-₪45,000 בחודש
                  </Typography>
                </Alert>
              </Grid>
            </Grid>
          </Paper>
        </Grid>
      </Grid>
    </Box>
  )
}

export default Analytics