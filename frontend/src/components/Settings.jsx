import React, { useState } from 'react'
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  Button,
  Box,
  Typography,
  IconButton,
  Alert,
  Divider,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Switch,
  FormControlLabel
} from '@mui/material'
import { Close, Save, Key, Language, Notifications } from '@mui/icons-material'
import { useAuth } from '../contexts/AuthContext'
import axios from 'axios'

function Settings({ open, onClose }) {
  const { user } = useAuth()
  const [activeTab, setActiveTab] = useState('profile')
  const [loading, setLoading] = useState(false)
  const [message, setMessage] = useState({ type: '', text: '' })
  
  // Profile settings
  const [profileData, setProfileData] = useState({
    username: user?.username || '',
    email: user?.email || ''
  })
  
  // Password change
  const [passwordData, setPasswordData] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: ''
  })
  
  // Preferences
  const [preferences, setPreferences] = useState({
    language: 'he',
    notifications: true,
    autoSave: true
  })

  const handleProfileUpdate = async () => {
    setLoading(true)
    try {
      const response = await axios.put('/api/user/profile', profileData)
      setMessage({ type: 'success', text: 'הפרופיל עודכן בהצלחה' })
      setTimeout(() => setMessage({ type: '', text: '' }), 3000)
    } catch (error) {
      setMessage({ type: 'error', text: error.response?.data?.message || 'שגיאה בעדכון הפרופיל' })
    }
    setLoading(false)
  }

  const handlePasswordChange = async () => {
    if (passwordData.newPassword !== passwordData.confirmPassword) {
      setMessage({ type: 'error', text: 'הסיסמאות אינן תואמות' })
      return
    }
    
    if (passwordData.newPassword.length < 6) {
      setMessage({ type: 'error', text: 'הסיסמה חייבת להכיל לפחות 6 תווים' })
      return
    }
    
    setLoading(true)
    try {
      const response = await axios.put('/api/user/password', {
        currentPassword: passwordData.currentPassword,
        newPassword: passwordData.newPassword
      })
      setMessage({ type: 'success', text: 'הסיסמה שונתה בהצלחה' })
      setPasswordData({ currentPassword: '', newPassword: '', confirmPassword: '' })
      setTimeout(() => setMessage({ type: '', text: '' }), 3000)
    } catch (error) {
      setMessage({ type: 'error', text: error.response?.data?.message || 'שגיאה בשינוי הסיסמה' })
    }
    setLoading(false)
  }

  const handlePreferencesUpdate = async () => {
    setLoading(true)
    try {
      const response = await axios.put('/api/user/preferences', preferences)
      setMessage({ type: 'success', text: 'ההעדפות עודכנו בהצלחה' })
      setTimeout(() => setMessage({ type: '', text: '' }), 3000)
    } catch (error) {
      setMessage({ type: 'error', text: error.response?.data?.message || 'שגיאה בעדכון ההעדפות' })
    }
    setLoading(false)
  }

  const tabs = [
    { id: 'profile', label: 'פרופיל', icon: null },
    { id: 'password', label: 'סיסמה', icon: <Key /> },
    { id: 'preferences', label: 'העדפות', icon: <Language /> }
  ]

  return (
    <Dialog
      open={open}
      onClose={onClose}
      maxWidth="sm"
      fullWidth
      PaperProps={{
        sx: {
          borderRadius: 3,
          minHeight: 500,
          direction: 'rtl'
        }
      }}
    >
      <DialogTitle sx={{ pb: 1 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <Typography variant="h6">הגדרות</Typography>
          <IconButton onClick={onClose} size="small">
            <Close />
          </IconButton>
        </Box>
      </DialogTitle>
      
      <Box sx={{ borderBottom: 1, borderColor: 'divider', px: 3 }}>
        <Box sx={{ display: 'flex', gap: 2 }}>
          {tabs.map(tab => (
            <Button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              startIcon={tab.icon}
              sx={{
                color: activeTab === tab.id ? 'primary.main' : 'text.secondary',
                borderBottom: activeTab === tab.id ? 2 : 0,
                borderColor: 'primary.main',
                borderRadius: 0,
                pb: 1,
                px: 2
              }}
            >
              {tab.label}
            </Button>
          ))}
        </Box>
      </Box>
      
      <DialogContent sx={{ mt: 2 }}>
        {message.text && (
          <Alert severity={message.type} sx={{ mb: 2 }}>
            {message.text}
          </Alert>
        )}
        
        {activeTab === 'profile' && (
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
            <TextField
              label="שם משתמש"
              value={profileData.username}
              onChange={(e) => setProfileData({ ...profileData, username: e.target.value })}
              fullWidth
              disabled
              sx={{ direction: 'rtl' }}
              InputLabelProps={{
                sx: { 
                  right: 14,
                  left: 'auto',
                  transformOrigin: 'top right'
                }
              }}
            />
            <TextField
              label="דוא״ל"
              type="email"
              value={profileData.email}
              onChange={(e) => setProfileData({ ...profileData, email: e.target.value })}
              fullWidth
              placeholder="example@domain.com"
              sx={{ direction: 'rtl' }}
              InputProps={{
                sx: { direction: 'ltr' }
              }}
              InputLabelProps={{
                sx: { 
                  right: 14,
                  left: 'auto',
                  transformOrigin: 'top right'
                }
              }}
            />
            <Typography variant="caption" color="text.secondary">
              * שם המשתמש אינו ניתן לשינוי
            </Typography>
          </Box>
        )}
        
        {activeTab === 'password' && (
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
            <TextField
              label="סיסמה נוכחית"
              type="password"
              value={passwordData.currentPassword}
              onChange={(e) => setPasswordData({ ...passwordData, currentPassword: e.target.value })}
              fullWidth
              sx={{ direction: 'rtl' }}
              InputProps={{
                sx: { direction: 'ltr' }
              }}
              InputLabelProps={{
                sx: { 
                  right: 14,
                  left: 'auto',
                  transformOrigin: 'top right'
                }
              }}
            />
            <TextField
              label="סיסמה חדשה"
              type="password"
              value={passwordData.newPassword}
              onChange={(e) => setPasswordData({ ...passwordData, newPassword: e.target.value })}
              fullWidth
              helperText="לפחות 6 תווים"
              sx={{ direction: 'rtl' }}
              InputProps={{
                sx: { direction: 'ltr' }
              }}
              InputLabelProps={{
                sx: { 
                  right: 14,
                  left: 'auto',
                  transformOrigin: 'top right'
                }
              }}
              FormHelperTextProps={{
                sx: { textAlign: 'right' }
              }}
            />
            <TextField
              label="אימות סיסמה חדשה"
              type="password"
              value={passwordData.confirmPassword}
              onChange={(e) => setPasswordData({ ...passwordData, confirmPassword: e.target.value })}
              fullWidth
              sx={{ direction: 'rtl' }}
              InputProps={{
                sx: { direction: 'ltr' }
              }}
              InputLabelProps={{
                sx: { 
                  right: 14,
                  left: 'auto',
                  transformOrigin: 'top right'
                }
              }}
            />
          </Box>
        )}
        
        {activeTab === 'preferences' && (
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
            <FormControl fullWidth>
              <InputLabel>שפה</InputLabel>
              <Select
                value={preferences.language}
                label="שפה"
                onChange={(e) => setPreferences({ ...preferences, language: e.target.value })}
              >
                <MenuItem value="he">עברית</MenuItem>
                <MenuItem value="en">English</MenuItem>
              </Select>
            </FormControl>
            
            <FormControlLabel
              control={
                <Switch
                  checked={preferences.notifications}
                  onChange={(e) => setPreferences({ ...preferences, notifications: e.target.checked })}
                />
              }
              label="התראות"
            />
            
            <FormControlLabel
              control={
                <Switch
                  checked={preferences.autoSave}
                  onChange={(e) => setPreferences({ ...preferences, autoSave: e.target.checked })}
                />
              }
              label="שמירה אוטומטית"
            />
          </Box>
        )}
      </DialogContent>
      
      <DialogActions sx={{ px: 3, pb: 3 }}>
        <Button onClick={onClose} variant="outlined">
          ביטול
        </Button>
        <Button
          onClick={() => {
            if (activeTab === 'profile') handleProfileUpdate()
            else if (activeTab === 'password') handlePasswordChange()
            else if (activeTab === 'preferences') handlePreferencesUpdate()
          }}
          variant="contained"
          disabled={loading}
          startIcon={<Save />}
        >
          שמור שינויים
        </Button>
      </DialogActions>
    </Dialog>
  )
}

export default Settings