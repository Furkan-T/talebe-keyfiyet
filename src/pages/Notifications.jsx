import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { getNotifications, markNotificationAsRead, markAllNotificationsAsRead } from '../firebase/firestore'
import { useToast } from '../components/Toast'
import { useAuth } from '../context/AuthContext'

function Notifications() {
    const [notifications, setNotifications] = useState([])
    const [loading, setLoading] = useState(true)
    const navigate = useNavigate()
    const toast = useToast()
    const { userProfile } = useAuth()

    useEffect(() => {
        if (userProfile?.id) {
            loadNotifications()
        }
    }, [userProfile?.id])

    const loadNotifications = async () => {
        try {
            setLoading(true)
            const data = await getNotifications(userProfile.id)
            setNotifications(data)
        } catch (error) {
            console.error('Error loading notifications:', error)
            toast.error('Bildirimler yüklenirken hata oluştu')
        } finally {
            setLoading(false)
        }
    }

    const handleNotificationClick = async (notification) => {
        try {
            if (!notification.read) {
                await markNotificationAsRead(notification.id)
            }
            // İlgili nota git
            if (notification.noteId) {
                navigate('/notes')
            }
        } catch (error) {
            console.error('Error:', error)
        }
    }

    const handleMarkAllAsRead = async () => {
        try {
            await markAllNotificationsAsRead(userProfile.id)
            await loadNotifications()
            toast.success('Tüm bildirimler okundu')
        } catch (error) {
            console.error('Error:', error)
            toast.error('Hata oluştu')
        }
    }

    const formatDate = (timestamp) => {
        if (!timestamp) return ''
        const date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp)
        const now = new Date()
        const diff = now - date
        const minutes = Math.floor(diff / 60000)
        const hours = Math.floor(diff / 3600000)
        const days = Math.floor(diff / 86400000)

        if (minutes < 1) return 'Az önce'
        if (minutes < 60) return `${minutes} dk önce`
        if (hours < 24) return `${hours} saat önce`
        if (days < 7) return `${days} gün önce`
        return date.toLocaleDateString('tr-TR', { day: 'numeric', month: 'short' })
    }

    const unreadCount = notifications.filter(n => !n.read).length

    if (loading) {
        return (
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '60px 20px', color: 'rgba(255,255,255,0.5)' }}>
                <div style={{ fontSize: '32px', marginBottom: '12px' }}>⏳</div>
                <div>Bildirimler yükleniyor...</div>
            </div>
        )
    }

    return (
        <div style={{ paddingBottom: '100px' }}>
            {/* Header */}
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '20px' }}>
                <div>
                    <h2 style={{ fontSize: '20px', fontWeight: '700', color: '#fff', margin: 0 }}>Bildirimler</h2>
                    <p style={{ fontSize: '13px', color: 'rgba(255,255,255,0.5)', margin: '4px 0 0 0' }}>
                        {unreadCount > 0 ? `${unreadCount} okunmamış bildirim` : 'Tüm bildirimler okundu'}
                    </p>
                </div>
                {unreadCount > 0 && (
                    <button
                        onClick={handleMarkAllAsRead}
                        style={{
                            background: 'rgba(255,255,255,0.05)',
                            border: '1px solid rgba(255,255,255,0.1)',
                            color: '#d4af37',
                            fontWeight: '500',
                            fontSize: '12px',
                            padding: '8px 12px',
                            borderRadius: '8px',
                            cursor: 'pointer'
                        }}
                    >
                        Tümünü Oku
                    </button>
                )}
            </div>

            {/* List */}
            {notifications.length === 0 ? (
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '60px 20px', opacity: 0.5 }}>
                    <div style={{ fontSize: '48px', marginBottom: '12px' }}>🔔</div>
                    <p style={{ color: 'rgba(255,255,255,0.6)' }}>Henüz bildirim yok</p>
                </div>
            ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                    {notifications.map(notification => (
                        <div
                            key={notification.id}
                            onClick={() => handleNotificationClick(notification)}
                            style={{
                                background: notification.read ? '#1e1e1e' : 'rgba(99, 102, 241, 0.1)',
                                borderRadius: '12px',
                                padding: '14px 16px',
                                border: notification.read ? '1px solid rgba(255,255,255,0.08)' : '1px solid rgba(99, 102, 241, 0.3)',
                                cursor: 'pointer',
                                display: 'flex',
                                alignItems: 'flex-start',
                                gap: '12px'
                            }}
                        >
                            <div style={{
                                width: '40px',
                                height: '40px',
                                borderRadius: '10px',
                                background: notification.read ? 'rgba(255,255,255,0.05)' : 'rgba(99, 102, 241, 0.2)',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                fontSize: '18px',
                                flexShrink: 0
                            }}>
                                💬
                            </div>
                            <div style={{ flex: 1, minWidth: 0 }}>
                                <div style={{
                                    fontSize: '14px',
                                    color: notification.read ? 'rgba(255,255,255,0.7)' : '#fff',
                                    fontWeight: notification.read ? '400' : '500',
                                    marginBottom: '4px'
                                }}>
                                    {notification.message}
                                </div>
                                <div style={{ fontSize: '11px', color: 'rgba(255,255,255,0.4)' }}>
                                    {formatDate(notification.createdAt)}
                                </div>
                            </div>
                            {!notification.read && (
                                <div style={{
                                    width: '8px',
                                    height: '8px',
                                    borderRadius: '50%',
                                    background: '#6366f1',
                                    flexShrink: 0,
                                    marginTop: '6px'
                                }}></div>
                            )}
                        </div>
                    ))}
                </div>
            )}
        </div>
    )
}

export default Notifications
