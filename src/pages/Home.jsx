import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { getAllStudents } from '../firebase/firestore'
import { useToast } from '../components/Toast'

function Home() {
    const [totalStudents, setTotalStudents] = useState(0)
    const [loading, setLoading] = useState(true)
    const toast = useToast()

    useEffect(() => {
        loadData()
    }, [])

    const loadData = async () => {
        try {
            setLoading(true)
            const students = await getAllStudents()
            setTotalStudents(students.length)
        } catch (error) {
            console.error('Error loading data:', error)
            toast.error('Veriler yüklenirken hata oluştu')
        } finally {
            setLoading(false)
        }
    }

    // Günün saatine göre selamlama
    const getGreeting = () => {
        const hour = new Date().getHours()
        if (hour < 12) return 'Günaydın'
        if (hour < 18) return 'İyi Günler'
        return 'İyi Akşamlar'
    }

    return (
        <div className="home-container" style={{ paddingBottom: '100px' }}>
            {/* Hoşgeldin Kartı */}
            <div style={{
                background: 'linear-gradient(135deg, #1a1a2e 0%, #16213e 50%, #0f3460 100%)',
                borderRadius: '20px',
                padding: '32px 24px',
                marginBottom: '24px',
                border: '1px solid rgba(212, 175, 55, 0.2)',
                boxShadow: '0 8px 32px rgba(0, 0, 0, 0.3)'
            }}>
                <div style={{ marginBottom: '8px', fontSize: '14px', color: 'rgba(255,255,255,0.5)', letterSpacing: '2px', textTransform: 'uppercase' }}>
                    İrfaniye Yurdu
                </div>
                <h2 style={{
                    fontSize: '28px',
                    fontWeight: '700',
                    color: '#fff',
                    marginBottom: '4px'
                }}>
                    {getGreeting()} 👋
                </h2>
                <p style={{ color: 'rgba(255,255,255,0.6)', fontSize: '15px' }}>
                    Keyfiyet takip sistemine hoş geldiniz
                </p>
            </div>

            {/* Talebe Sayısı Kartı */}
            <div style={{
                background: '#1e1e1e',
                borderRadius: '16px',
                padding: '24px',
                marginBottom: '24px',
                border: '1px solid rgba(255,255,255,0.08)',
                display: 'flex',
                alignItems: 'center',
                gap: '16px'
            }}>
                <div style={{
                    width: '56px',
                    height: '56px',
                    borderRadius: '14px',
                    background: 'linear-gradient(135deg, #d4af37 0%, #b8962e 100%)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontSize: '24px',
                    boxShadow: '0 4px 15px rgba(212, 175, 55, 0.3)'
                }}>
                    👥
                </div>
                <div style={{ flex: 1 }}>
                    <div style={{ color: 'rgba(255,255,255,0.5)', fontSize: '13px', marginBottom: '4px' }}>
                        Toplam Talebe
                    </div>
                    <div style={{
                        fontSize: '32px',
                        fontWeight: '700',
                        color: '#fff',
                        lineHeight: 1
                    }}>
                        {loading ? (
                            <span style={{
                                display: 'inline-block',
                                width: '40px',
                                height: '32px',
                                background: 'rgba(255,255,255,0.1)',
                                borderRadius: '6px',
                                animation: 'pulse 1.5s infinite'
                            }}></span>
                        ) : totalStudents}
                    </div>
                </div>
                <Link to="/students" style={{
                    background: 'rgba(212, 175, 55, 0.15)',
                    border: '1px solid rgba(212, 175, 55, 0.3)',
                    borderRadius: '10px',
                    padding: '10px 16px',
                    color: '#d4af37',
                    fontSize: '13px',
                    fontWeight: '600',
                    textDecoration: 'none',
                    transition: 'all 0.2s ease'
                }}>
                    Görüntüle →
                </Link>
            </div>

            <div style={{ marginBottom: '16px' }}>
                <h3 style={{
                    fontSize: '14px',
                    color: 'rgba(255,255,255,0.4)',
                    marginBottom: '12px',
                    fontWeight: '500',
                    letterSpacing: '1px',
                    textTransform: 'uppercase'
                }}>
                    Hızlı Erişim
                </h3>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                    <Link to="/evaluate" style={{
                        background: '#1e1e1e',
                        borderRadius: '14px',
                        padding: '16px',
                        border: '1px solid rgba(255,255,255,0.08)',
                        textDecoration: 'none',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '14px',
                        transition: 'all 0.2s ease'
                    }}>
                        <div style={{
                            width: '48px',
                            height: '48px',
                            borderRadius: '12px',
                            background: 'rgba(99, 102, 241, 0.15)',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            fontSize: '22px'
                        }}>
                            📋
                        </div>
                        <div style={{ flex: 1 }}>
                            <div style={{ color: '#fff', fontSize: '15px', fontWeight: '600' }}>Değerlendir</div>
                            <div style={{ color: 'rgba(255,255,255,0.4)', fontSize: '12px', marginTop: '2px' }}>Tekli veya toplu değerlendirme</div>
                        </div>
                        <span style={{ color: 'rgba(255,255,255,0.3)', fontSize: '18px' }}>→</span>
                    </Link>

                    <Link to="/reports" style={{
                        background: '#1e1e1e',
                        borderRadius: '14px',
                        padding: '16px',
                        border: '1px solid rgba(255,255,255,0.08)',
                        textDecoration: 'none',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '14px',
                        transition: 'all 0.2s ease'
                    }}>
                        <div style={{
                            width: '48px',
                            height: '48px',
                            borderRadius: '12px',
                            background: 'rgba(245, 158, 11, 0.15)',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            fontSize: '22px'
                        }}>
                            📊
                        </div>
                        <div style={{ flex: 1 }}>
                            <div style={{ color: '#fff', fontSize: '15px', fontWeight: '600' }}>Raporlar</div>
                            <div style={{ color: 'rgba(255,255,255,0.4)', fontSize: '12px', marginTop: '2px' }}>Günlük, haftalık, aylık raporlar</div>
                        </div>
                        <span style={{ color: 'rgba(255,255,255,0.3)', fontSize: '18px' }}>→</span>
                    </Link>

                    <Link to="/notes" style={{
                        background: '#1e1e1e',
                        borderRadius: '14px',
                        padding: '16px',
                        border: '1px solid rgba(255,255,255,0.08)',
                        textDecoration: 'none',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '14px',
                        transition: 'all 0.2s ease'
                    }}>
                        <div style={{
                            width: '48px',
                            height: '48px',
                            borderRadius: '12px',
                            background: 'rgba(139, 92, 246, 0.15)',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            fontSize: '22px'
                        }}>
                            📝
                        </div>
                        <div style={{ flex: 1 }}>
                            <div style={{ color: '#fff', fontSize: '15px', fontWeight: '600' }}>Hususi Notlar</div>
                            <div style={{ color: 'rgba(255,255,255,0.4)', fontSize: '12px', marginTop: '2px' }}>Özel notlarınızı kaydedin</div>
                        </div>
                        <span style={{ color: 'rgba(255,255,255,0.3)', fontSize: '18px' }}>→</span>
                    </Link>
                </div>
            </div>
        </div>
    )
}

export default Home
