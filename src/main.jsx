import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App.jsx'
import TvFrame from './components/TvFrame.jsx'
import './index.css'

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <TvFrame>
      <App />
    </TvFrame>
  </React.StrictMode>
)
