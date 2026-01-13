import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { ToastProvider } from './components/Toast'
import { AuthProvider, useAuth } from './context/AuthContext'
import Navbar from './components/Navbar'
import Home from './pages/Home'
import Students from './pages/Students'
import Evaluate from './pages/Evaluate'
import Reports from './pages/Reports'
import Notes from './pages/Notes'
import Login from './pages/Login'

// Protected Route wrapper
function ProtectedRoute({ children }) {
    const { isAuthenticated, loading } = useAuth()

    if (loading) {
        return (
            <div style={{
                height: '100vh',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                background: '#1a1a1a',
                color: 'rgba(255,255,255,0.5)'
            }}>
                <div style={{ fontSize: '32px', marginBottom: '12px' }}>⏳</div>
                <div>Yükleniyor...</div>
            </div>
        )
    }

    if (!isAuthenticated) {
        return <Navigate to="/login" replace />
    }

    return children
}

// Main Layout (authenticated)
function MainLayout() {
    const { userProfile, logout } = useAuth()

    return (
        <div className="app-container">
            <header className="header" style={{ position: 'relative' }}>
                <h1>Talebe Keyfiyet</h1>
                <p className="header-subtitle">Keyfiyet Takip Sistemi</p>
                <div style={{
                    position: 'absolute',
                    right: '0',
                    top: '50%',
                    transform: 'translateY(-50%)',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '8px'
                }}>
                    <span style={{ fontSize: '12px', color: 'rgba(255,255,255,0.5)' }}>
                        {userProfile?.name}
                    </span>
                    <button
                        onClick={logout}
                        style={{
                            background: 'transparent',
                            border: '1px solid var(--bg-tertiary)',
                            color: 'var(--text-muted)',
                            padding: '6px 12px',
                            borderRadius: '8px',
                            cursor: 'pointer',
                            fontSize: '12px',
                            transition: 'all 0.2s ease'
                        }}
                        title="Çıkış Yap"
                    >
                        Çıkış
                    </button>
                </div>
            </header>

            <main className="main-content">
                <Routes>
                    <Route path="/" element={<Home />} />
                    <Route path="/students" element={<Students />} />
                    <Route path="/evaluate" element={<Evaluate />} />
                    <Route path="/evaluate/:studentId" element={<Evaluate />} />
                    <Route path="/reports" element={<Reports />} />
                    <Route path="/notes" element={<Notes />} />
                </Routes>
            </main>

            <Navbar />
        </div>
    )
}

function App() {
    return (
        <AuthProvider>
            <ToastProvider>
                <BrowserRouter>
                    <Routes>
                        <Route path="/login" element={<Login />} />
                        <Route path="/*" element={
                            <ProtectedRoute>
                                <MainLayout />
                            </ProtectedRoute>
                        } />
                    </Routes>
                </BrowserRouter>
            </ToastProvider>
        </AuthProvider>
    )
}

export default App
