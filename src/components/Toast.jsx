import { useState, useEffect, createContext, useContext, useCallback } from 'react'

// Toast Context
const ToastContext = createContext(null)

// Toast types
const TOAST_TYPES = {
    success: { icon: '✓', className: 'toast-success' },
    error: { icon: '✕', className: 'toast-error' },
    warning: { icon: '⚠', className: 'toast-warning' },
    info: { icon: 'ℹ', className: 'toast-info' }
}

// Toast Provider Component
export function ToastProvider({ children }) {
    const [toasts, setToasts] = useState([])

    const addToast = useCallback((message, type = 'info', duration = 3000) => {
        const id = Date.now()
        setToasts(prev => [...prev, { id, message, type, duration }])

        setTimeout(() => {
            setToasts(prev => prev.filter(toast => toast.id !== id))
        }, duration)
    }, [])

    const removeToast = useCallback((id) => {
        setToasts(prev => prev.filter(toast => toast.id !== id))
    }, [])

    const toast = {
        success: (message, duration) => addToast(message, 'success', duration),
        error: (message, duration) => addToast(message, 'error', duration),
        warning: (message, duration) => addToast(message, 'warning', duration),
        info: (message, duration) => addToast(message, 'info', duration)
    }

    return (
        <ToastContext.Provider value={toast}>
            {children}
            <ToastContainer toasts={toasts} removeToast={removeToast} />
        </ToastContext.Provider>
    )
}

// Toast Container Component
function ToastContainer({ toasts, removeToast }) {
    if (toasts.length === 0) return null

    return (
        <div className="toast-container">
            {toasts.map(toast => (
                <Toast
                    key={toast.id}
                    toast={toast}
                    onClose={() => removeToast(toast.id)}
                />
            ))}
        </div>
    )
}

// Individual Toast Component
function Toast({ toast, onClose }) {
    const [isExiting, setIsExiting] = useState(false)
    const { icon, className } = TOAST_TYPES[toast.type] || TOAST_TYPES.info

    useEffect(() => {
        const exitTimer = setTimeout(() => {
            setIsExiting(true)
        }, toast.duration - 300)

        return () => clearTimeout(exitTimer)
    }, [toast.duration])

    return (
        <div className={`toast ${className} ${isExiting ? 'toast-exit' : ''}`}>
            <span className="toast-icon">{icon}</span>
            <span className="toast-message">{toast.message}</span>
            <button className="toast-close" onClick={onClose}>✕</button>
        </div>
    )
}

// Custom hook to use toast
export function useToast() {
    const context = useContext(ToastContext)
    if (!context) {
        throw new Error('useToast must be used within a ToastProvider')
    }
    return context
}

export default ToastProvider
