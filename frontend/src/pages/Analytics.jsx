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
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  TextField,
  InputAdornment,
  Select,
  MenuItem,
  FormControl,
  InputLabel
} from '@mui/material'
import {
  TrendingUp,
  ElectricBolt,
  AttachMoney,
  Analytics as AnalyticsIcon,
  Timeline,
  Speed,
  Warning,
  CheckCircle,
  LocationOn,
  Search,
  Lightbulb,
  Savings
} from '@mui/icons-material'
import {
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
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [activeTab, setActiveTab] = useState(0)
  const [selectedYear, setSelectedYear] = useState(null)
  const [selectedMonth, setSelectedMonth] = useState(null)
  const [viewMode, setViewMode] = useState('yearly') // 'yearly' or 'monthly'
  const [availableYears, setAvailableYears] = useState([2025, 2024])
  const [availableMonths, setAvailableMonths] = useState([])
  const [initialized, setInitialized] = useState(false)

  // Data states
  const [consumptionData, setConsumptionData] = useState(null)
  const [breakdown, setBreakdown] = useState(null)
  const [sites, setSites] = useState([])
  const [topConsumers, setTopConsumers] = useState([])
  const [optimization, setOptimization] = useState(null)
  const [siteSearch, setSiteSearch] = useState('')

  const hebrewMonths = ['ינואר', 'פברואר', 'מרץ', 'אפריל', 'מאי', 'יוני', 'יולי', 'אוגוסט', 'ספטמבר', 'אוקטובר', 'נובמבר', 'דצמבר']

  // Initial load - get available years first
  useEffect(() => {
    fetchInitialData()
  }, [])

  // Fetch data when year changes (after initialization)
  useEffect(() => {
    if (initialized && selectedYear) {
      fetchYearData(selectedYear)
    }
  }, [selectedYear])

  // Fetch filtered data when month or view mode changes
  useEffect(() => {
    if (initialized && selectedYear) {
      fetchFilteredData()
    }
  }, [selectedMonth, viewMode])

  const fetchInitialData = async () => {
    try {
      setLoading(true)
      // First get available years
      const yearsRes = await axios.get('/api/analytics/consumption')
      const yearsData = yearsRes.data.data

      // Set available years and select the latest
      const years = yearsData?.availableYears || [2025, 2024]
      setAvailableYears(years)
      const latestYear = years[0]

      // Fetch consumption data WITH the correct year
      const consumptionRes = await axios.get(`/api/analytics/consumption?year=${latestYear}`)
      const data = consumptionRes.data.data
      setConsumptionData(data)

      // Get available months for the year
      const months = data?.monthly?.filter(m => m.billing_year === latestYear) || []
      setAvailableMonths(months)
      const latestMonth = months.length > 0 ? Math.max(...months.map(m => m.billing_month)) : 1

      setSelectedYear(latestYear)
      setSelectedMonth(latestMonth)

      // Fetch other data
      try {
        const breakdownRes = await axios.get(`/api/analytics/consumption-breakdown?year=${latestYear}`)
        setBreakdown(breakdownRes.data.data)
      } catch (e) { console.error('Breakdown fetch error:', e) }

      try {
        const sitesRes = await axios.get(`/api/analytics/sites?year=${latestYear}&limit=200`)
        setSites(sitesRes.data.data?.sites || [])
      } catch (e) { console.error('Sites fetch error:', e) }

      try {
        const topRes = await axios.get(`/api/analytics/top-consumers?year=${latestYear}&limit=10`)
        setTopConsumers(topRes.data.data || [])
      } catch (e) { console.error('Top consumers fetch error:', e) }

      try {
        const optimizationRes = await axios.get(`/api/analytics/optimization?year=${latestYear}`)
        setOptimization(optimizationRes.data.data)
      } catch (e) { console.error('Optimization fetch error:', e) }

      setInitialized(true)
    } catch (err) {
      setError('שגיאה בטעינת נתוני אנליטיקס')
      console.error('Analytics error:', err)
    } finally {
      setLoading(false)
    }
  }

  const fetchYearData = async (year) => {
    try {
      setLoading(true)
      const consumptionRes = await axios.get(`/api/analytics/consumption?year=${year}`)
      const data = consumptionRes.data.data
      setConsumptionData(data)

      // Update available months for this year
      const months = data?.monthly?.filter(m => m.billing_year === year) || []
      setAvailableMonths(months)

      // Reset month to latest in this year if current month doesn't exist
      if (months.length > 0 && !months.find(m => m.billing_month === selectedMonth)) {
        const latestMonth = Math.max(...months.map(m => m.billing_month))
        setSelectedMonth(latestMonth)
      }

      // Fetch yearly data
      const [breakdownRes, sitesRes, topRes, optimizationRes] = await Promise.all([
        axios.get(`/api/analytics/consumption-breakdown?year=${year}`),
        axios.get(`/api/analytics/sites?year=${year}&limit=200`),
        axios.get(`/api/analytics/top-consumers?year=${year}&limit=10`),
        axios.get(`/api/analytics/optimization?year=${year}`)
      ])

      setBreakdown(breakdownRes.data.data)
      setSites(sitesRes.data.data?.sites || [])
      setTopConsumers(topRes.data.data || [])
      setOptimization(optimizationRes.data.data)
    } catch (err) {
      setError('שגיאה בטעינת נתוני אנליטיקס')
      console.error('Analytics error:', err)
    } finally {
      setLoading(false)
    }
  }

  const fetchFilteredData = async () => {
    try {
      let breakdownUrl = `/api/analytics/consumption-breakdown?year=${selectedYear}`
      let sitesUrl = `/api/analytics/sites?year=${selectedYear}&limit=200`
      let topUrl = `/api/analytics/top-consumers?year=${selectedYear}&limit=10`
      let optimizationUrl = `/api/analytics/optimization?year=${selectedYear}`

      // Add month filter only in monthly view
      if (viewMode === 'monthly' && selectedMonth) {
        breakdownUrl += `&month=${selectedMonth}`
        sitesUrl += `&month=${selectedMonth}`
        topUrl += `&month=${selectedMonth}`
        optimizationUrl += `&month=${selectedMonth}`
      }

      const [breakdownRes, sitesRes, topRes, optimizationRes] = await Promise.all([
        axios.get(breakdownUrl),
        axios.get(sitesUrl),
        axios.get(topUrl),
        axios.get(optimizationUrl)
      ])

      setBreakdown(breakdownRes.data.data)
      setSites(sitesRes.data.data?.sites || [])
      setTopConsumers(topRes.data.data || [])
      setOptimization(optimizationRes.data.data)
    } catch (err) {
      console.error('Filtered data fetch error:', err)
    }
  }

  const getMonthName = (month) => {
    const months = ['ינואר', 'פברואר', 'מרץ', 'אפריל', 'מאי', 'יוני', 'יולי', 'אוגוסט', 'ספטמבר', 'אוקטובר', 'נובמבר', 'דצמבר']
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
    return new Intl.NumberFormat('he-IL').format(Math.round(num))
  }

  // Process monthly data for charts
  const monthlyChartData = consumptionData?.monthly?.map(item => ({
    month: getMonthName(item.billing_month),
    monthNum: item.billing_month,
    cost: parseFloat(item.total_cost || 0),
    consumption: parseFloat(item.total_consumption || 0),
    peak: parseFloat(item.total_peak_consumption || 0),
    offpeak: parseFloat(item.total_offpeak_consumption || 0),
    sites: parseInt(item.site_count || 0)
  })) || []

  // Peak/Off-peak for pie chart
  const peakOffpeakData = breakdown?.peakOffpeak ? [
    { name: 'שעות שיא', value: parseFloat(breakdown.peakOffpeak.peak || 0), color: '#ff6b6b' },
    { name: 'שעות שפל', value: parseFloat(breakdown.peakOffpeak.offpeak || 0), color: '#4ecdc4' }
  ] : []

  // Filter sites by search
  const filteredSites = sites.filter(site =>
    site.site_name?.toLowerCase().includes(siteSearch.toLowerCase()) ||
    site.tariff_type?.toLowerCase().includes(siteSearch.toLowerCase())
  )

  // Calculate display values based on view mode
  const getDisplayData = () => {
    if (!consumptionData) {
      return { totalCost: 0, totalConsumption: 0, activeSites: 0, avgCostPerKwh: 0, periodLabel: '' }
    }

    if (viewMode === 'monthly' && selectedMonth) {
      // Find the specific month's data from the monthly array
      const monthData = consumptionData?.monthly?.find(
        m => m.billing_year === selectedYear && m.billing_month === selectedMonth
      )
      const cost = parseFloat(monthData?.total_cost || 0)
      const consumption = parseFloat(monthData?.total_consumption || 0)
      return {
        totalCost: cost,
        totalConsumption: consumption,
        activeSites: parseInt(monthData?.site_count || 0),
        avgCostPerKwh: consumption > 0 ? cost / consumption : 0,
        periodLabel: `${hebrewMonths[selectedMonth - 1]} ${selectedYear}`
      }
    } else {
      // Yearly totals - use overall from API or calculate from monthly
      const overall = consumptionData?.overall
      if (overall && parseFloat(overall.total_cost || 0) > 0) {
        return {
          totalCost: parseFloat(overall.total_cost || 0),
          totalConsumption: parseFloat(overall.total_consumption || 0),
          activeSites: parseInt(overall.total_sites || 0),
          avgCostPerKwh: parseFloat(overall.avg_cost_per_kwh || 0),
          periodLabel: `שנת ${selectedYear}`
        }
      }
      // Fallback: calculate from monthly data
      const yearMonths = consumptionData?.monthly?.filter(m => m.billing_year === selectedYear) || []
      const totalCost = yearMonths.reduce((sum, m) => sum + parseFloat(m.total_cost || 0), 0)
      const totalConsumption = yearMonths.reduce((sum, m) => sum + parseFloat(m.total_consumption || 0), 0)
      const maxSites = yearMonths.length > 0 ? Math.max(...yearMonths.map(m => parseInt(m.site_count || 0))) : 0
      return {
        totalCost,
        totalConsumption,
        activeSites: maxSites,
        avgCostPerKwh: totalConsumption > 0 ? totalCost / totalConsumption : 0,
        periodLabel: `שנת ${selectedYear}`
      }
    }
  }

  const displayData = getDisplayData()
  const peakRatio = parseFloat(breakdown?.peakOffpeak?.peakRatio || 0)

  if (loading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '60vh' }}>
        <CircularProgress />
      </Box>
    )
  }

  return (
    <Box>
      {/* Header */}
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3, flexWrap: 'wrap', gap: 2 }}>
        <Box>
          <Typography variant="h4" fontWeight="bold">
            <AnalyticsIcon sx={{ mr: 1, verticalAlign: 'middle' }} />
            ניתוח צריכת חשמל עירונית
          </Typography>
          <Typography variant="body2" color="text.secondary">
            {displayData.periodLabel}
          </Typography>
        </Box>

        <Box sx={{ display: 'flex', gap: 2, alignItems: 'center', flexWrap: 'wrap' }}>
          {/* View Mode Toggle */}
          <Box sx={{ display: 'flex', border: '1px solid #ddd', borderRadius: 1, overflow: 'hidden' }}>
            <Box
              onClick={() => setViewMode('yearly')}
              sx={{
                px: 2, py: 1,
                cursor: 'pointer',
                backgroundColor: viewMode === 'yearly' ? '#667eea' : 'white',
                color: viewMode === 'yearly' ? 'white' : 'inherit',
                fontWeight: viewMode === 'yearly' ? 'bold' : 'normal',
                transition: 'all 0.2s'
              }}
            >
              שנתי
            </Box>
            <Box
              onClick={() => setViewMode('monthly')}
              sx={{
                px: 2, py: 1,
                cursor: 'pointer',
                backgroundColor: viewMode === 'monthly' ? '#667eea' : 'white',
                color: viewMode === 'monthly' ? 'white' : 'inherit',
                fontWeight: viewMode === 'monthly' ? 'bold' : 'normal',
                transition: 'all 0.2s'
              }}
            >
              חודשי
            </Box>
          </Box>

          {/* Year Selector */}
          <FormControl sx={{ minWidth: 100 }} size="small">
            <InputLabel>שנה</InputLabel>
            <Select
              value={selectedYear || ''}
              onChange={(e) => setSelectedYear(e.target.value)}
              label="שנה"
            >
              {availableYears.map(year => (
                <MenuItem key={year} value={year}>{year}</MenuItem>
              ))}
            </Select>
          </FormControl>

          {/* Month Selector - only visible in monthly view */}
          {viewMode === 'monthly' && (
            <FormControl sx={{ minWidth: 120 }} size="small">
              <InputLabel>חודש</InputLabel>
              <Select
                value={selectedMonth || ''}
                onChange={(e) => setSelectedMonth(e.target.value)}
                label="חודש"
              >
                {availableMonths.map(m => (
                  <MenuItem key={m.billing_month} value={m.billing_month}>
                    {hebrewMonths[m.billing_month - 1]}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
          )}
        </Box>
      </Box>

      {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}

      {/* Summary Cards */}
      <Grid container spacing={3} sx={{ mb: 4 }}>
        <Grid item xs={12} md={3}>
          <Card sx={{ background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)', color: 'white' }}>
            <CardContent>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <Box>
                  <Typography variant="body2" sx={{ opacity: 0.9 }}>
                    {viewMode === 'monthly' ? 'עלות חודשית' : 'סה"כ עלות שנתית'}
                  </Typography>
                  <Typography variant="h4" fontWeight="bold">{formatCurrency(displayData.totalCost)}</Typography>
                  <Chip label={`${displayData.activeSites} אתרים`} size="small" sx={{ mt: 1, backgroundColor: 'rgba(255,255,255,0.2)', color: 'white' }} />
                </Box>
                <AttachMoney sx={{ fontSize: 48, opacity: 0.5 }} />
              </Box>
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} md={3}>
          <Card sx={{ background: 'linear-gradient(135deg, #f093fb 0%, #f5576c 100%)', color: 'white' }}>
            <CardContent>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <Box>
                  <Typography variant="body2" sx={{ opacity: 0.9 }}>
                    {viewMode === 'monthly' ? 'צריכה חודשית (kWh)' : 'צריכה שנתית (kWh)'}
                  </Typography>
                  <Typography variant="h4" fontWeight="bold">{formatNumber(displayData.totalConsumption)}</Typography>
                  <Chip label={`${peakRatio.toFixed(1)}% בשעות שיא`} size="small" sx={{ mt: 1, backgroundColor: 'rgba(255,255,255,0.2)', color: 'white' }} />
                </Box>
                <ElectricBolt sx={{ fontSize: 48, opacity: 0.5 }} />
              </Box>
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} md={3}>
          <Card sx={{ background: 'linear-gradient(135deg, #4facfe 0%, #00f2fe 100%)', color: 'white' }}>
            <CardContent>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <Box>
                  <Typography variant="body2" sx={{ opacity: 0.9 }}>מחיר ממוצע ל-kWh</Typography>
                  <Typography variant="h4" fontWeight="bold">₪{displayData.avgCostPerKwh.toFixed(2)}</Typography>
                </Box>
                <Speed sx={{ fontSize: 48, opacity: 0.5 }} />
              </Box>
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} md={3}>
          <Card sx={{ background: 'linear-gradient(135deg, #11998e 0%, #38ef7d 100%)', color: 'white' }}>
            <CardContent>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <Box>
                  <Typography variant="body2" sx={{ opacity: 0.9 }}>חיסכון מהנחות</Typography>
                  <Typography variant="h4" fontWeight="bold">{formatCurrency(parseFloat(breakdown?.costComponents?.total_discount || 0))}</Typography>
                </Box>
                <Savings sx={{ fontSize: 48, opacity: 0.5 }} />
              </Box>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      {/* Tabs */}
      <Paper sx={{ mb: 3 }}>
        <Tabs value={activeTab} onChange={(e, v) => setActiveTab(v)} variant="fullWidth">
          <Tab label="מגמות צריכה" icon={<Timeline />} iconPosition="start" />
          <Tab label="ניתוח עלויות" icon={<AttachMoney />} iconPosition="start" />
          <Tab label="ניתוח אתרים" icon={<LocationOn />} iconPosition="start" />
          <Tab label="הזדמנויות אופטימיזציה" icon={<Lightbulb />} iconPosition="start" />
        </Tabs>
      </Paper>

      {/* Tab 0: Consumption Trends */}
      {activeTab === 0 && (
        <Grid container spacing={3}>
          <Grid item xs={12} md={8}>
            <Paper sx={{ p: 3 }}>
              <Typography variant="h6" gutterBottom fontWeight="bold">מגמת צריכה ועלות חודשית</Typography>
              {monthlyChartData.length === 0 ? (
                <Box sx={{ textAlign: 'center', py: 5, color: 'text.secondary' }}>אין נתונים לשנה זו</Box>
              ) : (
                <ResponsiveContainer width="100%" height={300}>
                  <AreaChart data={monthlyChartData}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="month" />
                    <YAxis yAxisId="left" tickFormatter={(v) => `₪${(v/1000).toFixed(0)}K`} />
                    <YAxis yAxisId="right" orientation="right" tickFormatter={(v) => `${(v/1000).toFixed(0)}K`} />
                    <Tooltip formatter={(value, name) => [name === 'cost' ? formatCurrency(value) : `${formatNumber(value)} kWh`, name === 'cost' ? 'עלות' : 'צריכה']} />
                    <Legend />
                    <Area yAxisId="left" type="monotone" dataKey="cost" stroke="#8884d8" fill="#8884d8" name="עלות (₪)" fillOpacity={0.6} />
                    <Area yAxisId="right" type="monotone" dataKey="consumption" stroke="#82ca9d" fill="#82ca9d" name="צריכה (kWh)" fillOpacity={0.4} />
                  </AreaChart>
                </ResponsiveContainer>
              )}
            </Paper>
          </Grid>

          <Grid item xs={12} md={4}>
            <Paper sx={{ p: 3 }}>
              <Typography variant="h6" gutterBottom fontWeight="bold">התפלגות שיא/שפל</Typography>
              {peakOffpeakData.length === 0 ? (
                <Box sx={{ textAlign: 'center', py: 5, color: 'text.secondary' }}>אין נתונים</Box>
              ) : (
                <ResponsiveContainer width="100%" height={250}>
                  <PieChart>
                    <Pie data={peakOffpeakData} cx="50%" cy="50%" labelLine={false}
                      label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(1)}%`}
                      outerRadius={80} dataKey="value">
                      {peakOffpeakData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.color} />
                      ))}
                    </Pie>
                    <Tooltip formatter={(value) => `${formatNumber(value)} kWh`} />
                  </PieChart>
                </ResponsiveContainer>
              )}
            </Paper>
          </Grid>

          <Grid item xs={12}>
            <Paper sx={{ p: 3 }}>
              <Typography variant="h6" gutterBottom fontWeight="bold">צריכת שיא לעומת שפל - לפי חודש</Typography>
              {monthlyChartData.length === 0 ? (
                <Box sx={{ textAlign: 'center', py: 5, color: 'text.secondary' }}>אין נתונים</Box>
              ) : (
                <ResponsiveContainer width="100%" height={250}>
                  <RechartsBarChart data={monthlyChartData}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="month" />
                    <YAxis tickFormatter={(v) => `${(v/1000).toFixed(0)}K`} />
                    <Tooltip formatter={(value) => `${formatNumber(value)} kWh`} />
                    <Legend />
                    <Bar dataKey="peak" fill="#ff6b6b" name="שעות שיא" stackId="a" />
                    <Bar dataKey="offpeak" fill="#4ecdc4" name="שעות שפל" stackId="a" />
                  </RechartsBarChart>
                </ResponsiveContainer>
              )}
            </Paper>
          </Grid>
        </Grid>
      )}

      {/* Tab 1: Cost Analysis */}
      {activeTab === 1 && (
        <Grid container spacing={3}>
          <Grid item xs={12} md={6}>
            <Paper sx={{ p: 3 }}>
              <Typography variant="h6" gutterBottom fontWeight="bold">התפלגות עלויות לפי רכיב</Typography>
              {breakdown?.costComponents ? (
                <Box sx={{ mt: 2 }}>
                  {[
                    { name: 'צריכת אנרגיה', value: breakdown.costComponents.consumption_cost, color: '#8884d8' },
                    { name: 'עלות KVA', value: breakdown.costComponents.kva_cost, color: '#82ca9d' },
                    { name: 'חלוקה', value: breakdown.costComponents.distribution_cost, color: '#ffc658' },
                    { name: 'אספקה', value: breakdown.costComponents.supply_cost, color: '#ff8042' }
                  ].map((item, idx) => {
                    const total = Object.values(breakdown.costComponents).reduce((sum, v) => sum + parseFloat(v || 0), 0)
                    const percent = total > 0 ? (parseFloat(item.value || 0) / total * 100).toFixed(1) : 0
                    return (
                      <Box key={idx} sx={{ mb: 2 }}>
                        <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 0.5 }}>
                          <Typography variant="body2">{item.name}</Typography>
                          <Typography variant="body2" fontWeight="bold">{formatCurrency(item.value)} ({percent}%)</Typography>
                        </Box>
                        <LinearProgress variant="determinate" value={parseFloat(percent)} sx={{ height: 8, borderRadius: 4, backgroundColor: '#eee', '& .MuiLinearProgress-bar': { backgroundColor: item.color } }} />
                      </Box>
                    )
                  })}
                </Box>
              ) : (
                <Box sx={{ textAlign: 'center', py: 5, color: 'text.secondary' }}>אין נתונים</Box>
              )}
            </Paper>
          </Grid>

          <Grid item xs={12} md={6}>
            <Paper sx={{ p: 3 }}>
              <Typography variant="h6" gutterBottom fontWeight="bold">עלויות לפי סוג תעריף</Typography>
              {breakdown?.byTariff?.length > 0 ? (
                <ResponsiveContainer width="100%" height={300}>
                  <RechartsBarChart data={breakdown.byTariff} layout="vertical">
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis type="number" tickFormatter={(v) => `₪${(v/1000).toFixed(0)}K`} />
                    <YAxis dataKey="tariff_type" type="category" width={100} />
                    <Tooltip formatter={(value) => formatCurrency(value)} />
                    <Bar dataKey="total_cost" fill="#8884d8" name="עלות כוללת" />
                  </RechartsBarChart>
                </ResponsiveContainer>
              ) : (
                <Box sx={{ textAlign: 'center', py: 5, color: 'text.secondary' }}>אין נתונים</Box>
              )}
            </Paper>
          </Grid>

          <Grid item xs={12}>
            <Paper sx={{ p: 3 }}>
              <Typography variant="h6" gutterBottom fontWeight="bold">עלויות לפי עונה</Typography>
              {breakdown?.bySeason?.length > 0 ? (
                <Grid container spacing={2}>
                  {breakdown.bySeason.map((season, idx) => (
                    <Grid item xs={12} md={4} key={idx}>
                      <Card variant="outlined">
                        <CardContent>
                          <Typography variant="h6" color="primary">{season.season}</Typography>
                          <Typography variant="h5" fontWeight="bold">{formatCurrency(season.total_cost)}</Typography>
                          <Typography variant="body2" color="text.secondary">
                            צריכה: {formatNumber(season.total_consumption)} kWh
                          </Typography>
                        </CardContent>
                      </Card>
                    </Grid>
                  ))}
                </Grid>
              ) : (
                <Box sx={{ textAlign: 'center', py: 5, color: 'text.secondary' }}>אין נתונים</Box>
              )}
            </Paper>
          </Grid>
        </Grid>
      )}

      {/* Tab 2: Sites Analysis */}
      {activeTab === 2 && (
        <Grid container spacing={3}>
          <Grid item xs={12}>
            <Paper sx={{ p: 3 }}>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
                <Typography variant="h6" fontWeight="bold">רשימת אתרים ({filteredSites.length})</Typography>
                <TextField
                  size="small"
                  placeholder="חיפוש אתר..."
                  value={siteSearch}
                  onChange={(e) => setSiteSearch(e.target.value)}
                  InputProps={{
                    startAdornment: <InputAdornment position="start"><Search /></InputAdornment>
                  }}
                  sx={{ width: 300 }}
                />
              </Box>

              <TableContainer sx={{ maxHeight: 500 }}>
                <Table stickyHeader size="small">
                  <TableHead>
                    <TableRow>
                      <TableCell>שם אתר</TableCell>
                      <TableCell>סוג תעריף</TableCell>
                      <TableCell>KVA</TableCell>
                      <TableCell align="right">עלות כוללת</TableCell>
                      <TableCell align="right">צריכה (kWh)</TableCell>
                      <TableCell align="right">% שיא</TableCell>
                      <TableCell align="right">עלות חודשית ממוצעת</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {filteredSites.slice(0, 50).map((site, idx) => (
                      <TableRow key={idx} hover>
                        <TableCell sx={{ maxWidth: 250, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                          {site.site_name?.split('-').pop()?.trim() || site.site_name}
                        </TableCell>
                        <TableCell>
                          <Chip label={site.tariff_type} size="small" variant="outlined" />
                        </TableCell>
                        <TableCell>{site.kva}</TableCell>
                        <TableCell align="right">{formatCurrency(site.total_cost)}</TableCell>
                        <TableCell align="right">{formatNumber(site.total_consumption)}</TableCell>
                        <TableCell align="right">
                          <Chip
                            label={`${parseFloat(site.peak_ratio || 0).toFixed(1)}%`}
                            size="small"
                            color={parseFloat(site.peak_ratio) > 70 ? 'error' : parseFloat(site.peak_ratio) > 50 ? 'warning' : 'success'}
                          />
                        </TableCell>
                        <TableCell align="right">{formatCurrency(site.avg_monthly_cost)}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </TableContainer>
              {filteredSites.length > 50 && (
                <Typography variant="body2" color="text.secondary" sx={{ mt: 2, textAlign: 'center' }}>
                  מציג 50 מתוך {filteredSites.length} אתרים
                </Typography>
              )}
            </Paper>
          </Grid>

          <Grid item xs={12} md={6}>
            <Paper sx={{ p: 3 }}>
              <Typography variant="h6" gutterBottom fontWeight="bold">10 צרכנים גדולים - לפי עלות</Typography>
              {topConsumers.length === 0 ? (
                <Box sx={{ textAlign: 'center', py: 5, color: 'text.secondary' }}>אין נתונים</Box>
              ) : (
                <Box sx={{ mt: 2 }}>
                  {topConsumers.map((consumer, index) => {
                    const maxCost = Math.max(...topConsumers.map(c => parseFloat(c.total_cost) || 0))
                    const percent = maxCost > 0 ? (parseFloat(consumer.total_cost) / maxCost * 100) : 0
                    return (
                      <Box key={index} sx={{ mb: 2 }}>
                        <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 0.5 }}>
                          <Typography variant="body2" sx={{ maxWidth: '60%', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                            {index + 1}. {consumer.site_name?.split('-').pop()?.trim() || consumer.site_name}
                          </Typography>
                          <Typography variant="body2" fontWeight="bold">{formatCurrency(consumer.total_cost)}</Typography>
                        </Box>
                        <LinearProgress variant="determinate" value={percent} sx={{ height: 6, borderRadius: 3 }} />
                        <Typography variant="caption" color="text.secondary">
                          {consumer.tariff_type} | {formatNumber(consumer.total_consumption)} kWh
                        </Typography>
                      </Box>
                    )
                  })}
                </Box>
              )}
            </Paper>
          </Grid>

          <Grid item xs={12} md={6}>
            <Paper sx={{ p: 3 }}>
              <Typography variant="h6" gutterBottom fontWeight="bold">התפלגות אתרים לפי סוג תעריף</Typography>
              {breakdown?.byTariff?.length > 0 ? (
                <ResponsiveContainer width="100%" height={300}>
                  <PieChart>
                    <Pie
                      data={breakdown.byTariff.map((t, i) => ({ ...t, color: ['#8884d8', '#82ca9d', '#ffc658', '#ff8042', '#00C49F'][i % 5] }))}
                      cx="50%"
                      cy="50%"
                      labelLine={false}
                      label={({ tariff_type, site_count }) => `${tariff_type}: ${site_count}`}
                      outerRadius={100}
                      dataKey="site_count"
                    >
                      {breakdown.byTariff.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={['#8884d8', '#82ca9d', '#ffc658', '#ff8042', '#00C49F'][index % 5]} />
                      ))}
                    </Pie>
                    <Tooltip formatter={(value, name) => [`${value} אתרים`, 'מספר אתרים']} />
                  </PieChart>
                </ResponsiveContainer>
              ) : (
                <Box sx={{ textAlign: 'center', py: 5, color: 'text.secondary' }}>אין נתונים</Box>
              )}
            </Paper>
          </Grid>
        </Grid>
      )}

      {/* Tab 3: Optimization Opportunities */}
      {activeTab === 3 && (
        <Grid container spacing={3}>
          {/* Discount Savings Summary */}
          <Grid item xs={12}>
            <Paper sx={{ p: 3, background: 'linear-gradient(135deg, #11998e 0%, #38ef7d 100%)', color: 'white' }}>
              <Grid container spacing={3} alignItems="center">
                <Grid item xs={12} md={4}>
                  <Typography variant="h6">סה"כ חיסכון מהנחות</Typography>
                  <Typography variant="h3" fontWeight="bold">{formatCurrency(optimization?.discountSavings?.total_saved || 0)}</Typography>
                  <Typography variant="body2" sx={{ opacity: 0.9 }}>
                    {parseFloat(optimization?.discountSavings?.discount_rate || 0).toFixed(1)}% מהעלות הכוללת
                  </Typography>
                </Grid>
                <Grid item xs={12} md={8}>
                  <Alert severity="info" sx={{ backgroundColor: 'rgba(255,255,255,0.9)' }}>
                    <Typography variant="body2">
                      העירייה חוסכת {formatCurrency(optimization?.discountSavings?.total_saved || 0)} בזכות הנחות על תעריפי החשמל.
                      ניתן להגדיל את החיסכון על ידי העברת צריכה משעות שיא לשעות שפל.
                    </Typography>
                  </Alert>
                </Grid>
              </Grid>
            </Paper>
          </Grid>

          {/* Peak Shifting Candidates */}
          <Grid item xs={12} md={6}>
            <Paper sx={{ p: 3 }}>
              <Typography variant="h6" gutterBottom fontWeight="bold" color="error">
                <Warning sx={{ mr: 1, verticalAlign: 'middle' }} />
                אתרים עם צריכת שיא גבוהה ({'>'}70%)
              </Typography>
              <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                אתרים אלו צורכים רוב האנרגיה בשעות שיא - מומלץ לבדוק אפשרות להעברת פעילות לשעות שפל
              </Typography>

              {optimization?.peakShiftingCandidates?.length > 0 ? (
                <TableContainer sx={{ maxHeight: 350 }}>
                  <Table size="small">
                    <TableHead>
                      <TableRow>
                        <TableCell>אתר</TableCell>
                        <TableCell align="right">% שיא</TableCell>
                        <TableCell align="right">עלות</TableCell>
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {optimization.peakShiftingCandidates.map((site, idx) => (
                        <TableRow key={idx}>
                          <TableCell sx={{ maxWidth: 200, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                            {site.site_name?.split('-').pop()?.trim() || site.site_name}
                          </TableCell>
                          <TableCell align="right">
                            <Chip label={`${parseFloat(site.peak_ratio || 0).toFixed(1)}%`} size="small" color="error" />
                          </TableCell>
                          <TableCell align="right">{formatCurrency(site.total_cost)}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </TableContainer>
              ) : (
                <Alert severity="success">אין אתרים עם צריכת שיא גבוהה במיוחד</Alert>
              )}
            </Paper>
          </Grid>

          {/* Tariff Optimization */}
          <Grid item xs={12} md={6}>
            <Paper sx={{ p: 3 }}>
              <Typography variant="h6" gutterBottom fontWeight="bold" color="warning.main">
                <Lightbulb sx={{ mr: 1, verticalAlign: 'middle' }} />
                אתרים לבדיקת שינוי תעריף
              </Typography>
              <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                אתרים בתעריף "כללי" עם צריכה משמעותית - יתכן שיפיקו תועלת ממעבר לתעריף TOU
              </Typography>

              {optimization?.tariffOptimization?.length > 0 ? (
                <TableContainer sx={{ maxHeight: 350 }}>
                  <Table size="small">
                    <TableHead>
                      <TableRow>
                        <TableCell>אתר</TableCell>
                        <TableCell align="right">צריכה (kWh)</TableCell>
                        <TableCell align="right">עלות</TableCell>
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {optimization.tariffOptimization.map((site, idx) => (
                        <TableRow key={idx}>
                          <TableCell sx={{ maxWidth: 200, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                            {site.site_name?.split('-').pop()?.trim() || site.site_name}
                          </TableCell>
                          <TableCell align="right">{formatNumber(site.total_consumption)}</TableCell>
                          <TableCell align="right">{formatCurrency(site.total_cost)}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </TableContainer>
              ) : (
                <Alert severity="success">כל האתרים בתעריף המתאים</Alert>
              )}
            </Paper>
          </Grid>

          {/* Insights */}
          <Grid item xs={12}>
            <Paper sx={{ p: 3, backgroundColor: '#f5f5f5' }}>
              <Typography variant="h6" gutterBottom fontWeight="bold">
                <TrendingUp sx={{ mr: 1, verticalAlign: 'middle' }} />
                תובנות והמלצות
              </Typography>
              <Grid container spacing={2} sx={{ mt: 1 }}>
                <Grid item xs={12} md={4}>
                  <Alert severity="warning" icon={<Warning />}>
                    <Typography variant="subtitle2" fontWeight="bold">צריכת שיא גבוהה</Typography>
                    <Typography variant="body2">
                      {peakRatio}% מהצריכה בשעות שיא. מומלץ לבחון העברת פעילויות לשעות לילה
                    </Typography>
                  </Alert>
                </Grid>
                <Grid item xs={12} md={4}>
                  <Alert severity="success" icon={<CheckCircle />}>
                    <Typography variant="subtitle2" fontWeight="bold">הנחות פעילות</Typography>
                    <Typography variant="body2">
                      העירייה נהנית מהנחה של {parseFloat(optimization?.discountSavings?.discount_rate || 0).toFixed(1)}% על תעריפי החשמל
                    </Typography>
                  </Alert>
                </Grid>
                <Grid item xs={12} md={4}>
                  <Alert severity="info" icon={<ElectricBolt />}>
                    <Typography variant="subtitle2" fontWeight="bold">פוטנציאל חיסכון</Typography>
                    <Typography variant="body2">
                      העברת 10% מצריכת השיא לשפל יכולה לחסוך כ-{formatCurrency(displayData.totalCost * 0.03)} בשנה
                    </Typography>
                  </Alert>
                </Grid>
              </Grid>
            </Paper>
          </Grid>
        </Grid>
      )}
    </Box>
  )
}

export default Analytics
