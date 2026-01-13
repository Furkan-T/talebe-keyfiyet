import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'

function Login() {
    const [email, setEmail] = useState('')
    const [password, setPassword] = useState('')
    const [loading, setLoading] = useState(false)
    const [error, setError] = useState('')

    const { login } = useAuth()
    const navigate = useNavigate()

    const handleSubmit = async (e) => {
        e.preventDefault()
        setError('')

        if (!email || !password) {
            setError('E-posta ve şifre gerekli')
            return
        }

        setLoading(true)
        const result = await login(email, password)
        setLoading(false)

        if (result.success) {
            navigate('/')
        } else {
            setError(result.error)
        }
    }

    return (
        <div style={{
            minHeight: '100vh',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '20px',
            background: 'linear-gradient(135deg, #1a1a1a 0%, #2d2d2d 100%)'
        }}>
            {/* Logo / Başlık */}
            <div style={{ textAlign: 'center', marginBottom: '32px' }}>
                <div style={{ fontSize: '48px', marginBottom: '12px' }}>📋</div>
                <h1 style={{ fontSize: '24px', fontWeight: '700', color: '#fff', margin: '0 0 8px 0' }}>
                    Talebe Keyfiyet
                </h1>
                <p style={{ fontSize: '14px', color: 'rgba(255,255,255,0.5)', margin: 0 }}>
                    Keyfiyet Takip Sistemi
                </p>
            </div>

            {/* Giriş Formu */}
            <div style={{
                width: '100%',
                maxWidth: '360px',
                background: '#1e1e1e',
                borderRadius: '20px',
                padding: '32px 24px',
                border: '1px solid rgba(255,255,255,0.1)'
            }}>
                <h2 style={{ fontSize: '18px', fontWeight: '600', color: '#fff', margin: '0 0 24px 0', textAlign: 'center' }}>
                    Giriş Yap
                </h2>

                {error && (
                    <div style={{
                        padding: '12px',
                        borderRadius: '10px',
                        background: 'rgba(239, 68, 68, 0.15)',
                        border: '1px solid rgba(239, 68, 68, 0.3)',
                        color: '#ef4444',
                        fontSize: '13px',
                        marginBottom: '20px',
                        textAlign: 'center'
                    }}>
                        {error}
                    </div>
                )}

                <form onSubmit={handleSubmit}>
                    <div style={{ marginBottom: '16px' }}>
                        <label style={{ display: 'block', fontSize: '13px', color: 'rgba(255,255,255,0.6)', marginBottom: '8px' }}>
                            E-posta
                        </label>
                        <input
                            type="email"
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                            placeholder="ornek@email.com"
                            style={{
                                width: '100%',
                                padding: '14px 16px',
                                borderRadius: '12px',
                                border: '1px solid rgba(255,255,255,0.1)',
                                background: 'rgba(0,0,0,0.3)',
                                color: '#fff',
                                fontSize: '15px',
                                outline: 'none',
                                boxSizing: 'border-box'
                            }}
                        />
                    </div>

                    <div style={{ marginBottom: '24px' }}>
                        <label style={{ display: 'block', fontSize: '13px', color: 'rgba(255,255,255,0.6)', marginBottom: '8px' }}>
                            Şifre
                        </label>
                        <input
                            type="password"
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            placeholder="••••••••"
                            style={{
                                width: '100%',
                                padding: '14px 16px',
                                borderRadius: '12px',
                                border: '1px solid rgba(255,255,255,0.1)',
                                background: 'rgba(0,0,0,0.3)',
                                color: '#fff',
                                fontSize: '15px',
                                outline: 'none',
                                boxSizing: 'border-box'
                            }}
                        />
                    </div>

                    <button
                        type="submit"
                        disabled={loading}
                        style={{
                            width: '100%',
                            padding: '14px',
                            borderRadius: '12px',
                            border: 'none',
                            background: 'linear-gradient(135deg, #d4af37 0%, #b8962e 100%)',
                            color: '#000',
                            fontSize: '15px',
                            fontWeight: '700',
                            cursor: loading ? 'not-allowed' : 'pointer',
                            opacity: loading ? 0.7 : 1
                        }}
                    >
                        {loading ? 'Giriş yapılıyor...' : 'Giriş Yap'}
                    </button>
                </form>
            </div>

            <p style={{ marginTop: '24px', fontSize: '12px', color: 'rgba(255,255,255,0.3)', textAlign: 'center' }}>
                İrfaniye Yurdu © 2026
            </p>
        </div>
    )
}

export default Login
