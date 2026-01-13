import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { getAllStudents, addStudent, updateStudent, deleteStudent } from '../firebase/firestore'
import { useToast } from '../components/Toast'

function Students() {
    const [students, setStudents] = useState([])
    const [loading, setLoading] = useState(true)
    const [searchTerm, setSearchTerm] = useState('')
    const [showModal, setShowModal] = useState(false)
    const [editingStudent, setEditingStudent] = useState(null)
    const [formData, setFormData] = useState({ name: '', room: '' })
    const [saving, setSaving] = useState(false)
    const navigate = useNavigate()
    const toast = useToast()

    useEffect(() => {
        loadStudents()
    }, [])

    const loadStudents = async () => {
        try {
            setLoading(true)
            const data = await getAllStudents()
            setStudents(data)
        } catch (error) {
            console.error('Error loading students:', error)
            toast.error('Talebeler yüklenirken hata oluştu')
        } finally {
            setLoading(false)
        }
    }

    const handleOpenModal = (student = null) => {
        if (student) {
            setEditingStudent(student)
            setFormData({ name: student.name, room: student.room || '' })
        } else {
            setEditingStudent(null)
            setFormData({ name: '', room: '' })
        }
        setShowModal(true)
    }

    const handleCloseModal = () => {
        setShowModal(false)
        setEditingStudent(null)
        setFormData({ name: '', room: '' })
    }

    const handleSubmit = async (e) => {
        e.preventDefault()
        if (!formData.name.trim()) {
            toast.warning('Lütfen isim girin')
            return
        }

        try {
            setSaving(true)
            if (editingStudent) {
                await updateStudent(editingStudent.id, formData)
                toast.success('Talebe güncellendi')
            } else {
                await addStudent(formData)
                toast.success('Talebe eklendi')
            }
            await loadStudents()
            handleCloseModal()
        } catch (error) {
            console.error('Error saving student:', error)
            toast.error('Kaydetme sırasında hata oluştu')
        } finally {
            setSaving(false)
        }
    }

    const handleDelete = async (id, name) => {
        if (!window.confirm(`${name} isimli talebeyi silmek istediğinize emin misiniz?`)) return

        try {
            await deleteStudent(id)
            toast.success('Talebe silindi')
            await loadStudents()
        } catch (error) {
            console.error('Error deleting student:', error)
            toast.error('Silme sırasında hata oluştu')
        }
    }

    const filteredStudents = students.filter(student =>
        student.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (student.room && student.room.toLowerCase().includes(searchTerm.toLowerCase()))
    )

    if (loading) {
        return (
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '60px 20px', color: 'rgba(255,255,255,0.5)' }}>
                <div style={{ fontSize: '32px', marginBottom: '12px' }}>⏳</div>
                <div>Talebeler yükleniyor...</div>
            </div>
        )
    }

    return (
        <div style={{ paddingBottom: '100px' }}>
            {/* Header */}
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '16px' }}>
                <div>
                    <h2 style={{ fontSize: '20px', fontWeight: '700', color: '#fff', margin: 0 }}>Talebeler</h2>
                    <p style={{ fontSize: '13px', color: 'rgba(255,255,255,0.5)', margin: '4px 0 0 0' }}>{students.length} kayıtlı talebe</p>
                </div>
                <button
                    onClick={() => handleOpenModal()}
                    style={{
                        background: 'linear-gradient(135deg, #d4af37 0%, #b8962e 100%)',
                        color: '#000',
                        fontWeight: '600',
                        fontSize: '14px',
                        padding: '10px 16px',
                        borderRadius: '10px',
                        border: 'none',
                        cursor: 'pointer',
                        boxShadow: '0 4px 15px rgba(212, 175, 55, 0.3)'
                    }}
                >
                    + Yeni Ekle
                </button>
            </div>

            {/* Arama */}
            <div style={{
                position: 'relative',
                marginBottom: '16px'
            }}>
                <span style={{ position: 'absolute', left: '14px', top: '50%', transform: 'translateY(-50%)', fontSize: '16px', opacity: 0.4 }}>🔍</span>
                <input
                    type="text"
                    placeholder="İsim veya oda no ile ara..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    style={{
                        width: '100%',
                        padding: '12px 12px 12px 44px',
                        borderRadius: '12px',
                        border: '1px solid rgba(255,255,255,0.1)',
                        background: '#1e1e1e',
                        color: '#fff',
                        fontSize: '14px',
                        outline: 'none',
                        boxSizing: 'border-box'
                    }}
                />
            </div>

            {/* Liste */}
            {filteredStudents.length === 0 ? (
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '60px 20px', opacity: 0.5 }}>
                    <div style={{ fontSize: '48px', marginBottom: '12px' }}>👥</div>
                    <p style={{ color: 'rgba(255,255,255,0.6)' }}>
                        {searchTerm ? 'Arama sonucu bulunamadı' : 'Henüz talebe eklenmemiş'}
                    </p>
                </div>
            ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                    {filteredStudents.map(student => (
                        <div
                            key={student.id}
                            style={{
                                background: '#1e1e1e',
                                borderRadius: '14px',
                                padding: '14px',
                                border: '1px solid rgba(255,255,255,0.08)',
                                display: 'flex',
                                alignItems: 'center',
                                gap: '12px',
                                cursor: 'pointer',
                                transition: 'all 0.2s ease'
                            }}
                            onClick={() => navigate(`/evaluate/${student.id}`)}
                        >
                            <div style={{
                                width: '46px',
                                height: '46px',
                                borderRadius: '12px',
                                background: 'linear-gradient(135deg, rgba(99, 102, 241, 0.2) 0%, rgba(139, 92, 246, 0.2) 100%)',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                fontSize: '18px',
                                fontWeight: '700',
                                color: '#a5b4fc'
                            }}>
                                {student.name.charAt(0).toUpperCase()}
                            </div>
                            <div style={{ flex: 1 }}>
                                <div style={{ fontWeight: '600', color: '#fff', fontSize: '15px' }}>{student.name}</div>
                                <div style={{ fontSize: '12px', color: 'rgba(255,255,255,0.4)' }}>Oda: {student.room || '—'}</div>
                            </div>
                            <div style={{ display: 'flex', gap: '8px' }} onClick={e => e.stopPropagation()}>
                                <button
                                    onClick={() => handleOpenModal(student)}
                                    style={{
                                        width: '36px',
                                        height: '36px',
                                        borderRadius: '10px',
                                        background: 'rgba(255,255,255,0.05)',
                                        border: '1px solid rgba(255,255,255,0.1)',
                                        color: '#fff',
                                        cursor: 'pointer',
                                        display: 'flex',
                                        alignItems: 'center',
                                        justifyContent: 'center',
                                        fontSize: '14px'
                                    }}
                                >
                                    ✏️
                                </button>
                                <button
                                    onClick={() => handleDelete(student.id, student.name)}
                                    style={{
                                        width: '36px',
                                        height: '36px',
                                        borderRadius: '10px',
                                        background: 'rgba(239, 68, 68, 0.1)',
                                        border: '1px solid rgba(239, 68, 68, 0.3)',
                                        color: '#ef4444',
                                        cursor: 'pointer',
                                        display: 'flex',
                                        alignItems: 'center',
                                        justifyContent: 'center',
                                        fontSize: '14px'
                                    }}
                                >
                                    🗑️
                                </button>
                            </div>
                        </div>
                    ))}
                </div>
            )}

            {/* Modal */}
            {showModal && (
                <div style={{
                    position: 'fixed',
                    inset: 0,
                    background: 'rgba(0,0,0,0.85)',
                    backdropFilter: 'blur(4px)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    padding: '20px',
                    zIndex: 100
                }} onClick={handleCloseModal}>
                    <div style={{
                        width: '100%',
                        maxWidth: '400px',
                        background: '#1e1e1e',
                        borderRadius: '20px',
                        border: '1px solid rgba(255,255,255,0.1)',
                        overflow: 'hidden'
                    }} onClick={e => e.stopPropagation()}>
                        {/* Modal Header */}
                        <div style={{
                            padding: '20px',
                            borderBottom: '1px solid rgba(255,255,255,0.1)',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'space-between'
                        }}>
                            <h3 style={{ margin: 0, fontSize: '18px', fontWeight: '700', color: '#fff' }}>
                                {editingStudent ? 'Talebe Düzenle' : 'Yeni Talebe Ekle'}
                            </h3>
                            <button onClick={handleCloseModal} style={{ background: 'none', border: 'none', color: 'rgba(255,255,255,0.4)', fontSize: '20px', cursor: 'pointer' }}>✕</button>
                        </div>

                        {/* Modal Body */}
                        <form onSubmit={handleSubmit}>
                            <div style={{ padding: '20px' }}>
                                <div style={{ marginBottom: '16px' }}>
                                    <label style={{ display: 'block', fontSize: '13px', color: 'rgba(255,255,255,0.6)', marginBottom: '8px' }}>Ad Soyad</label>
                                    <input
                                        type="text"
                                        value={formData.name}
                                        onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                                        placeholder="Örn: Ahmet Yılmaz"
                                        required
                                        autoFocus
                                        style={{
                                            width: '100%',
                                            padding: '12px 14px',
                                            borderRadius: '10px',
                                            border: '1px solid rgba(255,255,255,0.1)',
                                            background: 'rgba(0,0,0,0.3)',
                                            color: '#fff',
                                            fontSize: '15px',
                                            outline: 'none',
                                            boxSizing: 'border-box'
                                        }}
                                    />
                                </div>
                                <div>
                                    <label style={{ display: 'block', fontSize: '13px', color: 'rgba(255,255,255,0.6)', marginBottom: '8px' }}>Oda No (Opsiyonel)</label>
                                    <input
                                        type="text"
                                        value={formData.room}
                                        onChange={(e) => setFormData({ ...formData, room: e.target.value })}
                                        placeholder="Örn: 101"
                                        style={{
                                            width: '100%',
                                            padding: '12px 14px',
                                            borderRadius: '10px',
                                            border: '1px solid rgba(255,255,255,0.1)',
                                            background: 'rgba(0,0,0,0.3)',
                                            color: '#fff',
                                            fontSize: '15px',
                                            outline: 'none',
                                            boxSizing: 'border-box'
                                        }}
                                    />
                                </div>
                            </div>

                            {/* Modal Footer */}
                            <div style={{
                                padding: '16px 20px',
                                borderTop: '1px solid rgba(255,255,255,0.1)',
                                display: 'flex',
                                gap: '12px'
                            }}>
                                <button
                                    type="button"
                                    onClick={handleCloseModal}
                                    style={{
                                        flex: 1,
                                        padding: '12px',
                                        borderRadius: '10px',
                                        background: 'rgba(255,255,255,0.05)',
                                        border: '1px solid rgba(255,255,255,0.1)',
                                        color: '#fff',
                                        fontSize: '14px',
                                        fontWeight: '600',
                                        cursor: 'pointer'
                                    }}
                                >
                                    İptal
                                </button>
                                <button
                                    type="submit"
                                    disabled={saving}
                                    style={{
                                        flex: 1,
                                        padding: '12px',
                                        borderRadius: '10px',
                                        background: 'linear-gradient(135deg, #d4af37 0%, #b8962e 100%)',
                                        border: 'none',
                                        color: '#000',
                                        fontSize: '14px',
                                        fontWeight: '700',
                                        cursor: 'pointer',
                                        opacity: saving ? 0.6 : 1
                                    }}
                                >
                                    {saving ? 'Kaydediliyor...' : 'Kaydet'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    )
}

export default Students
