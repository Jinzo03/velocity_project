import { useState , useEffect} from 'react'
import { MapContainer, TileLayer, Marker, Popup, Polyline, Circle } from 'react-leaflet'
import 'leaflet/dist/leaflet.css'
import {useMap, useMapEvents} from 'react-leaflet'
import L from 'leaflet'
import './App.css'

// Fix for broken default marker icons in Leaflet + React
import icon from'leaflet/dist/images/marker-icon.png';
import iconShadow from 'leaflet/dist/images/marker-shadow.png';

let DefaultIcon= L.icon({
  iconUrl: icon,
  shadowUrl: iconShadow,
  iconSize: [25,41],
  iconAnchor: [12,41]
});
L.Marker.prototype.options.icon=DefaultIcon;


function App() {
  const [history, setHistory] = useState([])
  const [aiReport, setAiReport] = useState("")
  const [isGenerating, setIsGenerating] = useState(false)
  const [liveStatus, setLiveStatus]= useState({distance_km: 0 , is_breached: false})
  const [isFollowing, setIsFollowing] = useState(true)

  // 1. Function to fetch data
  const fetchHistory = async() => {
    try {
      // fetch data from Python Backend
      const response = await fetch('http://127.0.0.1:8000/history')
      const data = await response.json()
      setHistory(data)
      console.log("Data fetched:", data)

      // Fetch the new math model results
      const statusRes = await fetch('http://127.0.0.1:8000/live-status')
      const statusData = await statusRes.json()
      setLiveStatus(statusData)

    } catch (error){
      console.error("Error fetching data:", error)
    }
  }

// 2. Fetch AI Report
  const generateReport = async () => {
    setIsGenerating(true)
    setAiReport("") // Clear old report
    try {
      // Calling Gemini endpoint!
      const response = await fetch('http://127.0.0.1:8000/generate-report/101')
      const data = await response.json()
      setAiReport(data.report)
    } catch (error) {
      console.error("Error:", error)
      setAiReport("Failed to contact the AI Dispatcher.")
    }
    setIsGenerating(false)
  }

  // Auto-refresh map data
  useEffect(() => {
    fetchHistory() 
    const interval = setInterval(fetchHistory, 1000) 
    return () => clearInterval(interval) 
  }, [])

  // Calculate Map Data
  const polylinePoints = history.map(pt => [pt.latitude, pt.longitude])
  const currentPos = history.length > 0 
    ? [history[history.length - 1].latitude, history[history.length - 1].longitude] 
    : [36.8065, 10.1815]

  function FollowMarker({position, isFollowing, stopFollowing}) {
    const map =useMap()

    // Detect user manual drag
    useMapEvents({
      dragstart() {
        stopFollowing()
      }
    })

    useEffect(() => {
      if (!isFollowing) return

      map.setView(position, map.getZoom(), {
        animate: true
      })
    }, [position, isFollowing, map])
    return null
  }
  
  return (
    <div className="dashboard-layout">
      
      {/* SIDEBAR NAVIGATION */}
      <div className="sidebar">
        <div className="brand">VeloCity</div>
        <div className="nav-item active">🌐 Live Telemetry</div>
        <div className="nav-item">📊 Fleet Analytics</div>
        <div className="nav-item">⚙️ Settings</div>
        
        <div style={{ marginTop: 'auto', color: 'var(--text-muted)', fontSize: '12px' }}>
          System Status: <span style={{ color: 'var(--success)' }}>Online</span>
        </div>
      </div>

      {/* MAIN CONTENT AREA */}
      <div className="main-content">
        
        {/* TOP KPI METRICS */}
        <div className="metrics-grid">
          <div className="metric-card">
            <span className="metric-label">Active Vehicle</span>
            <span className="metric-value">TRK-101</span>
          </div>
          <div className="metric-card">
            <span className="metric-label">Telemetry Packets</span>
            <span className="metric-value">{history.length}</span>
          </div>
          <div className="metric-card">
            <span className="metric-label">Distance from Hub</span>
            <span className="metric-value" style={{ color: liveStatus.is_breached ? 'var(--danger)' : 'var(--text-main)' }}>
              {liveStatus.distance_km.toFixed(2)} km
            </span>
          </div>
        </div>

        {/* DYNAMIC ALERT BANNER */}
        {liveStatus.is_breached && (
          <div className="alert-banner">
            CRITICAL: TRK-101 HAS BREACHED THE 2.0KM GEOFENCE PERIMETER. 
          </div>
        )}

        {/* WORKSPACE: MAP & AI */}
        <div className="workspace">
          
          {/* THE LEAFLET MAP WRAPPER */}
          <div style={{ flex: 2, display: 'flex', flexDirection: 'column', gap: '12px' }}>
            
            {/* Map Header with the Follow Toggle Button */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '0 4px' }}>
              <h2 style={{ margin: 0, fontSize: '16px', color: 'var(--text-muted)' }}> Live Tracking Map</h2>
              <button
                onClick={() => setIsFollowing(true)}
                style={{
                  padding: '6px 12px',
                  backgroundColor: isFollowing ? 'rgba(16, 185, 129, 0.15)' : 'transparent',
                  color: isFollowing ? 'var(--success)' : 'var(--text-muted)',
                  border: `1px solid ${isFollowing ? 'var(--success)' : 'var(--border)'}`,
                  borderRadius: '6px',
                  cursor: 'pointer',
                  fontSize: '13px',
                  fontWeight: '600',
                  transition: 'all 0.2s',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px'
                }}
              >
                {isFollowing ? ' Auto-Following' : '⛌ Recenter on Truck'}
              </button>
            </div>

            <div className="map-wrapper" style={{ flex: 1 }}>
              <MapContainer center={[36.8065, 10.1815]} zoom={14} scrollWheelZoom={true} style={{ height: '100%', width: '100%' }}>
                <TileLayer
                  attribution='&copy; OpenStreetMap'
                  url="https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png" 
                />
                
                {/*Component that controls map panning */}
                <FollowMarker 
                  position={currentPos} 
                  isFollowing={isFollowing} 
                  stopFollowing={() => setIsFollowing(false)} 
                />

                <Circle 
                  center={[36.8065, 10.1815]} 
                  radius={2000} 
                  pathOptions={{ 
                    color: liveStatus.is_breached ? '#ef4444' : '#10b981', 
                    fillColor: liveStatus.is_breached ? '#ef4444' : '#10b981', 
                    fillOpacity: 0.15 
                  }} 
                />
                <Marker position={currentPos}>
                  <Popup>TRK-101 Live Pos</Popup>
                </Marker>
                <Polyline positions={polylinePoints} color="#3b82f6" weight={4} opacity={0.8} />
              </MapContainer>
            </div>
          </div>

          {/* AI DISPATCHER PANEL */}
          <div className="ai-panel">
            <h2 style={{ margin: 0, fontSize: '18px', display: 'flex', alignItems: 'center', gap: '8px' }}>
              AI Dispatch Analytics
            </h2>
            <p style={{ color: 'var(--text-muted)', fontSize: '13px', margin: 0 }}>
              Powered by Gemini 2.5 Flash. Analyze telemetry history to generate compliance and performance reports.
            </p>
            
            <button 
              className="btn-primary" 
              onClick={generateReport} 
              disabled={isGenerating || history.length < 2}
            >
              {isGenerating ? ' Processing Telemetry...' : 'Generate Dispatch Report'}
            </button>

            {aiReport && (
              <div className="ai-report">
                {aiReport}
              </div>
            )}
          </div>

        </div>
      </div>
    </div>
  )
}

export default App