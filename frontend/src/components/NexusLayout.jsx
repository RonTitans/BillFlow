import React, { useState } from 'react'
import { Outlet, useLocation, useNavigate } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'
import SettingsDialog from './Settings'
import {
  Dashboard as DashboardIcon,
  CloudUpload as UploadIcon,
  History as HistoryIcon,
  Analytics as AnalyticsIcon,
  Settings as SettingsIcon,
  Logout as LogoutIcon,
  Person as PersonIcon,
  ElectricBolt
} from '@mui/icons-material'

function NexusLayout() {
  const location = useLocation()
  const navigate = useNavigate()
  const { user, logout } = useAuth()
  const [settingsOpen, setSettingsOpen] = useState(false)
  const [userMenuOpen, setUserMenuOpen] = useState(false)

  const handleLogout = () => {
    logout()
    navigate('/login')
  }

  const menuSections = [
    {
      title: 'כללי',
      items: [
        { text: 'דשבורד', path: '/dashboard', icon: DashboardIcon },
        { text: 'העלאת קבצים', path: '/upload', icon: UploadIcon },
        { text: 'היסטוריה', path: '/history', icon: HistoryIcon },
        { text: 'אנליטיקס', path: '/analytics', icon: AnalyticsIcon, badge: 'Beta' },
      ]
    },
    {
      title: 'תמיכה',
      items: [
        { text: 'הגדרות', path: '#', icon: SettingsIcon, onClick: () => setSettingsOpen(true) },
      ]
    }
  ]

  return (
    <div style={{ display: 'flex', minHeight: '100vh', background: 'var(--bg-default)' }}>
      {/* Nexus Sidebar */}
      <div className="nexus-sidebar">
        {/* Logo */}
        <div className="sidebar-logo">
          <div className="sidebar-logo-icon">
            <ElectricBolt style={{ fontSize: 20 }} />
          </div>
          <span className="gradient-text">ראשון לציון</span>
        </div>

        {/* Navigation */}
        <div className="sidebar-nav">
          {menuSections.map((section, index) => (
            <div key={index} className="sidebar-section">
              <div className="sidebar-section-title">{section.title}</div>
              {section.items.map((item) => {
                const Icon = item.icon
                const isActive = location.pathname === item.path
                
                return (
                  <div
                    key={item.path}
                    className={`sidebar-item ${isActive ? 'active' : ''}`}
                    onClick={() => {
                      if (item.onClick) {
                        item.onClick()
                      } else if (item.path !== '#') {
                        navigate(item.path)
                      }
                    }}
                  >
                    <div className="sidebar-item-icon">
                      <Icon style={{ fontSize: 20 }} />
                    </div>
                    <span>{item.text}</span>
                    {item.badge && (
                      <span className="sidebar-badge">{item.badge}</span>
                    )}
                  </div>
                )
              })}
            </div>
          ))}
        </div>

        {/* User Section */}
        <div style={{
          padding: '16px',
          borderTop: '1px solid var(--border-light)',
          marginTop: 'auto'
        }}>
          <div 
            className="sidebar-item"
            style={{ 
              background: 'var(--bg-default)',
              marginBottom: 8
            }}
            onClick={() => setUserMenuOpen(!userMenuOpen)}
          >
            <div className="sidebar-item-icon">
              <PersonIcon style={{ fontSize: 20 }} />
            </div>
            <div style={{ flex: 1 }}>
              <div style={{ fontWeight: 600, fontSize: 14 }}>{user?.username}</div>
              <div style={{ fontSize: 12, color: 'var(--text-secondary)' }}>מנהל מערכת</div>
            </div>
          </div>
          
          {userMenuOpen && (
            <div style={{
              background: 'white',
              borderRadius: 12,
              padding: 8,
              marginTop: 8,
              boxShadow: 'var(--shadow-md)'
            }}>
              <div 
                className="sidebar-item" 
                onClick={() => setSettingsOpen(true)}
                style={{ marginBottom: 4 }}
              >
                <SettingsIcon style={{ fontSize: 18, marginLeft: 8 }} />
                <span style={{ fontSize: 13 }}>הגדרות</span>
              </div>
              <div 
                className="sidebar-item" 
                onClick={handleLogout}
                style={{ color: 'var(--error)' }}
              >
                <LogoutIcon style={{ fontSize: 18, marginLeft: 8 }} />
                <span style={{ fontSize: 13 }}>התנתק</span>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Main Content */}
      <div className="main-content" style={{ flex: 1, marginRight: 260 }}>
        {/* Page Content */}
        <div className="fade-in">
          <Outlet />
        </div>
      </div>

      {/* Settings Dialog */}
      <SettingsDialog 
        open={settingsOpen} 
        onClose={() => setSettingsOpen(false)} 
      />
    </div>
  )
}

export default NexusLayout