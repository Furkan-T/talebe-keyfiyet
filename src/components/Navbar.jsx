import { NavLink } from 'react-router-dom'
import { useState, useEffect } from 'react'
import { getUnreadNotificationCount } from '../firebase/firestore'
import { useAuth } from '../context/AuthContext'

function Navbar() {
    const [unreadCount, setUnreadCount] = useState(0)
    const { userProfile } = useAuth()

    useEffect(() => {
        if (userProfile?.id) {
            loadUnreadCount()
            const interval = setInterval(loadUnreadCount, 30000)
            return () => clearInterval(interval)
        }
    }, [userProfile?.id])

    const loadUnreadCount = async () => {
        try {
            const count = await getUnreadNotificationCount(userProfile.id)
            setUnreadCount(count)
        } catch (error) {
            console.error('Error fetching unread count:', error)
        }
    }

    return (
        <nav className="bottom-nav">
            <NavLink
                to="/"
                className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}
            >
                <span className="nav-icon">🏠</span>
                <span className="nav-label">Ana Sayfa</span>
            </NavLink>

            <NavLink
                to="/students"
                className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}
            >
                <span className="nav-icon">👥</span>
                <span className="nav-label">Talebe</span>
            </NavLink>

            <NavLink
                to="/evaluate"
                className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}
            >
                <span className="nav-icon">📋</span>
                <span className="nav-label">Değerlendir</span>
            </NavLink>

            <NavLink
                to="/reports"
                className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}
            >
                <span className="nav-icon">📊</span>
                <span className="nav-label">Raporlar</span>
            </NavLink>

            <NavLink
                to="/notes"
                className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}
                style={{ position: 'relative' }}
            >
                <span className="nav-icon">📝</span>
                <span className="nav-label">Notlar</span>
                {unreadCount > 0 && (
                    <span style={{
                        position: 'absolute',
                        top: '4px',
                        right: '50%',
                        transform: 'translateX(12px)',
                        background: '#ef4444',
                        color: '#fff',
                        fontSize: '10px',
                        fontWeight: '700',
                        minWidth: '16px',
                        height: '16px',
                        borderRadius: '8px',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        padding: '0 4px'
                    }}>
                        {unreadCount > 9 ? '9+' : unreadCount}
                    </span>
                )}
            </NavLink>
        </nav>
    )
}

export default Navbar
