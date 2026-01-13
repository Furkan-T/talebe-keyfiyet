import { useState, useEffect } from 'react'
import { getAllStudents, getEvaluationsByDateRange, deleteEvaluation, EVALUATION_PARAMS } from '../firebase/firestore'
import { exportToExcel } from '../utils/exportToExcel'
import { useToast } from '../components/Toast'

function Reports() {
    const [students, setStudents] = useState([])
    const [evaluations, setEvaluations] = useState([])
    const [loading, setLoading] = useState(true)
    const [loadingEvaluations, setLoadingEvaluations] = useState(false)
    const [exporting, setExporting] = useState(false)
    const [activeTab, setActiveTab] = useState('daily')

    const [selectedEvaluation, setSelectedEvaluation] = useState(null)
    const [showDeleteModal, setShowDeleteModal] = useState(false)

    const toast = useToast()

    const [dateRange, setDateRange] = useState(() => {
        const today = new Date()
        const startOfDay = new Date(today)
        startOfDay.setHours(0, 0, 0, 0)
        return {
            start: startOfDay.toISOString().split('T')[0],
            end: today.toISOString().split('T')[0]
        }
    })

    useEffect(() => {
        loadData()
    }, [])

    useEffect(() => {
        const today = new Date()
        let start = new Date(today)

        switch (activeTab) {
            case 'daily':
                start = new Date(today)
                break
            case 'weekly':
                const day = today.getDay()
                const diff = today.getDate() - day + (day === 0 ? -6 : 1)
                start.setDate(diff)
                break
            case 'monthly':
                start.setDate(1)
                break
        }

        setDateRange({
            start: start.toISOString().split('T')[0],
            end: today.toISOString().split('T')[0]
        })
    }, [activeTab])

    useEffect(() => {
        loadEvaluations()
    }, [dateRange])

    const loadData = async () => {
        try {
            setLoading(true)
            const studentsData = await getAllStudents()
            setStudents(studentsData)
        } catch (error) {
            console.error('Error loading data:', error)
            toast.error('Veriler yüklenirken hata oluştu')
        } finally {
            setLoading(false)
        }
    }

    const loadEvaluations = async () => {
        try {
            setLoadingEvaluations(true)
            const data = await getEvaluationsByDateRange(dateRange.start, dateRange.end)
            setEvaluations(data)
        } catch (error) {
            console.error('Error loading evaluations:', error)
            toast.error('Değerlendirmeler yüklenirken hata oluştu')
        } finally {
            setLoadingEvaluations(false)
        }
    }

    const getStudentName = (studentId) => {
        const student = students.find(s => s.id === studentId)
        return student?.name || 'Bilinmeyen'
    }

    const handleExport = async () => {
        if (evaluations.length === 0) {
            toast.warning('Dışa aktarılacak veri bulunamadı')
            return
        }

        try {
            setExporting(true)
            const exportData = evaluations.map(evaluation => {
                const row = {
                    'Tarih': formatDate(evaluation.date),
                    'Talebe Adı': getStudentName(evaluation.studentId),
                }
                Object.entries(EVALUATION_PARAMS).forEach(([key, { label, type }]) => {
                    const value = evaluation.parameters?.[key]
                    let cellValue = 'Yok'
                    if (type === 'positive') {
                        cellValue = value === false ? 'HAYIR (-1)' : 'Evet'
                    } else if (type === 'negative') {
                        cellValue = value === true ? 'VAR (-1)' : 'Yok'
                    }
                    row[label.replace('?', '')] = cellValue
                })
                row['Toplam Eksi'] = evaluation.totalMinus || 0
                row['Notlar'] = evaluation.notes || ''
                return row
            })

            const tabLabels = { daily: 'Günlük', weekly: 'Haftalık', monthly: 'Aylık' }
            await exportToExcel(exportData, `talebe_keyfiyet_rapor_${dateRange.start}`, {
                title: `Rapor - ${tabLabels[activeTab]}`,
                dateRange: `${dateRange.start} - ${dateRange.end}`,
                totalEvaluations: evaluations.length,
                totalMinus: evaluations.reduce((sum, e) => sum + (e.totalMinus || 0), 0)
            })
            toast.success('Excel indirildi')
        } catch (error) {
            toast.error('Hata oluştu')
        } finally {
            setExporting(false)
        }
    }

    const handleDeleteClick = (evaluation) => {
        setSelectedEvaluation(evaluation)
        setShowDeleteModal(true)
    }

    const handleConfirmDelete = async () => {
        if (!selectedEvaluation) return
        try {
            await deleteEvaluation(selectedEvaluation.id)
            toast.success('Değerlendirme silindi')
            setShowDeleteModal(false)
            setSelectedEvaluation(null)
            await loadEvaluations()
        } catch (error) {
            toast.error('Silinirken hata oluştu')
        }
    }

    const studentStats = students.map(student => {
        const studentEvals = evaluations.filter(e => e.studentId === student.id)
        const totalMinus = studentEvals.reduce((sum, e) => sum + (e.totalMinus || 0), 0)
        return { ...student, evaluations: studentEvals, totalMinus }
    }).sort((a, b) => b.totalMinus - a.totalMinus)

    const totalMinus = evaluations.reduce((sum, e) => sum + (e.totalMinus || 0), 0)

    if (loading) {
        return (
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '60px 20px', color: 'rgba(255,255,255,0.5)' }}>
                <div style={{ fontSize: '32px', marginBottom: '12px' }}>⏳</div>
                <div>Yükleniyor...</div>
            </div>
        )
    }

    return (
        <div style={{ paddingBottom: '100px' }}>
            {/* Tab Bar */}
            <div style={{
                display: 'flex',
                gap: '8px',
                marginBottom: '16px',
                background: '#1a1a1a',
                padding: '6px',
                borderRadius: '12px'
            }}>
                {[
                    { key: 'daily', label: 'Günlük' },
                    { key: 'weekly', label: 'Haftalık' },
                    { key: 'monthly', label: 'Aylık' }
                ].map(tab => (
                    <button
                        key={tab.key}
                        onClick={() => setActiveTab(tab.key)}
                        style={{
                            flex: 1,
                            padding: '10px 12px',
                            borderRadius: '8px',
                            border: 'none',
                            background: activeTab === tab.key ? '#d4af37' : 'transparent',
                            color: activeTab === tab.key ? '#000' : 'rgba(255,255,255,0.5)',
                            fontSize: '13px',
                            fontWeight: '600',
                            cursor: 'pointer',
                            transition: 'all 0.2s ease'
                        }}
                    >
                        {tab.label}
                    </button>
                ))}
            </div>

            {/* Tarih Seçimi */}
            <div style={{
                background: '#1e1e1e',
                borderRadius: '14px',
                padding: '16px',
                marginBottom: '16px',
                border: '1px solid rgba(255,255,255,0.08)'
            }}>
                <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap' }}>
                    <div style={{ flex: 1, minWidth: '130px' }}>
                        <label style={{ display: 'block', fontSize: '12px', color: 'rgba(255,255,255,0.5)', marginBottom: '6px' }}>Başlangıç</label>
                        <input
                            type="date"
                            value={dateRange.start}
                            onChange={(e) => setDateRange({ ...dateRange, start: e.target.value })}
                            style={{
                                width: '100%',
                                padding: '10px 12px',
                                borderRadius: '8px',
                                border: '1px solid rgba(255,255,255,0.1)',
                                background: 'rgba(0,0,0,0.3)',
                                color: '#fff',
                                fontSize: '14px',
                                outline: 'none',
                                boxSizing: 'border-box'
                            }}
                        />
                    </div>
                    <div style={{ flex: 1, minWidth: '130px' }}>
                        <label style={{ display: 'block', fontSize: '12px', color: 'rgba(255,255,255,0.5)', marginBottom: '6px' }}>Bitiş</label>
                        <input
                            type="date"
                            value={dateRange.end}
                            onChange={(e) => setDateRange({ ...dateRange, end: e.target.value })}
                            style={{
                                width: '100%',
                                padding: '10px 12px',
                                borderRadius: '8px',
                                border: '1px solid rgba(255,255,255,0.1)',
                                background: 'rgba(0,0,0,0.3)',
                                color: '#fff',
                                fontSize: '14px',
                                outline: 'none',
                                boxSizing: 'border-box'
                            }}
                        />
                    </div>
                </div>
            </div>

            {/* Özet Kartı */}
            <div style={{
                background: 'linear-gradient(135deg, #1a1a2e 0%, #16213e 100%)',
                borderRadius: '14px',
                padding: '16px',
                marginBottom: '16px',
                border: '1px solid rgba(212, 175, 55, 0.2)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-around'
            }}>
                <div style={{ textAlign: 'center' }}>
                    <div style={{ fontSize: '24px', fontWeight: '700', color: '#fff' }}>{evaluations.length}</div>
                    <div style={{ fontSize: '11px', color: 'rgba(255,255,255,0.5)' }}>Değerlendirme</div>
                </div>
                <div style={{ width: '1px', height: '40px', background: 'rgba(255,255,255,0.1)' }}></div>
                <div style={{ textAlign: 'center' }}>
                    <div style={{ fontSize: '24px', fontWeight: '700', color: totalMinus === 0 ? '#10b981' : '#ef4444' }}>{totalMinus}</div>
                    <div style={{ fontSize: '11px', color: 'rgba(255,255,255,0.5)' }}>Toplam Eksi</div>
                </div>
            </div>

            {/* Excel Butonu */}
            <button
                onClick={handleExport}
                disabled={exporting || evaluations.length === 0}
                style={{
                    width: '100%',
                    padding: '14px',
                    borderRadius: '12px',
                    border: 'none',
                    background: evaluations.length === 0 ? 'rgba(255,255,255,0.05)' : 'linear-gradient(135deg, #d4af37 0%, #b8962e 100%)',
                    color: evaluations.length === 0 ? 'rgba(255,255,255,0.3)' : '#000',
                    fontSize: '14px',
                    fontWeight: '700',
                    cursor: evaluations.length === 0 ? 'not-allowed' : 'pointer',
                    marginBottom: '20px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '8px'
                }}
            >
                📊 {exporting ? 'Hazırlanıyor...' : 'Excel Olarak İndir'}
            </button>

            {loadingEvaluations && (
                <div style={{ textAlign: 'center', color: 'rgba(255,255,255,0.5)', marginBottom: '16px' }}>
                    Değerlendirmeler yükleniyor...
                </div>
            )}

            {/* Talebe Listesi */}
            <div style={{ marginBottom: '12px' }}>
                <h3 style={{ fontSize: '14px', color: 'rgba(255,255,255,0.4)', fontWeight: '500', letterSpacing: '1px', textTransform: 'uppercase' }}>
                    Talebe Bazlı Sonuçlar
                </h3>
            </div>

            {studentStats.length === 0 ? (
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '40px 20px', opacity: 0.5 }}>
                    <div style={{ fontSize: '48px', marginBottom: '12px' }}>📊</div>
                    <p style={{ color: 'rgba(255,255,255,0.6)' }}>Talebe bulunamadı</p>
                </div>
            ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                    {studentStats.map(student => (
                        <StudentReportItem
                            key={student.id}
                            student={student}
                            formatDate={formatDate}
                            onDeleteEvaluation={handleDeleteClick}
                        />
                    ))}
                </div>
            )}

            {/* Delete Modal */}
            {showDeleteModal && (
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
                }} onClick={() => setShowDeleteModal(false)}>
                    <div style={{
                        width: '100%',
                        maxWidth: '360px',
                        background: '#1e1e1e',
                        borderRadius: '20px',
                        border: '1px solid rgba(255,255,255,0.1)',
                        overflow: 'hidden'
                    }} onClick={e => e.stopPropagation()}>
                        <div style={{ padding: '20px', borderBottom: '1px solid rgba(255,255,255,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                            <h3 style={{ margin: 0, fontSize: '18px', fontWeight: '700', color: '#fff' }}>Silme Onayı</h3>
                            <button onClick={() => setShowDeleteModal(false)} style={{ background: 'none', border: 'none', color: 'rgba(255,255,255,0.4)', fontSize: '20px', cursor: 'pointer' }}>✕</button>
                        </div>
                        <div style={{ padding: '20px' }}>
                            <p style={{ color: 'rgba(255,255,255,0.8)', fontSize: '14px', margin: 0, lineHeight: 1.5 }}>
                                <strong>{getStudentName(selectedEvaluation?.studentId)}</strong> adlı talebenin <strong>{formatDate(selectedEvaluation?.date)}</strong> tarihli değerlendirmesini silmek istiyor musunuz?
                            </p>
                        </div>
                        <div style={{ padding: '16px 20px', borderTop: '1px solid rgba(255,255,255,0.1)', display: 'flex', gap: '12px' }}>
                            <button onClick={() => setShowDeleteModal(false)} style={{ flex: 1, padding: '12px', borderRadius: '10px', background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', color: '#fff', fontSize: '14px', fontWeight: '600', cursor: 'pointer' }}>İptal</button>
                            <button onClick={handleConfirmDelete} style={{ flex: 1, padding: '12px', borderRadius: '10px', background: '#ef4444', border: 'none', color: '#fff', fontSize: '14px', fontWeight: '700', cursor: 'pointer' }}>Sil</button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    )
}

function StudentReportItem({ student, formatDate, onDeleteEvaluation }) {
    const [isExpanded, setIsExpanded] = useState(false)

    const evaluationsWithMinus = student.evaluations.filter(e => e.totalMinus > 0).sort((a, b) => b.date - a.date)

    const detailedMinuses = evaluationsWithMinus.map(evaluation => {
        const minusParams = []
        if (evaluation.parameters) {
            Object.entries(EVALUATION_PARAMS).forEach(([key, { label, icon, type }]) => {
                const value = evaluation.parameters[key]
                let isMinus = false
                if (type === 'positive' && value === false) isMinus = true
                else if (type === 'negative' && value === true) isMinus = true
                if (isMinus) minusParams.push({ label: label.replace('?', ''), icon })
            })
        }
        return { id: evaluation.id, date: evaluation.date, params: minusParams, rawEvaluation: evaluation }
    })

    return (
        <div style={{
            background: '#1e1e1e',
            borderRadius: '14px',
            overflow: 'hidden',
            border: '1px solid rgba(255,255,255,0.08)'
        }}>
            {/* Özet */}
            <div
                onClick={() => setIsExpanded(!isExpanded)}
                style={{
                    padding: '14px 16px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    cursor: 'pointer',
                    background: isExpanded ? 'rgba(255,255,255,0.03)' : 'transparent'
                }}
            >
                <div>
                    <div style={{ fontWeight: '600', color: '#fff', fontSize: '15px' }}>{student.name}</div>
                    <div style={{ fontSize: '12px', color: 'rgba(255,255,255,0.4)', marginTop: '2px' }}>
                        {student.evaluations.length} değerlendirme • {student.totalMinus === 0 ? 'Tam Puan' : `${student.totalMinus} Eksi`}
                    </div>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                    <span style={{
                        padding: '4px 10px',
                        borderRadius: '20px',
                        fontSize: '12px',
                        fontWeight: '600',
                        background: student.totalMinus === 0 ? 'rgba(16, 185, 129, 0.15)' : 'rgba(239, 68, 68, 0.15)',
                        color: student.totalMinus === 0 ? '#10b981' : '#ef4444'
                    }}>
                        {student.totalMinus === 0 ? '0' : `-${student.totalMinus}`}
                    </span>
                    <span style={{ color: 'rgba(255,255,255,0.3)', transform: isExpanded ? 'rotate(180deg)' : 'rotate(0deg)', transition: 'transform 0.2s' }}>▼</span>
                </div>
            </div>

            {/* Detaylar */}
            {isExpanded && (
                <div style={{ borderTop: '1px solid rgba(255,255,255,0.08)', background: 'rgba(0,0,0,0.2)' }}>
                    {detailedMinuses.length === 0 ? (
                        <div style={{ padding: '20px', textAlign: 'center', color: '#10b981' }}>
                            ✨ Hiç eksi yok, tebrikler!
                            <div style={{ marginTop: '6px', fontSize: '12px', color: 'rgba(255,255,255,0.4)' }}>
                                ({student.evaluations.length} değerlendirme kaydı var)
                            </div>
                        </div>
                    ) : (
                        <div>
                            {detailedMinuses.map((item, idx) => (
                                <div key={item.id} style={{ padding: '12px 16px', borderBottom: idx !== detailedMinuses.length - 1 ? '1px dashed rgba(255,255,255,0.08)' : 'none' }}>
                                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                                        <div style={{ fontWeight: '500', color: '#d4af37', fontSize: '13px' }}>{formatDate(item.date)}</div>
                                        <button
                                            onClick={(e) => { e.stopPropagation(); onDeleteEvaluation(item.rawEvaluation) }}
                                            style={{
                                                padding: '4px 10px',
                                                borderRadius: '6px',
                                                background: 'rgba(239, 68, 68, 0.15)',
                                                border: 'none',
                                                color: '#ef4444',
                                                fontSize: '11px',
                                                fontWeight: '500',
                                                cursor: 'pointer'
                                            }}
                                        >
                                            Sil
                                        </button>
                                    </div>
                                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
                                        {item.params.map((param, pIdx) => (
                                            <span key={pIdx} style={{
                                                display: 'inline-flex',
                                                alignItems: 'center',
                                                gap: '4px',
                                                padding: '4px 10px',
                                                borderRadius: '6px',
                                                background: 'rgba(239, 68, 68, 0.15)',
                                                color: '#fca5a5',
                                                fontSize: '12px'
                                            }}>
                                                {param.icon} {param.label}
                                            </span>
                                        ))}
                                    </div>
                                    {item.rawEvaluation.notes && (
                                        <div style={{ marginTop: '8px', fontSize: '12px', color: 'rgba(255,255,255,0.5)', fontStyle: 'italic' }}>
                                            📝 {item.rawEvaluation.notes}
                                        </div>
                                    )}
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            )}
        </div>
    )
}

const formatDate = (timestamp) => {
    if (!timestamp) return ''
    const date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp)
    return date.toLocaleDateString('tr-TR', { day: 'numeric', month: 'short', weekday: 'short' })
}

export default Reports
