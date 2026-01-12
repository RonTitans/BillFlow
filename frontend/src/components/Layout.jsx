import React from 'react'
import { Outlet, useLocation, useNavigate } from 'react-router-dom'
import {
  AppBar,
  Box,
  CssBaseline,
  Drawer,
  IconButton,
  List,
  ListItem,
  ListItemButton,
  ListItemIcon,
  ListItemText,
  Toolbar,
  Typography,
  Avatar,
  Menu,
  MenuItem,
  Divider,
  Tooltip
} from '@mui/material'
import {
  Dashboard,
  Upload,
  History,
  Logout,
  ElectricBolt,
  Menu as MenuIcon,
  AccountCircle,
  Settings
} from '@mui/icons-material'
import { useAuth } from '../contexts/AuthContext'
import SettingsDialog from './Settings'

const drawerWidth = 280

const menuItems = [
  { text: 'דשבורד', path: '/dashboard', icon: Dashboard },
  { text: 'העלאת קבצים', path: '/upload', icon: Upload },
  { text: 'היסטוריה', path: '/history', icon: History },
]

function Layout() {
  const location = useLocation()
  const navigate = useNavigate()
  const { user, logout } = useAuth()
  const [mobileOpen, setMobileOpen] = React.useState(false)
  const [anchorEl, setAnchorEl] = React.useState(null)
  const [settingsOpen, setSettingsOpen] = React.useState(false)

  const handleDrawerToggle = () => {
    setMobileOpen(!mobileOpen)
  }

  const handleMenuClick = (event) => {
    setAnchorEl(event.currentTarget)
  }

  const handleMenuClose = () => {
    setAnchorEl(null)
  }

  const handleLogout = () => {
    logout()
    handleMenuClose()
    navigate('/login')
  }

  const drawer = (
    <Box>
      <Box
        sx={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          p: 3,
          backgroundColor: 'primary.main',
          color: 'white'
        }}
      >
        <ElectricBolt sx={{ fontSize: 40, ml: 1 }} />
        <Box>
          <Typography variant="h6" component="div" fontWeight="bold">
            מערכת ניהול חשבונות
          </Typography>
          <Typography variant="caption">
            עיריית ראשון לציון
          </Typography>
        </Box>
      </Box>

      <List sx={{ pt: 2 }}>
        {menuItems.map((item) => {
          const Icon = item.icon
          const isActive = location.pathname === item.path
          
          return (
            <ListItem key={item.path} disablePadding sx={{ px: 2, mb: 1 }}>
              <ListItemButton
                onClick={() => navigate(item.path)}
                sx={{
                  borderRadius: 2,
                  backgroundColor: isActive ? 'primary.main' : 'transparent',
                  color: isActive ? 'white' : 'text.primary',
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  px: 2,
                  '&:hover': {
                    backgroundColor: isActive ? 'primary.dark' : 'action.hover',
                  },
                  transition: 'all 0.3s ease',
                }}
              >
                <ListItemText
                  primary={item.text}
                  sx={{
                    textAlign: 'right',
                    flex: 'none',
                    '& .MuiListItemText-primary': {
                      fontWeight: isActive ? 'bold' : 'normal',
                    },
                  }}
                />
                <ListItemIcon
                  sx={{
                    color: isActive ? 'white' : 'primary.main',
                    minWidth: 'auto',
                    justifyContent: 'center',
                  }}
                >
                  <Icon />
                </ListItemIcon>
              </ListItemButton>
            </ListItem>
          )
        })}
      </List>
    </Box>
  )

  return (
    <Box sx={{ display: 'flex', minHeight: '100vh', backgroundColor: '#f8fafc' }}>
      <CssBaseline />
      
      {/* App Bar */}
      <AppBar
        position="fixed"
        sx={{
          backgroundColor: 'white',
          color: 'text.primary',
          boxShadow: '0 1px 3px rgba(0,0,0,0.12)',
          zIndex: (theme) => theme.zIndex.drawer + 1,
        }}
      >
        <Toolbar>
          <IconButton
            color="inherit"
            aria-label="open drawer"
            edge="start"
            onClick={handleDrawerToggle}
            sx={{ mr: 2, display: { sm: 'none' } }}
          >
            <MenuIcon />
          </IconButton>
          
          <Box sx={{ flexGrow: 1 }} />
          
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
            <Typography variant="body2" color="text.secondary">
              שלום, {user?.username}
            </Typography>
            
            <Tooltip title="תפריט משתמש">
              <IconButton
                onClick={handleMenuClick}
                size="small"
                sx={{ ml: 2 }}
              >
                <Avatar sx={{ width: 36, height: 36, backgroundColor: 'primary.main' }}>
                  <AccountCircle />
                </Avatar>
              </IconButton>
            </Tooltip>
            
            <Menu
              anchorEl={anchorEl}
              open={Boolean(anchorEl)}
              onClose={handleMenuClose}
              onClick={handleMenuClose}
              PaperProps={{
                elevation: 3,
                sx: {
                  overflow: 'visible',
                  filter: 'drop-shadow(0px 2px 8px rgba(0,0,0,0.32))',
                  mt: 1.5,
                  borderRadius: 2,
                  minWidth: 180,
                  '& .MuiMenuItem-root': {
                    py: 1,
                  }
                },
              }}
              transformOrigin={{ horizontal: 'right', vertical: 'top' }}
              anchorOrigin={{ horizontal: 'right', vertical: 'bottom' }}
            >
              <MenuItem 
                onClick={() => {
                  handleMenuClose()
                  setSettingsOpen(true)
                }}
                sx={{ 
                  display: 'flex', 
                  justifyContent: 'space-between',
                  alignItems: 'center'
                }}
              >
                <Typography>הגדרות</Typography>
                <Settings />
              </MenuItem>
              <Divider />
              <MenuItem 
                onClick={handleLogout} 
                sx={{ 
                  color: 'error.main',
                  display: 'flex',
                  justifyContent: 'space-between', 
                  alignItems: 'center'
                }}
              >
                <Typography>התנתק</Typography>
                <Logout />
              </MenuItem>
            </Menu>
          </Box>
        </Toolbar>
      </AppBar>

      {/* Main Content */}
      <Box
        component="main"
        sx={{
          flexGrow: 1,
          p: 3,
          mt: 8,
          mr: { sm: `${drawerWidth}px` },
          backgroundColor: '#f8fafc',
          minHeight: 'calc(100vh - 64px)',
        }}
      >
        <Outlet />
      </Box>

      {/* Navigation Drawer */}
      <Box
        component="nav"
        sx={{ 
          width: { sm: drawerWidth }, 
          flexShrink: { sm: 0 }
        }}
      >
        {/* Mobile drawer */}
        <Drawer
          variant="temporary"
          open={mobileOpen}
          onClose={handleDrawerToggle}
          ModalProps={{
            keepMounted: true,
          }}
          sx={{
            display: { xs: 'block', sm: 'none' },
            '& .MuiDrawer-paper': { 
              boxSizing: 'border-box', 
              width: drawerWidth,
            },
          }}
          anchor="right"
        >
          {drawer}
        </Drawer>
        
        {/* Desktop drawer */}
        <Drawer
          variant="permanent"
          sx={{
            display: { xs: 'none', sm: 'block' },
            '& .MuiDrawer-paper': { 
              boxSizing: 'border-box', 
              width: drawerWidth,
              borderRight: 'none',
              borderLeft: '1px solid #e0e0e0',
              boxShadow: '-2px 0 8px rgba(0,0,0,0.1)',
              position: 'fixed',
              right: 0,
              top: 64,
              height: 'calc(100vh - 64px)'
            },
          }}
          anchor="right"
          open
        >
          {drawer}
        </Drawer>
      </Box>
      
      {/* Settings Dialog */}
      <SettingsDialog 
        open={settingsOpen} 
        onClose={() => setSettingsOpen(false)} 
      />
    </Box>
  )
}

export default Layout