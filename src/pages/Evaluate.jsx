import { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { getAllStudents, getStudent, addEvaluation, updateEvaluation, getExistingEvaluation, EVALUATION_PARAMS } from '../firebase/firestore'
import { Timestamp } from 'firebase/firestore'
import { useToast } from '../components/Toast'

function Evaluate() {
    const { studentId } = useParams()
    const navigate = useNavigate()
    const toast = useToast()

    // Mod: 'single' veya 'bulk'
    const [mode, setMode] = useState(studentId ? 'single' : null)

    // ========== TEKLİ DEĞERLENDİRME STATE ==========
    const [students, setStudents] = useState([])
    const [selectedStudent, setSelectedStudent] = useState(null)
    const [loading, setLoading] = useState(true)
    const [loadingEvaluation, setLoadingEvaluation] = useState(false)
    const [saving, setSaving] = useState(false)
    const [searchTerm, setSearchTerm] = useState('')
    const [existingEvaluationId, setExistingEvaluationId] = useState(null)
    const [isEditing, setIsEditing] = useState(false)
    const [parameters, setParameters] = useState(() => {
        const initial = {}
        Object.keys(EVALUATION_PARAMS).forEach(key => {
            const param = EVALUATION_PARAMS[key]
            initial[key] = param.type === 'positive'
        })
        return initial
    })
    const [notes, setNotes] = useState('')
    const [evaluationDate, setEvaluationDate] = useState(new Date().toISOString().split('T')[0])

    // ========== TOPLU DEĞERLENDİRME STATE ==========
    const [bulkEvaluations, setBulkEvaluations] = useState({})
    const [editingStudentId, setEditingStudentId] = useState(null)

    useEffect(() => {
        loadData()
    }, [studentId])

    useEffect(() => {
        if (selectedStudent && evaluationDate && mode === 'single') {
            checkExistingEvaluation()
        }
    }, [selectedStudent?.id, evaluationDate])

    const loadData = async () => {
        try {
            setLoading(true)
            const studentsData = await getAllStudents()
            setStudents(studentsData)

            // Toplu değerlendirme için başlangıç durumu
            const initialBulk = {}
            studentsData.forEach(s => {
                initialBulk[s.id] = {
                    status: 'pending',
                    parameters: getDefaultParameters(),
                    notes: ''
                }
            })
            setBulkEvaluations(initialBulk)

            if (studentId) {
                const student = await getStudent(studentId)
                if (student) {
                    setSelectedStudent(student)
                    setMode('single')
                }
            }
        } catch (error) {
            console.error('Error loading data:', error)
            toast.error('Veriler yüklenirken hata oluştu')
        } finally {
            setLoading(false)
        }
    }

    const getDefaultParameters = () => {
        const params = {}
        Object.keys(EVALUATION_PARAMS).forEach(key => {
            const param = EVALUATION_PARAMS[key]
            params[key] = param.type === 'positive'
        })
        return params
    }

    // ========== TEKLİ FONKSIYONLAR ==========
    const checkExistingEvaluation = async () => {
        if (!selectedStudent) return
        try {
            setLoadingEvaluation(true)
            const dateTimestamp = Timestamp.fromDate(new Date(evaluationDate))
            const existingEval = await getExistingEvaluation(selectedStudent.id, dateTimestamp)

            if (existingEval) {
                setExistingEvaluationId(existingEval.id)
                setIsEditing(true)
                if (existingEval.parameters) setParameters(existingEval.parameters)
                setNotes(existingEval.notes || '')
                toast.info('Bu tarih için mevcut değerlendirme yüklendi')
            } else {
                setExistingEvaluationId(null)
                setIsEditing(false)
                resetParameters()
            }
        } catch (error) {
            console.error('Error checking existing evaluation:', error)
        } finally {
            setLoadingEvaluation(false)
        }
    }

    const resetParameters = () => {
        const initial = {}
        Object.keys(EVALUATION_PARAMS).forEach(key => {
            const param = EVALUATION_PARAMS[key]
            initial[key] = param.type === 'positive'
        })
        setParameters(initial)
        setNotes('')
    }

    const handleToggleParameter = (key) => {
        setParameters(prev => ({ ...prev, [key]: !prev[key] }))
    }

    const handleSelectStudent = (student) => {
        setSelectedStudent(student)
        setSearchTerm('')
    }

    const handleResetForm = () => {
        resetParameters()
        setSelectedStudent(null)
        setExistingEvaluationId(null)
        setIsEditing(false)
    }

    const handleSubmitSingle = async () => {
        if (!selectedStudent) {
            toast.warning('Lütfen bir talebe seçin')
            return
        }
        try {
            setSaving(true)
            if (existingEvaluationId) {
                await updateEvaluation(existingEvaluationId, {
                    studentId: selectedStudent.id,
                    date: Timestamp.fromDate(new Date(evaluationDate)),
                    parameters,
                    notes
                })
                toast.success('Değerlendirme başarıyla güncellendi!')
            } else {
                await addEvaluation({
                    studentId: selectedStudent.id,
                    date: Timestamp.fromDate(new Date(evaluationDate)),
                    parameters,
                    notes
                })
                toast.success('Değerlendirme başarıyla kaydedildi!')
            }
            handleResetForm()
            navigate('/')
        } catch (error) {
            console.error('Error saving evaluation:', error)
            toast.error('Kaydetme sırasında hata oluştu')
        } finally {
            setSaving(false)
        }
    }

    const calculateMinus = () => {
        let count = 0
        Object.entries(EVALUATION_PARAMS).forEach(([key, { type }]) => {
            const value = parameters[key]
            if (type === 'positive' && value === false) count++
            if (type === 'negative' && value === true) count++
        })
        return count
    }

    // ========== TOPLU FONKSIYONLAR ==========
    const handleBulkStatusChange = (studentId, status) => {
        setBulkEvaluations(prev => ({
            ...prev,
            [studentId]: {
                ...prev[studentId],
                status: status,
                parameters: status === 'full' ? getDefaultParameters() : prev[studentId].parameters
            }
        }))
        if (status === 'minus') {
            setEditingStudentId(studentId)
        } else {
            setEditingStudentId(null)
        }
    }

    const handleBulkParameterToggle = (studentId, paramKey) => {
        setBulkEvaluations(prev => ({
            ...prev,
            [studentId]: {
                ...prev[studentId],
                parameters: {
                    ...prev[studentId].parameters,
                    [paramKey]: !prev[studentId].parameters[paramKey]
                }
            }
        }))
    }

    const handleSaveAllBulk = async () => {
        const studentsToSave = Object.entries(bulkEvaluations).filter(([_, data]) => data.status !== 'pending')
        if (studentsToSave.length === 0) {
            toast.warning('Kaydedilecek değerlendirme yok')
            return
        }
        if (!window.confirm(`${studentsToSave.length} talebe için değerlendirme kaydedilecek. Onaylıyor musunuz?`)) return

        try {
            setSaving(true)
            const promises = studentsToSave.map(async ([studentId, data]) => {
                if (data.status === 'absent') return
                const evalDate = Timestamp.fromDate(new Date(evaluationDate))
                const existing = await getExistingEvaluation(studentId, evalDate)
                const payload = {
                    studentId,
                    date: evalDate,
                    parameters: data.parameters,
                    notes: data.notes || ''
                }
                if (existing) {
                    await updateEvaluation(existing.id, payload)
                } else {
                    await addEvaluation(payload)
                }
            })
            await Promise.all(promises)
            toast.success('Toplu değerlendirme başarıyla kaydedildi!')
            navigate('/')
        } catch (error) {
            console.error('Error bulk saving:', error)
            toast.error('Kaydetme sırasında bir hata oluştu')
        } finally {
            setSaving(false)
        }
    }

    const countByStatus = {
        pending: Object.values(bulkEvaluations).filter(e => e.status === 'pending').length,
        full: Object.values(bulkEvaluations).filter(e => e.status === 'full').length,
        minus: Object.values(bulkEvaluations).filter(e => e.status === 'minus').length,
        absent: Object.values(bulkEvaluations).filter(e => e.status === 'absent').length
    }

    const filteredStudents = students.filter(student =>
        student.name.toLowerCase().includes(searchTerm.toLowerCase())
    )

    if (loading) {
        return (
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '60px 20px', color: 'rgba(255,255,255,0.5)' }}>
                <div style={{ fontSize: '32px', marginBottom: '12px' }}>⏳</div>
                <div>Yükleniyor...</div>
            </div>
        )
    }

    // ========== MOD SEÇİM EKRANI ==========
    if (mode === null) {
        return (
            <div style={{ paddingBottom: '100px' }}>
                <div style={{
                    background: 'linear-gradient(135deg, #1a1a2e 0%, #16213e 100%)',
                    borderRadius: '16px',
                    padding: '24px',
                    marginBottom: '20px',
                    border: '1px solid rgba(212, 175, 55, 0.2)',
                    textAlign: 'center'
                }}>
                    <h2 style={{ fontSize: '20px', fontWeight: '700', color: '#fff', marginBottom: '8px' }}>
                        Değerlendirme Modu Seçin
                    </h2>
                    <p style={{ fontSize: '14px', color: 'rgba(255,255,255,0.5)', margin: 0 }}>
                        Tek talebe veya toplu değerlendirme yapabilirsiniz
                    </p>
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                    <button
                        onClick={() => setMode('single')}
                        style={{
                            background: '#1e1e1e',
                            border: '1px solid rgba(255,255,255,0.1)',
                            borderRadius: '14px',
                            padding: '20px',
                            cursor: 'pointer',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '16px',
                            transition: 'all 0.2s ease'
                        }}
                    >
                        <div style={{
                            width: '56px',
                            height: '56px',
                            borderRadius: '14px',
                            background: 'rgba(99, 102, 241, 0.15)',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            fontSize: '24px'
                        }}>
                            📋
                        </div>
                        <div style={{ textAlign: 'left', flex: 1 }}>
                            <div style={{ fontWeight: '600', color: '#fff', fontSize: '16px', marginBottom: '4px' }}>
                                Tekli Değerlendirme
                            </div>
                            <div style={{ fontSize: '13px', color: 'rgba(255,255,255,0.5)' }}>
                                Tek bir talebeyi detaylı değerlendirin
                            </div>
                        </div>
                        <div style={{ color: 'rgba(255,255,255,0.3)', fontSize: '20px' }}>→</div>
                    </button>

                    <button
                        onClick={() => setMode('bulk')}
                        style={{
                            background: '#1e1e1e',
                            border: '1px solid rgba(255,255,255,0.1)',
                            borderRadius: '14px',
                            padding: '20px',
                            cursor: 'pointer',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '16px',
                            transition: 'all 0.2s ease'
                        }}
                    >
                        <div style={{
                            width: '56px',
                            height: '56px',
                            borderRadius: '14px',
                            background: 'rgba(16, 185, 129, 0.15)',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            fontSize: '24px'
                        }}>
                            ⚡
                        </div>
                        <div style={{ textAlign: 'left', flex: 1 }}>
                            <div style={{ fontWeight: '600', color: '#fff', fontSize: '16px', marginBottom: '4px' }}>
                                Toplu Değerlendirme
                            </div>
                            <div style={{ fontSize: '13px', color: 'rgba(255,255,255,0.5)' }}>
                                Tüm talebeleri hızlıca değerlendirin
                            </div>
                        </div>
                        <div style={{ color: 'rgba(255,255,255,0.3)', fontSize: '20px' }}>→</div>
                    </button>
                </div>
            </div>
        )
    }

    // ========== TEKLİ DEĞERLENDİRME EKRANI ==========
    if (mode === 'single') {
        return (
            <div style={{ paddingBottom: '100px' }}>
                {/* Geri Butonu */}
                {!studentId && (
                    <button
                        onClick={() => { setMode(null); handleResetForm(); }}
                        style={{
                            background: 'transparent',
                            border: 'none',
                            color: 'rgba(255,255,255,0.5)',
                            fontSize: '14px',
                            marginBottom: '16px',
                            cursor: 'pointer',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '6px'
                        }}
                    >
                        ← Mod Seçimine Dön
                    </button>
                )}

                {!selectedStudent ? (
                    <>
                        <div className="section-header">
                            <span className="section-title">Talebe Seçin</span>
                        </div>

                        <div className="search-bar">
                            <span className="search-icon">🔍</span>
                            <input
                                type="text"
                                className="search-input"
                                placeholder="Talebe ara..."
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                            />
                        </div>

                        {filteredStudents.length === 0 ? (
                            <div className="empty-state">
                                <div className="empty-state-icon">👥</div>
                                <p className="empty-state-text">Talebe bulunamadı</p>
                            </div>
                        ) : (
                            <ul className="list">
                                {filteredStudents.map(student => (
                                    <li key={student.id} className="list-item" onClick={() => handleSelectStudent(student)}>
                                        <div className="list-item-avatar">{student.name.charAt(0).toUpperCase()}</div>
                                        <div className="list-item-content">
                                            <div className="list-item-title">{student.name}</div>
                                            {student.room && <div className="list-item-subtitle">Oda: {student.room}</div>}
                                        </div>
                                        <span className="text-secondary">→</span>
                                    </li>
                                ))}
                            </ul>
                        )}
                    </>
                ) : (
                    <>
                        <div className="card">
                            <div className="flex items-center justify-between">
                                <div className="flex items-center gap-3">
                                    <div className="list-item-avatar">{selectedStudent.name.charAt(0).toUpperCase()}</div>
                                    <div>
                                        <div className="card-title">{selectedStudent.name}</div>
                                        {selectedStudent.room && <div className="card-subtitle">Oda: {selectedStudent.room}</div>}
                                    </div>
                                </div>
                                <button className="btn btn-secondary btn-sm" onClick={handleResetForm}>Değiştir</button>
                            </div>
                        </div>

                        {isEditing && (
                            <div className="card" style={{ background: 'var(--warning-bg)', borderColor: 'var(--warning)', marginBottom: '12px' }}>
                                <div className="flex items-center gap-2">
                                    <span style={{ fontSize: '1.2rem' }}>✏️</span>
                                    <span style={{ color: 'var(--warning)', fontWeight: '500' }}>Mevcut değerlendirme düzenleniyor</span>
                                </div>
                            </div>
                        )}

                        <div className="form-group">
                            <label className="form-label">Değerlendirme Tarihi</label>
                            <input type="date" className="date-input" value={evaluationDate} onChange={(e) => setEvaluationDate(e.target.value)} />
                        </div>

                        {loadingEvaluation && <div className="text-center text-muted mb-4">Mevcut değerlendirme kontrol ediliyor...</div>}

                        <div className="section-header mt-4">
                            <span className="section-title">Değerlendirme</span>
                            <span className={`list-item-badge ${calculateMinus() === 0 ? 'badge-success' : 'badge-error'}`}>
                                {calculateMinus() === 0 ? 'Tam Puan' : `-${calculateMinus()} Eksi`}
                            </span>
                        </div>

                        {Object.entries(EVALUATION_PARAMS).map(([key, { label, icon, type }]) => {
                            let className = 'checkbox-toggle '
                            let resultIcon = ''
                            if (type === 'positive') {
                                className += parameters[key] ? 'checked' : 'unchecked'
                                resultIcon = parameters[key] ? '✓' : '✗'
                            } else {
                                className += parameters[key] ? 'unchecked' : 'checked'
                                resultIcon = parameters[key] ? '✗' : '✓'
                            }
                            return (
                                <div key={key} className={className} onClick={() => handleToggleParameter(key)}>
                                    <span className="checkbox-toggle-label">{icon} {label}</span>
                                    <span className="checkbox-toggle-icon">{resultIcon}</span>
                                </div>
                            )
                        })}

                        <div className="form-group mt-4">
                            <label className="form-label">Notlar (Opsiyonel)</label>
                            <textarea className="form-input" placeholder="Ek notlar..." rows={3} value={notes} onChange={(e) => setNotes(e.target.value)} style={{ resize: 'vertical' }} />
                        </div>

                        <button className="btn btn-primary btn-block mt-4" onClick={handleSubmitSingle} disabled={saving || loadingEvaluation}>
                            {saving ? 'Kaydediliyor...' : isEditing ? '💾 Değerlendirmeyi Güncelle' : '💾 Değerlendirmeyi Kaydet'}
                        </button>
                    </>
                )}
            </div>
        )
    }

    // ========== TOPLU DEĞERLENDİRME EKRANI ==========
    if (mode === 'bulk') {
        return (
            <div style={{ paddingBottom: '100px' }}>
                {/* Geri Butonu */}
                <button
                    onClick={() => setMode(null)}
                    style={{
                        background: 'transparent',
                        border: 'none',
                        color: 'rgba(255,255,255,0.5)',
                        fontSize: '14px',
                        marginBottom: '16px',
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '6px'
                    }}
                >
                    ← Mod Seçimine Dön
                </button>

                {/* Header */}
                <div style={{
                    background: 'linear-gradient(135deg, #1a1a2e 0%, #16213e 100%)',
                    borderRadius: '16px',
                    padding: '20px',
                    marginBottom: '16px',
                    border: '1px solid rgba(212, 175, 55, 0.2)'
                }}>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '12px' }}>
                        <div>
                            <h2 style={{ fontSize: '18px', fontWeight: '700', color: '#fff', margin: 0 }}>Toplu Değerlendirme</h2>
                            <p style={{ fontSize: '13px', color: 'rgba(255,255,255,0.5)', margin: '4px 0 0 0' }}>{students.length} talebe</p>
                        </div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', background: 'rgba(0,0,0,0.3)', padding: '8px 12px', borderRadius: '10px', border: '1px solid rgba(255,255,255,0.1)' }}>
                            <span style={{ fontSize: '16px' }}>📅</span>
                            <input type="date" value={evaluationDate} onChange={(e) => setEvaluationDate(e.target.value)} style={{ background: 'transparent', border: 'none', color: '#fff', fontSize: '14px', outline: 'none', cursor: 'pointer' }} />
                        </div>
                    </div>

                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '8px' }}>
                        <div style={{ background: 'rgba(255,255,255,0.05)', borderRadius: '8px', padding: '8px', textAlign: 'center' }}>
                            <div style={{ fontSize: '18px', fontWeight: '700', color: '#888' }}>{countByStatus.pending}</div>
                            <div style={{ fontSize: '10px', color: 'rgba(255,255,255,0.4)' }}>Bekleyen</div>
                        </div>
                        <div style={{ background: 'rgba(16, 185, 129, 0.15)', borderRadius: '8px', padding: '8px', textAlign: 'center' }}>
                            <div style={{ fontSize: '18px', fontWeight: '700', color: '#10b981' }}>{countByStatus.full}</div>
                            <div style={{ fontSize: '10px', color: 'rgba(16, 185, 129, 0.7)' }}>Tam</div>
                        </div>
                        <div style={{ background: 'rgba(239, 68, 68, 0.15)', borderRadius: '8px', padding: '8px', textAlign: 'center' }}>
                            <div style={{ fontSize: '18px', fontWeight: '700', color: '#ef4444' }}>{countByStatus.minus}</div>
                            <div style={{ fontSize: '10px', color: 'rgba(239, 68, 68, 0.7)' }}>Eksi</div>
                        </div>
                        <div style={{ background: 'rgba(156, 163, 175, 0.15)', borderRadius: '8px', padding: '8px', textAlign: 'center' }}>
                            <div style={{ fontSize: '18px', fontWeight: '700', color: '#9ca3af' }}>{countByStatus.absent}</div>
                            <div style={{ fontSize: '10px', color: 'rgba(156, 163, 175, 0.7)' }}>Yok</div>
                        </div>
                    </div>
                </div>

                {/* Student List */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                    {students.map(student => {
                        const evalData = bulkEvaluations[student.id]
                        const isPending = evalData?.status === 'pending'
                        const isEditingThis = editingStudentId === student.id

                        const cardBg = isPending ? '#1e1e1e' : evalData.status === 'full' ? 'rgba(16, 185, 129, 0.08)' : evalData.status === 'minus' ? 'rgba(239, 68, 68, 0.08)' : 'rgba(156, 163, 175, 0.08)'
                        const cardBorder = isPending ? 'rgba(255,255,255,0.08)' : evalData.status === 'full' ? 'rgba(16, 185, 129, 0.3)' : evalData.status === 'minus' ? 'rgba(239, 68, 68, 0.3)' : 'rgba(156, 163, 175, 0.3)'
                        const avatarBg = isPending ? 'rgba(255,255,255,0.1)' : evalData.status === 'full' ? '#10b981' : evalData.status === 'minus' ? '#ef4444' : '#6b7280'

                        return (
                            <div key={student.id} style={{ background: cardBg, borderRadius: '14px', padding: '16px', border: `1px solid ${cardBorder}` }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '12px' }}>
                                    <div style={{ width: '44px', height: '44px', borderRadius: '12px', background: avatarBg, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '18px', fontWeight: '700', color: isPending ? '#fff' : (evalData.status === 'full' ? '#000' : '#fff') }}>
                                        {student.name.charAt(0).toUpperCase()}
                                    </div>
                                    <div style={{ flex: 1 }}>
                                        <div style={{ fontWeight: '600', color: '#fff', fontSize: '15px' }}>{student.name}</div>
                                        <div style={{ fontSize: '12px', color: 'rgba(255,255,255,0.4)' }}>Oda: {student.room || '—'}</div>
                                    </div>
                                </div>

                                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '8px' }}>
                                    <button onClick={() => handleBulkStatusChange(student.id, 'full')} style={{ padding: '12px 8px', borderRadius: '10px', border: evalData.status === 'full' ? '2px solid #10b981' : '1px solid rgba(255,255,255,0.1)', background: evalData.status === 'full' ? '#10b981' : 'transparent', color: evalData.status === 'full' ? '#000' : 'rgba(255,255,255,0.6)', fontSize: '13px', fontWeight: '600', cursor: 'pointer' }}>✓ Tam</button>
                                    <button onClick={() => handleBulkStatusChange(student.id, 'minus')} style={{ padding: '12px 8px', borderRadius: '10px', border: evalData.status === 'minus' ? '2px solid #ef4444' : '1px solid rgba(255,255,255,0.1)', background: evalData.status === 'minus' ? '#ef4444' : 'transparent', color: evalData.status === 'minus' ? '#fff' : 'rgba(255,255,255,0.6)', fontSize: '13px', fontWeight: '600', cursor: 'pointer' }}>− Eksi</button>
                                    <button onClick={() => handleBulkStatusChange(student.id, 'absent')} style={{ padding: '12px 8px', borderRadius: '10px', border: evalData.status === 'absent' ? '2px solid #6b7280' : '1px solid rgba(255,255,255,0.1)', background: evalData.status === 'absent' ? '#6b7280' : 'transparent', color: evalData.status === 'absent' ? '#fff' : 'rgba(255,255,255,0.6)', fontSize: '13px', fontWeight: '600', cursor: 'pointer' }}>○ Yok</button>
                                </div>

                                {isEditingThis && evalData.status === 'minus' && (
                                    <div style={{ marginTop: '16px', paddingTop: '16px', borderTop: '1px solid rgba(255,255,255,0.1)' }}>
                                        <div style={{ fontSize: '12px', color: 'rgba(255,255,255,0.5)', marginBottom: '10px', fontWeight: '500' }}>Eksi Kriterleri:</div>
                                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '8px' }}>
                                            {Object.entries(EVALUATION_PARAMS).map(([key, { label, icon, type }]) => {
                                                const val = evalData.parameters[key]
                                                const isMinus = (type === 'positive' && !val) || (type === 'negative' && val)
                                                return (
                                                    <div key={key} onClick={() => handleBulkParameterToggle(student.id, key)} style={{ padding: '10px 12px', borderRadius: '8px', border: isMinus ? '1px solid rgba(239, 68, 68, 0.5)' : '1px solid rgba(255,255,255,0.1)', background: isMinus ? 'rgba(239, 68, 68, 0.15)' : 'rgba(255,255,255,0.03)', color: isMinus ? '#fca5a5' : 'rgba(255,255,255,0.5)', fontSize: '12px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '8px' }}>
                                                        <span style={{ fontSize: '14px' }}>{icon}</span>
                                                        <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{label}</span>
                                                    </div>
                                                )
                                            })}
                                        </div>
                                        <input type="text" placeholder="Özel not ekle..." value={evalData.notes} onChange={(e) => setBulkEvaluations(prev => ({ ...prev, [student.id]: { ...prev[student.id], notes: e.target.value } }))} style={{ width: '100%', marginTop: '12px', padding: '10px 12px', borderRadius: '8px', border: '1px solid rgba(255,255,255,0.1)', background: 'rgba(0,0,0,0.2)', color: '#fff', fontSize: '13px', outline: 'none', boxSizing: 'border-box' }} />
                                        <button onClick={() => setEditingStudentId(null)} style={{ width: '100%', marginTop: '12px', padding: '8px', background: 'transparent', border: 'none', color: 'rgba(255,255,255,0.4)', fontSize: '12px', cursor: 'pointer' }}>▲ Kapat</button>
                                    </div>
                                )}
                            </div>
                        )
                    })}
                </div>

                {/* Floating Save Button */}
                <div style={{ position: 'fixed', bottom: '80px', left: '50%', transform: 'translateX(-50%)', zIndex: 50 }}>
                    <button onClick={handleSaveAllBulk} disabled={saving || countByStatus.pending === students.length} style={{ background: 'linear-gradient(135deg, #d4af37 0%, #b8962e 100%)', color: '#000', fontWeight: '700', fontSize: '15px', padding: '14px 32px', borderRadius: '50px', border: 'none', cursor: 'pointer', boxShadow: '0 8px 30px rgba(212, 175, 55, 0.4)', display: 'flex', alignItems: 'center', gap: '8px', opacity: (saving || countByStatus.pending === students.length) ? 0.5 : 1 }}>
                        {saving ? '⏳ Kaydediliyor...' : `💾 Kaydet (${students.length - countByStatus.pending})`}
                    </button>
                </div>
            </div>
        )
    }

    return null
}

export default Evaluate
