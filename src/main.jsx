import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import NetWorthDashboard from './Dashboard'

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <NetWorthDashboard />
  </StrictMode>
)