import React from 'react'
import { TrendingUp, TrendingDown, Remove } from '@mui/icons-material'

function KPICard({ 
  label, 
  value, 
  trend, 
  trendValue, 
  icon: Icon, 
  color = 'primary',
  format = 'number'
}) {
  const formatValue = (val) => {
    if (format === 'currency') {
      return `₪${val.toLocaleString('he-IL')}`
    } else if (format === 'percent') {
      return `${val}%`
    } else {
      return val.toLocaleString('he-IL')
    }
  }

  const getTrendIcon = () => {
    if (trend === 'up') return <TrendingUp style={{ fontSize: 16 }} />
    if (trend === 'down') return <TrendingDown style={{ fontSize: 16 }} />
    return <Remove style={{ fontSize: 16 }} />
  }

  const getTrendColor = () => {
    if (trend === 'up') return 'var(--success)'
    if (trend === 'down') return 'var(--error)'
    return 'var(--text-secondary)'
  }

  const getColorVar = () => {
    const colors = {
      primary: 'var(--primary-main)',
      secondary: 'var(--secondary-main)',
      success: 'var(--success)',
      error: 'var(--error)',
      warning: 'var(--warning)',
      teal: 'var(--accent-teal)'
    }
    return colors[color] || colors.primary
  }

  return (
    <div className="kpi-card fade-in">
      <div style={{ 
        display: 'flex', 
        justifyContent: 'space-between', 
        alignItems: 'flex-start',
        marginBottom: 12
      }}>
        <div>
          <div className="kpi-label">
            <span style={{ 
              display: 'inline-block',
              width: 8,
              height: 8,
              borderRadius: '50%',
              background: getColorVar(),
              marginLeft: 8,
              opacity: 0.8
            }} />
            {label}
          </div>
        </div>
        {Icon && (
          <div style={{
            width: 40,
            height: 40,
            borderRadius: 12,
            background: `linear-gradient(135deg, ${getColorVar()}15, ${getColorVar()}25)`,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center'
          }}>
            <Icon style={{ fontSize: 20, color: getColorVar() }} />
          </div>
        )}
      </div>
      
      <div className="kpi-value">
        {formatValue(value)}
      </div>
      
      {trendValue && (
        <div style={{ 
          display: 'flex', 
          alignItems: 'center', 
          gap: 6,
          marginTop: 8
        }}>
          <span 
            className={`kpi-trend ${trend === 'up' ? 'positive' : trend === 'down' ? 'negative' : ''}`}
            style={{ 
              display: 'flex', 
              alignItems: 'center', 
              gap: 4,
              color: getTrendColor()
            }}
          >
            {getTrendIcon()}
            <span>{trendValue}</span>
          </span>
          <span style={{ 
            fontSize: 12, 
            color: 'var(--text-disabled)' 
          }}>
            מהחודש שעבר
          </span>
        </div>
      )}
    </div>
  )
}

export default KPICard