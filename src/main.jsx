import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.jsx'

// No StrictMode on purpose: canvas game loops don't like the dev double-mount.
createRoot(document.getElementById('root')).render(<App />)
