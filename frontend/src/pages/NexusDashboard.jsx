import React, { useState, useEffect } from 'react'
import axios from 'axios'
import KPICard from '../components/KPICard'
import {
  ElectricBolt,
  TrendingUp,
  Description,
  CheckCircle,
  Schedule,
  AttachMoney,
  ShowChart,
  BarChart,
  PieChart,
  Timeline
} from '@mui/icons-material'

function NexusDashboard() {
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

      setStats(statsResponse.data.data || statsResponse.data)
      const filesData = filesResponse.data.data || filesResponse.data || []
      setRecentFiles(Array.isArray(filesData) ? filesData.slice(0, 5) : [])
    } catch (error) {
      setError('שגיאה בטעינת נתוני הדשבורד')
      console.error('Dashboard error:', error)
    } finally {
      setLoading(false)
    }
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
        return 'var(--success)'
      case 'processing':
        return 'var(--warning)'
      case 'error':
        return 'var(--error)'
      default:
        return 'var(--text-secondary)'
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

  // Calculate trends (mock data for demo)
  const totalTrend = stats?.totalFiles > 10 ? 'up' : stats?.totalFiles > 5 ? 'neutral' : 'down'
  const totalTrendValue = '+15.8%'
  const completedTrend = stats?.filesByStatus?.completed > 5 ? 'up' : 'down'
  const completedTrendValue = '+34.0%'
  const amountTrend = stats?.totalAmount > 100000 ? 'up' : 'down'
  const amountTrendValue = '+24.2%'
  const successRate = stats?.totalFiles ? Math.round((stats?.filesByStatus?.completed / stats?.totalFiles) * 100) : 0
  const successTrend = successRate > 80 ? 'up' : successRate > 60 ? 'neutral' : 'down'
  const successTrendValue = '+3.5%'

  return (
    <div style={{ width: '100%' }}>
      {/* Page Header */}
      <div className="page-header">
        <h1 className="page-title">דשבורד</h1>
        <p className="page-subtitle">סקירה כללית של נתוני החשבונות</p>
      </div>
      
      {/* KPI Cards Grid */}
      <div className="kpi-grid">
        <KPICard
          label={'סה"כ קבצים'}
          value={stats?.totalFiles || 0}
          trend={totalTrend}
          trendValue={totalTrendValue}
          icon={Description}
          color="primary"
        />
        <KPICard
          label="קבצים שהושלמו"
          value={stats?.filesByStatus?.completed || 0}
          trend={completedTrend}
          trendValue={completedTrendValue}
          icon={CheckCircle}
          color="success"
        />
        <KPICard
          label={'סה"כ סכום'}
          value={stats?.totalAmount || 0}
          format="currency"
          trend={amountTrend}
          trendValue={amountTrendValue}
          icon={AttachMoney}
          color="teal"
        />
        <KPICard
          label="אחוז הצלחה"
          value={successRate}
          format="percent"
          trend={successTrend}
          trendValue={successTrendValue}
          icon={TrendingUp}
          color="secondary"
        />
      </div>

      {/* Charts Row */}
      <div className="chart-grid">
        {/* Sales Overview Chart */}
        <div className="chart-container">
          <div className="chart-header">
            <h3 className="chart-title">
              <BarChart style={{ fontSize: 20, marginLeft: 8, verticalAlign: 'middle', color: 'var(--primary-main)' }} />
              סקירת עיבודים
            </h3>
            <div className="chart-actions">
              <button className="btn-secondary" style={{ padding: '6px 12px', fontSize: 12 }}>סינון</button>
              <button className="btn-secondary" style={{ padding: '6px 12px', fontSize: 12 }}>מיון</button>
            </div>
          </div>
          
          {/* Mock Chart - Replace with actual chart library */}
          <div style={{ height: 250, position: 'relative', marginTop: 24 }}>
            <div style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-around', height: '100%' }}>
              {[65, 85, 45, 95, 75, 60, 90].map((height, index) => (
                <div key={index} style={{ flex: 1, marginRight: 8 }}>
                  <div style={{
                    height: `${height}%`,
                    background: `linear-gradient(180deg, var(--primary-light) 0%, var(--primary-main) 100%)`,
                    borderRadius: '8px 8px 0 0',
                    opacity: 0.8 + (index * 0.03),
                    transition: 'all 0.3s ease',
                    cursor: 'pointer'
                  }}
                  onMouseEnter={(e) => {
                    e.target.style.transform = 'scaleY(1.05)'
                    e.target.style.opacity = '1'
                  }}
                  onMouseLeave={(e) => {
                    e.target.style.transform = 'scaleY(1)'
                    e.target.style.opacity = 0.8 + (index * 0.03)
                  }}
                  />
                  <div style={{ textAlign: 'center', marginTop: 8, fontSize: 11, color: 'var(--text-secondary)' }}>
                    {['ינו', 'פבר', 'מרץ', 'אפר', 'מאי', 'יונ', 'יול'][index]}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Distribution Chart */}
        <div className="chart-container">
          <div className="chart-header">
            <h3 className="chart-title">
              <PieChart style={{ fontSize: 20, marginLeft: 8, verticalAlign: 'middle', color: 'var(--accent-teal)' }} />
              התפלגות סטטוסים
            </h3>
          </div>
          
          {/* Mock Donut Chart */}
          <div style={{ height: 250, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <div style={{ position: 'relative', width: 180, height: 180 }}>
              <svg viewBox="0 0 42 42" style={{ transform: 'rotate(-90deg)' }}>
                <circle cx="21" cy="21" r="15.915" fill="transparent" stroke="var(--bg-default)" strokeWidth="3" />
                <circle cx="21" cy="21" r="15.915" fill="transparent" stroke="var(--success)" strokeWidth="3"
                  strokeDasharray={`${(stats?.filesByStatus?.completed || 0) / (stats?.totalFiles || 1) * 100} ${100}`}
                  strokeLinecap="round" />
                <circle cx="21" cy="21" r="15.915" fill="transparent" stroke="var(--warning)" strokeWidth="3"
                  strokeDasharray={`${(stats?.filesByStatus?.processing || 0) / (stats?.totalFiles || 1) * 100} ${100}`}
                  strokeDashoffset={`-${(stats?.filesByStatus?.completed || 0) / (stats?.totalFiles || 1) * 100}`}
                  strokeLinecap="round" />
                <circle cx="21" cy="21" r="15.915" fill="transparent" stroke="var(--error)" strokeWidth="3"
                  strokeDasharray={`${(stats?.filesByStatus?.error || 0) / (stats?.totalFiles || 1) * 100} ${100}`}
                  strokeDashoffset={`-${((stats?.filesByStatus?.completed || 0) + (stats?.filesByStatus?.processing || 0)) / (stats?.totalFiles || 1) * 100}`}
                  strokeLinecap="round" />
              </svg>
              <div style={{
                position: 'absolute',
                top: '50%',
                left: '50%',
                transform: 'translate(-50%, -50%)',
                textAlign: 'center'
              }}>
                <div style={{ fontSize: 28, fontWeight: 700, color: 'var(--text-primary)' }}>
                  {stats?.totalFiles || 0}
                </div>
                <div style={{ fontSize: 12, color: 'var(--text-secondary)' }}>{'סה"כ'}</div>
              </div>
            </div>
            
            <div style={{ marginRight: 32 }}>
              <div style={{ display: 'flex', alignItems: 'center', marginBottom: 12 }}>
                <div style={{ width: 12, height: 12, borderRadius: '50%', background: 'var(--success)', marginLeft: 8 }} />
                <span style={{ fontSize: 14, color: 'var(--text-secondary)' }}>הושלם</span>
                <span style={{ marginRight: 'auto', fontWeight: 600, fontSize: 14 }}>
                  {stats?.filesByStatus?.completed || 0}
                </span>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', marginBottom: 12 }}>
                <div style={{ width: 12, height: 12, borderRadius: '50%', background: 'var(--warning)', marginLeft: 8 }} />
                <span style={{ fontSize: 14, color: 'var(--text-secondary)' }}>בעיבוד</span>
                <span style={{ marginRight: 'auto', fontWeight: 600, fontSize: 14 }}>
                  {stats?.filesByStatus?.processing || 0}
                </span>
              </div>
              <div style={{ display: 'flex', alignItems: 'center' }}>
                <div style={{ width: 12, height: 12, borderRadius: '50%', background: 'var(--error)', marginLeft: 8 }} />
                <span style={{ fontSize: 14, color: 'var(--text-secondary)' }}>שגיאה</span>
                <span style={{ marginRight: 'auto', fontWeight: 600, fontSize: 14 }}>
                  {stats?.filesByStatus?.error || 0}
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Recent Files Table */}
      <div className="nexus-table">
        <div className="table-header">
          <h3 className="table-title">
            <Timeline style={{ fontSize: 20, marginLeft: 8, verticalAlign: 'middle', color: 'var(--secondary-main)' }} />
            קבצים אחרונים
          </h3>
          <button className="btn-primary" style={{ padding: '8px 16px', fontSize: 13 }}>
            צפה בכל
          </button>
        </div>
        
        {recentFiles.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '60px 20px' }}>
            <ElectricBolt style={{ fontSize: 60, color: 'var(--text-disabled)', marginBottom: 16 }} />
            <p style={{ color: 'var(--text-secondary)' }}>לא נמצאו קבצים</p>
          </div>
        ) : (
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ borderBottom: '1px solid var(--border-light)' }}>
                <th style={{ padding: '12px', textAlign: 'right', fontSize: 12, color: 'var(--text-secondary)', fontWeight: 600 }}>שם קובץ</th>
                <th style={{ padding: '12px', textAlign: 'right', fontSize: 12, color: 'var(--text-secondary)', fontWeight: 600 }}>סטטוס</th>
                <th style={{ padding: '12px', textAlign: 'right', fontSize: 12, color: 'var(--text-secondary)', fontWeight: 600 }}>תאריך העלאה</th>
                <th style={{ padding: '12px', textAlign: 'right', fontSize: 12, color: 'var(--text-secondary)', fontWeight: 600 }}>סכום CSV</th>
                <th style={{ padding: '12px', textAlign: 'right', fontSize: 12, color: 'var(--text-secondary)', fontWeight: 600 }}>פער</th>
              </tr>
            </thead>
            <tbody>
              {recentFiles.map((file) => (
                <tr key={file.id} style={{ borderBottom: '1px solid var(--border-light)', transition: 'background 0.2s' }}
                  onMouseEnter={(e) => e.currentTarget.style.background = 'var(--bg-default)'}
                  onMouseLeave={(e) => e.currentTarget.style.background = 'transparent'}>
                  <td style={{ padding: '16px 12px', fontSize: 14, fontWeight: 500 }}>{file.original_filename}</td>
                  <td style={{ padding: '16px 12px' }}>
                    <span style={{
                      display: 'inline-block',
                      padding: '4px 12px',
                      borderRadius: 8,
                      fontSize: 12,
                      fontWeight: 600,
                      background: `${getStatusColor(file.processing_status)}15`,
                      color: getStatusColor(file.processing_status)
                    }}>
                      {getStatusText(file.processing_status)}
                    </span>
                  </td>
                  <td style={{ padding: '16px 12px', fontSize: 13, color: 'var(--text-secondary)' }}>
                    {formatDate(file.upload_time)}
                  </td>
                  <td style={{ padding: '16px 12px', fontSize: 14, fontWeight: 600 }}>
                    {file.csv_total ? formatCurrency(file.csv_total) : '-'}
                  </td>
                  <td style={{ padding: '16px 12px' }}>
                    {file.gap_amount !== null && file.gap_amount !== undefined ? (
                      <span style={{
                        fontWeight: 600,
                        color: Math.abs(file.gap_amount) < 10 ? 'var(--success)' : 'var(--warning)'
                      }}>
                        {formatCurrency(file.gap_amount)}
                      </span>
                    ) : '-'}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  )
}

export default NexusDashboard