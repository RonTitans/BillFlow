import { useState, useEffect } from 'react'
import axios from 'axios'
import KPICard from '../components/KPICard'
import {
  ElectricBolt,
  TrendingUp,
  AttachMoney,
  BarChart,
  PieChart,
  LocationOn,
  Bolt,
  Savings,
  CloudUpload,
  Warning,
  CalendarMonth,
  CalendarToday
} from '@mui/icons-material'

function NexusDashboard() {
  const [consumptionData, setConsumptionData] = useState(null)
  const [topConsumers, setTopConsumers] = useState([])
  const [breakdown, setBreakdown] = useState(null)
  const [recentFiles, setRecentFiles] = useState([])
  const [fileStats, setFileStats] = useState(null)
  const [error, setError] = useState('')

  // View mode: 'yearly' or 'monthly'
  const [viewMode, setViewMode] = useState('yearly')
  const [selectedYear, setSelectedYear] = useState(null)
  const [selectedMonth, setSelectedMonth] = useState(null)
  const [availableMonths, setAvailableMonths] = useState([])
  const [initialized, setInitialized] = useState(false)

  const hebrewMonths = ['ינואר', 'פברואר', 'מרץ', 'אפריל', 'מאי', 'יוני', 'יולי', 'אוגוסט', 'ספטמבר', 'אוקטובר', 'נובמבר', 'דצמבר']

  // Initial fetch - always runs on mount
  useEffect(() => {
    fetchInitialData()
  }, [])

  // Fetch filtered data when year changes
  useEffect(() => {
    if (initialized && selectedYear) {
      fetchYearData(selectedYear)
    }
  }, [selectedYear])

  // Fetch breakdown and top consumers when month or view mode changes
  useEffect(() => {
    if (initialized && selectedYear) {
      fetchFilteredData()
    }
  }, [selectedMonth, viewMode])

  const fetchInitialData = async () => {
    try {
      // First, get a quick call to find available years (this call may return empty data for wrong year)
      const yearsResponse = await axios.get('/api/analytics/consumption')
      const yearsData = yearsResponse.data.data

      if (!yearsData || !yearsData.availableYears || yearsData.availableYears.length === 0) {
        setError('לא נמצאו נתונים במערכת')
        return
      }

      // Now fetch with the correct year
      const latestYear = yearsData.availableYears[0]

      // Fetch consumption data WITH the correct year to get proper data
      const consumptionResponse = await axios.get(`/api/analytics/consumption?year=${latestYear}`)
      const data = consumptionResponse.data.data

      // Get available months for the year
      const months = data?.monthly?.filter(m => m.billing_year === latestYear) || []
      const latestMonth = months.length > 0 ? Math.max(...months.map(m => m.billing_month)) : 1

      // Set state
      setConsumptionData(data)
      setAvailableMonths(months)
      setSelectedYear(latestYear)
      setSelectedMonth(latestMonth)

      // Fetch other data with the detected year
      const [topResponse, breakdownResponse, filesResponse, statsResponse] = await Promise.all([
        axios.get(`/api/analytics/top-consumers?year=${latestYear}&limit=5`),
        axios.get(`/api/analytics/consumption-breakdown?year=${latestYear}`),
        axios.get('/api/files?limit=3'),
        axios.get('/api/dashboard/stats')
      ])

      setTopConsumers(topResponse.data.data || [])
      setBreakdown(breakdownResponse.data.data)

      const filesData = filesResponse.data.data || filesResponse.data || []
      setRecentFiles(Array.isArray(filesData) ? filesData.slice(0, 3) : [])

      const apiStats = statsResponse.data.data?.stats || statsResponse.data.data || statsResponse.data
      setFileStats({
        totalFiles: apiStats.total_files || apiStats.totalFiles || 0,
        completed: apiStats.completed_files || apiStats.filesByStatus?.completed || 0,
        errors: apiStats.error_files || apiStats.filesByStatus?.error || 0
      })

      setInitialized(true)
    } catch (error) {
      setError('שגיאה בטעינת נתוני הדשבורד')
      console.error('Dashboard error:', error)
    }
  }

  // Fetch data for a specific year (consumption includes all months)
  const fetchYearData = async (year) => {
    try {
      const consumptionResponse = await axios.get(`/api/analytics/consumption?year=${year}`)
      const data = consumptionResponse.data.data
      setConsumptionData(data)

      // Update available months for this year
      const months = data?.monthly?.filter(m => m.billing_year === year) || []
      setAvailableMonths(months)

      // Reset month to latest in this year if current month doesn't exist
      if (months.length > 0 && !months.find(m => m.billing_month === selectedMonth)) {
        const latestMonth = Math.max(...months.map(m => m.billing_month))
        setSelectedMonth(latestMonth)
      }

      // Fetch yearly breakdown and top consumers
      const [topResponse, breakdownResponse] = await Promise.all([
        axios.get(`/api/analytics/top-consumers?year=${year}&limit=5`),
        axios.get(`/api/analytics/consumption-breakdown?year=${year}`)
      ])

      setTopConsumers(topResponse.data.data || [])
      setBreakdown(breakdownResponse.data.data)
    } catch (error) {
      console.error('Year data fetch error:', error)
    }
  }

  // Fetch breakdown and top consumers filtered by view mode
  const fetchFilteredData = async () => {
    try {
      let topUrl = `/api/analytics/top-consumers?year=${selectedYear}&limit=5`
      let breakdownUrl = `/api/analytics/consumption-breakdown?year=${selectedYear}`

      // Add month filter only in monthly view
      if (viewMode === 'monthly' && selectedMonth) {
        topUrl += `&month=${selectedMonth}`
        breakdownUrl += `&month=${selectedMonth}`
      }

      const [topResponse, breakdownResponse] = await Promise.all([
        axios.get(topUrl),
        axios.get(breakdownUrl)
      ])

      setTopConsumers(topResponse.data.data || [])
      setBreakdown(breakdownResponse.data.data)
    } catch (error) {
      console.error('Filtered data fetch error:', error)
    }
  }

  const handleYearChange = (year) => {
    // Just update the year - the useEffect will handle fetching new data
    setSelectedYear(year)
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

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString('he-IL', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    })
  }

  const getStatusColor = (status) => {
    switch (status) {
      case 'completed': return 'var(--success)'
      case 'processing': return 'var(--warning)'
      case 'error': return 'var(--error)'
      default: return 'var(--text-secondary)'
    }
  }

  const getStatusText = (status) => {
    switch (status) {
      case 'completed': return 'הושלם'
      case 'processing': return 'בעיבוד'
      case 'error': return 'שגיאה'
      default: return 'לא ידוע'
    }
  }

  // Calculate display values based on view mode
  const getDisplayData = () => {
    if (!consumptionData) {
      return {
        totalCost: 0,
        totalConsumption: 0,
        activeSites: 0,
        avgCostPerKwh: 0,
        periodLabel: ''
      }
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

  // Show loading spinner until we have actual data with values
  const hasData = consumptionData && (
    (consumptionData.overall && parseFloat(consumptionData.overall.total_cost || 0) > 0) ||
    (consumptionData.monthly && consumptionData.monthly.length > 0)
  )

  if (!initialized || !consumptionData || !selectedYear || !hasData) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '60vh' }}>
        <div className="loading-spinner"></div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="nexus-card" style={{ background: 'rgba(255, 87, 87, 0.1)', borderRight: '4px solid var(--error)' }}>
        <p style={{ color: 'var(--error)' }}>{error}</p>
      </div>
    )
  }

  const displayData = getDisplayData()
  const monthlyChartData = consumptionData?.monthly?.filter(m => m.billing_year === selectedYear) || []
  const maxCost = Math.max(...monthlyChartData.map(m => parseFloat(m.total_cost) || 0), 1)

  // Peak/Off-peak ratio from breakdown
  const peakRatio = parseFloat(breakdown?.peakOffpeak?.peakRatio || 0)
  const offpeakRatio = 100 - peakRatio

  return (
    <div style={{ width: '100%' }}>
      {/* Page Header with View Toggle */}
      <div className="page-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: 16 }}>
        <div>
          <h1 className="page-title">דשבורד</h1>
          <p className="page-subtitle">ניתוח צריכת חשמל עירונית</p>
        </div>

        {/* Controls Row */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
          {/* View Mode Toggle */}
          <div style={{
            display: 'flex',
            background: 'var(--bg-default)',
            borderRadius: 8,
            padding: 4,
            border: '1px solid var(--border-light)'
          }}>
            <button
              onClick={() => setViewMode('yearly')}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 6,
                padding: '8px 16px',
                border: 'none',
                borderRadius: 6,
                cursor: 'pointer',
                fontSize: 14,
                fontWeight: 500,
                background: viewMode === 'yearly' ? 'var(--primary-main)' : 'transparent',
                color: viewMode === 'yearly' ? 'white' : 'var(--text-secondary)',
                transition: 'all 0.2s'
              }}
            >
              <CalendarMonth style={{ fontSize: 18 }} />
              שנתי
            </button>
            <button
              onClick={() => setViewMode('monthly')}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 6,
                padding: '8px 16px',
                border: 'none',
                borderRadius: 6,
                cursor: 'pointer',
                fontSize: 14,
                fontWeight: 500,
                background: viewMode === 'monthly' ? 'var(--primary-main)' : 'transparent',
                color: viewMode === 'monthly' ? 'white' : 'var(--text-secondary)',
                transition: 'all 0.2s'
              }}
            >
              <CalendarToday style={{ fontSize: 18 }} />
              חודשי
            </button>
          </div>

          {/* Year Selector */}
          <select
            value={selectedYear || ''}
            onChange={(e) => handleYearChange(parseInt(e.target.value))}
            style={{
              padding: '10px 16px',
              borderRadius: 8,
              border: '1px solid var(--border-light)',
              background: 'var(--bg-paper)',
              fontSize: 14,
              cursor: 'pointer',
              minWidth: 100
            }}
          >
            {(consumptionData?.availableYears || [2025, 2024]).map(year => (
              <option key={year} value={year}>{year}</option>
            ))}
          </select>

          {/* Month Selector (only in monthly view) */}
          {viewMode === 'monthly' && (
            <select
              value={selectedMonth || ''}
              onChange={(e) => setSelectedMonth(parseInt(e.target.value))}
              style={{
                padding: '10px 16px',
                borderRadius: 8,
                border: '1px solid var(--border-light)',
                background: 'var(--bg-paper)',
                fontSize: 14,
                cursor: 'pointer',
                minWidth: 120
              }}
            >
              {availableMonths.map(m => (
                <option key={m.billing_month} value={m.billing_month}>
                  {hebrewMonths[m.billing_month - 1]}
                </option>
              ))}
            </select>
          )}
        </div>
      </div>

      {/* Period Indicator */}
      <div style={{
        background: 'linear-gradient(135deg, var(--primary-main) 0%, var(--primary-dark) 100%)',
        color: 'white',
        padding: '16px 24px',
        borderRadius: 12,
        marginBottom: 24,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          {viewMode === 'yearly' ? (
            <CalendarMonth style={{ fontSize: 28 }} />
          ) : (
            <CalendarToday style={{ fontSize: 28 }} />
          )}
          <div>
            <div style={{ fontSize: 13, opacity: 0.9 }}>
              {viewMode === 'yearly' ? 'סיכום שנתי' : 'סיכום חודשי'}
            </div>
            <div style={{ fontSize: 22, fontWeight: 700 }}>
              {displayData.periodLabel}
            </div>
          </div>
        </div>
        <div style={{ textAlign: 'left' }}>
          <div style={{ fontSize: 12, opacity: 0.8 }}>סה״כ עלות</div>
          <div style={{ fontSize: 28, fontWeight: 700 }}>{formatCurrency(displayData.totalCost)}</div>
        </div>
      </div>

      {/* KPI Cards Grid */}
      <div className="kpi-grid">
        <KPICard
          label={viewMode === 'yearly' ? 'סה"כ עלות שנתית' : 'עלות חודשית'}
          value={displayData.totalCost}
          format="currency"
          icon={AttachMoney}
          color="primary"
        />
        <KPICard
          label={viewMode === 'yearly' ? 'צריכה שנתית (kWh)' : 'צריכה חודשית (kWh)'}
          value={displayData.totalConsumption}
          format="number"
          icon={Bolt}
          color="warning"
        />
        <KPICard
          label="אתרים פעילים"
          value={displayData.activeSites}
          format="number"
          icon={LocationOn}
          color="success"
        />
        <KPICard
          label={'מחיר ממוצע ל-kWh'}
          value={displayData.avgCostPerKwh}
          format="currency"
          icon={TrendingUp}
          color="teal"
        />
      </div>

      {/* Charts Row */}
      <div className="chart-grid">
        {/* Monthly Cost Trend Chart (only meaningful in yearly view) */}
        <div className="chart-container">
          <div className="chart-header">
            <h3 className="chart-title">
              <BarChart style={{ fontSize: 20, marginLeft: 8, verticalAlign: 'middle', color: 'var(--primary-main)' }} />
              עלויות לפי חודש - {selectedYear}
            </h3>
          </div>

          <div style={{ height: 250, position: 'relative', marginTop: 24 }}>
            {monthlyChartData.length === 0 ? (
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%', color: 'var(--text-secondary)' }}>
                אין נתונים לשנה זו
              </div>
            ) : (
              <div style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-around', height: '100%' }}>
                {monthlyChartData.map((month) => {
                  const heightPercent = (parseFloat(month.total_cost) / maxCost) * 100
                  const isSelected = viewMode === 'monthly' && month.billing_month === selectedMonth
                  return (
                    <div
                      key={month.billing_period}
                      style={{ flex: 1, marginRight: 4, textAlign: 'center', cursor: 'pointer' }}
                      onClick={() => {
                        setViewMode('monthly')
                        setSelectedMonth(month.billing_month)
                      }}
                    >
                      <div
                        title={`${hebrewMonths[month.billing_month - 1]}: ${formatCurrency(month.total_cost)}`}
                        style={{
                          height: `${Math.max(heightPercent, 5)}%`,
                          background: isSelected
                            ? 'linear-gradient(180deg, var(--warning) 0%, var(--warning-dark, #ed6c02) 100%)'
                            : 'linear-gradient(180deg, var(--primary-light) 0%, var(--primary-main) 100%)',
                          borderRadius: '6px 6px 0 0',
                          transition: 'all 0.3s ease',
                          minHeight: 10,
                          boxShadow: isSelected ? '0 0 0 3px var(--warning-light, rgba(237, 108, 2, 0.3))' : 'none'
                        }}
                      />
                      <div style={{
                        marginTop: 8,
                        fontSize: 10,
                        color: isSelected ? 'var(--warning)' : 'var(--text-secondary)',
                        fontWeight: isSelected ? 600 : 400
                      }}>
                        {hebrewMonths[month.billing_month - 1]?.slice(0, 3)}
                      </div>
                      <div style={{ fontSize: 9, color: 'var(--text-disabled)' }}>
                        {formatCurrency(month.total_cost).replace('₪', '')}
                      </div>
                    </div>
                  )
                })}
              </div>
            )}
          </div>
        </div>

        {/* Peak vs Off-Peak Distribution */}
        <div className="chart-container">
          <div className="chart-header">
            <h3 className="chart-title">
              <PieChart style={{ fontSize: 20, marginLeft: 8, verticalAlign: 'middle', color: 'var(--accent-teal)' }} />
              התפלגות צריכה - {displayData.periodLabel}
            </h3>
          </div>

          <div style={{ height: 250, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <div style={{ position: 'relative', width: 160, height: 160 }}>
              <svg viewBox="0 0 42 42" style={{ transform: 'rotate(-90deg)' }}>
                <circle cx="21" cy="21" r="15.915" fill="transparent" stroke="var(--bg-default)" strokeWidth="4" />
                <circle cx="21" cy="21" r="15.915" fill="transparent" stroke="var(--error)" strokeWidth="4"
                  strokeDasharray={`${peakRatio} ${100 - peakRatio}`}
                  strokeLinecap="round" />
                <circle cx="21" cy="21" r="15.915" fill="transparent" stroke="var(--success)" strokeWidth="4"
                  strokeDasharray={`${offpeakRatio} ${100 - offpeakRatio}`}
                  strokeDashoffset={`-${peakRatio}`}
                  strokeLinecap="round" />
              </svg>
              <div style={{
                position: 'absolute',
                top: '50%',
                left: '50%',
                transform: 'translate(-50%, -50%)',
                textAlign: 'center'
              }}>
                <div style={{ fontSize: 18, fontWeight: 700, color: 'var(--text-primary)' }}>
                  {formatNumber(displayData.totalConsumption)}
                </div>
                <div style={{ fontSize: 10, color: 'var(--text-secondary)' }}>kWh</div>
              </div>
            </div>

            <div style={{ marginRight: 24 }}>
              <div style={{ display: 'flex', alignItems: 'center', marginBottom: 16 }}>
                <div style={{ width: 14, height: 14, borderRadius: '50%', background: 'var(--error)', marginLeft: 10 }} />
                <div>
                  <div style={{ fontSize: 13, color: 'var(--text-secondary)' }}>שעות שיא</div>
                  <div style={{ fontSize: 16, fontWeight: 600, color: 'var(--error)' }}>{peakRatio.toFixed(1)}%</div>
                </div>
              </div>
              <div style={{ display: 'flex', alignItems: 'center' }}>
                <div style={{ width: 14, height: 14, borderRadius: '50%', background: 'var(--success)', marginLeft: 10 }} />
                <div>
                  <div style={{ fontSize: 13, color: 'var(--text-secondary)' }}>שעות שפל</div>
                  <div style={{ fontSize: 16, fontWeight: 600, color: 'var(--success)' }}>{offpeakRatio.toFixed(1)}%</div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Top Consumers & Tariff Breakdown Row */}
      <div className="chart-grid">
        {/* Top 5 Consumers */}
        <div className="chart-container">
          <div className="chart-header">
            <h3 className="chart-title">
              <TrendingUp style={{ fontSize: 20, marginLeft: 8, verticalAlign: 'middle', color: 'var(--warning)' }} />
              5 צרכנים גדולים - {displayData.periodLabel}
            </h3>
          </div>

          <div style={{ marginTop: 16 }}>
            {topConsumers.length === 0 ? (
              <div style={{ textAlign: 'center', padding: 40, color: 'var(--text-secondary)' }}>
                אין נתונים
              </div>
            ) : (
              topConsumers.map((consumer, index) => {
                const maxConsumerCost = Math.max(...topConsumers.map(c => parseFloat(c.total_cost) || 0))
                const widthPercent = (parseFloat(consumer.total_cost) / maxConsumerCost) * 100
                return (
                  <div key={consumer.site_id || index} style={{ marginBottom: 12 }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                      <span style={{ fontSize: 12, color: 'var(--text-primary)', maxWidth: '60%', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {index + 1}. {consumer.site_name?.split('-').pop()?.trim() || consumer.site_name}
                      </span>
                      <span style={{ fontSize: 12, fontWeight: 600 }}>{formatCurrency(consumer.total_cost)}</span>
                    </div>
                    <div style={{ height: 6, background: 'var(--bg-default)', borderRadius: 3, overflow: 'hidden' }}>
                      <div style={{
                        width: `${widthPercent}%`,
                        height: '100%',
                        background: `linear-gradient(90deg, var(--primary-main), var(--primary-light))`,
                        borderRadius: 3,
                        transition: 'width 0.5s ease'
                      }} />
                    </div>
                    <div style={{ fontSize: 10, color: 'var(--text-secondary)', marginTop: 2 }}>
                      {consumer.tariff_type} | {formatNumber(consumer.total_consumption)} kWh
                    </div>
                  </div>
                )
              })
            )}
          </div>
        </div>

        {/* Tariff Distribution */}
        <div className="chart-container">
          <div className="chart-header">
            <h3 className="chart-title">
              <ElectricBolt style={{ fontSize: 20, marginLeft: 8, verticalAlign: 'middle', color: 'var(--secondary-main)' }} />
              עלויות לפי סוג תעריף
            </h3>
          </div>

          <div style={{ marginTop: 16 }}>
            {!breakdown?.byTariff?.length ? (
              <div style={{ textAlign: 'center', padding: 40, color: 'var(--text-secondary)' }}>
                אין נתונים
              </div>
            ) : (
              breakdown.byTariff.map((tariff, index) => {
                const colors = ['var(--primary-main)', 'var(--success)', 'var(--warning)', 'var(--error)', 'var(--accent-teal)']
                const totalTariffCost = breakdown.byTariff.reduce((sum, t) => sum + parseFloat(t.total_cost || 0), 0)
                const percent = totalTariffCost > 0 ? (parseFloat(tariff.total_cost) / totalTariffCost * 100).toFixed(1) : 0
                return (
                  <div key={tariff.tariff_type} style={{ display: 'flex', alignItems: 'center', marginBottom: 14 }}>
                    <div style={{ width: 10, height: 10, borderRadius: '50%', background: colors[index % colors.length], marginLeft: 10 }} />
                    <div style={{ flex: 1 }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                        <span style={{ fontSize: 13 }}>{tariff.tariff_type}</span>
                        <span style={{ fontSize: 13, fontWeight: 600 }}>{formatCurrency(tariff.total_cost)}</span>
                      </div>
                      <div style={{ fontSize: 11, color: 'var(--text-secondary)' }}>
                        {tariff.site_count} אתרים | {percent}%
                      </div>
                    </div>
                  </div>
                )
              })
            )}
          </div>
        </div>
      </div>

      {/* Savings & Recent Files Row */}
      <div className="chart-grid">
        {/* Discount Savings Card */}
        <div className="chart-container" style={{ background: 'linear-gradient(135deg, var(--success) 0%, #2e7d32 100%)', color: 'white' }}>
          <div className="chart-header">
            <h3 className="chart-title" style={{ color: 'white' }}>
              <Savings style={{ fontSize: 20, marginLeft: 8, verticalAlign: 'middle' }} />
              חיסכון מהנחות - {displayData.periodLabel}
            </h3>
          </div>

          <div style={{ marginTop: 24, textAlign: 'center' }}>
            <div style={{ fontSize: 36, fontWeight: 700 }}>
              {formatCurrency(breakdown?.costComponents?.total_discount || 0)}
            </div>
            <div style={{ fontSize: 14, opacity: 0.9, marginTop: 8 }}>
              נחסך מהנחות {viewMode === 'yearly' ? `בשנת ${selectedYear}` : `ב${hebrewMonths[selectedMonth - 1]} ${selectedYear}`}
            </div>
            <div style={{ marginTop: 24, display: 'flex', justifyContent: 'space-around' }}>
              <div>
                <div style={{ fontSize: 18, fontWeight: 600 }}>{formatCurrency(breakdown?.costComponents?.kva_cost || 0)}</div>
                <div style={{ fontSize: 11, opacity: 0.8 }}>עלות KVA</div>
              </div>
              <div>
                <div style={{ fontSize: 18, fontWeight: 600 }}>{formatCurrency(breakdown?.costComponents?.distribution_cost || 0)}</div>
                <div style={{ fontSize: 11, opacity: 0.8 }}>חלוקה</div>
              </div>
              <div>
                <div style={{ fontSize: 18, fontWeight: 600 }}>{formatCurrency(breakdown?.costComponents?.supply_cost || 0)}</div>
                <div style={{ fontSize: 11, opacity: 0.8 }}>אספקה</div>
              </div>
            </div>
          </div>
        </div>

        {/* Recent Uploads - Minimal */}
        <div className="chart-container">
          <div className="chart-header">
            <h3 className="chart-title">
              <CloudUpload style={{ fontSize: 20, marginLeft: 8, verticalAlign: 'middle', color: 'var(--text-secondary)' }} />
              העלאות אחרונות
            </h3>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
              <span style={{ fontSize: 12, color: 'var(--text-secondary)' }}>
                {fileStats?.totalFiles || 0} קבצים
              </span>
              {fileStats?.errors > 0 && (
                <span style={{ display: 'flex', alignItems: 'center', fontSize: 12, color: 'var(--error)' }}>
                  <Warning style={{ fontSize: 14, marginLeft: 4 }} />
                  {fileStats.errors} שגיאות
                </span>
              )}
            </div>
          </div>

          <div style={{ marginTop: 16 }}>
            {recentFiles.length === 0 ? (
              <div style={{ textAlign: 'center', padding: 30, color: 'var(--text-secondary)' }}>
                <CloudUpload style={{ fontSize: 40, opacity: 0.3 }} />
                <p style={{ marginTop: 8 }}>לא נמצאו קבצים</p>
              </div>
            ) : (
              recentFiles.map((file) => (
                <div key={file.id} style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  padding: '10px 0',
                  borderBottom: '1px solid var(--border-light)'
                }}>
                  <div>
                    <div style={{ fontSize: 13, fontWeight: 500 }}>
                      {file.standardized_name || file.original_filename}
                    </div>
                    <div style={{ fontSize: 11, color: 'var(--text-secondary)' }}>
                      {formatDate(file.upload_time)}
                    </div>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                    <span style={{ fontSize: 13, fontWeight: 600 }}>
                      {file.csv_total ? formatCurrency(file.csv_total) : '-'}
                    </span>
                    <span style={{
                      padding: '2px 8px',
                      borderRadius: 6,
                      fontSize: 11,
                      fontWeight: 600,
                      background: `${getStatusColor(file.processing_status)}15`,
                      color: getStatusColor(file.processing_status)
                    }}>
                      {getStatusText(file.processing_status)}
                    </span>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  )
}

export default NexusDashboard
