import { useState, useEffect } from 'react'
import { getAllNotes, addNote, updateNote, deleteNote, getComments, addComment, deleteComment, addNotification, getAllUsers, markAllNotificationsAsRead } from '../firebase/firestore'
import { useToast } from '../components/Toast'
import { useAuth } from '../context/AuthContext'

function Notes() {
    const [notes, setNotes] = useState([])
    const [loading, setLoading] = useState(true)
    const [isEditing, setIsEditing] = useState(false)
    const [currentNote, setCurrentNote] = useState({ title: '', content: '' })
    const [showForm, setShowForm] = useState(false)
    const [saving, setSaving] = useState(false)
    const [expandedNoteId, setExpandedNoteId] = useState(null)
    const [comments, setComments] = useState({})
    const [newComment, setNewComment] = useState('')
    const [loadingComments, setLoadingComments] = useState({})

    const toast = useToast()
    const { userProfile } = useAuth()

    useEffect(() => {
        loadNotes()
        // Sayfaya girildiğinde bildirimleri okundu olarak işaretle
        if (userProfile?.id) {
            markAllNotificationsAsRead(userProfile.id).catch(console.error)
        }
    }, [userProfile?.id])

    const loadNotes = async () => {
        try {
            setLoading(true)
            const notesData = await getAllNotes()
            setNotes(notesData)
        } catch (error) {
            console.error('Error loading notes:', error)
            toast.error('Notlar yüklenirken hata oluştu')
        } finally {
            setLoading(false)
        }
    }

    const loadComments = async (noteId) => {
        try {
            setLoadingComments(prev => ({ ...prev, [noteId]: true }))
            const commentsData = await getComments(noteId)
            setComments(prev => ({ ...prev, [noteId]: commentsData }))
        } catch (error) {
            console.error('Error loading comments:', error)
        } finally {
            setLoadingComments(prev => ({ ...prev, [noteId]: false }))
        }
    }

    const handleToggleExpand = async (noteId) => {
        if (expandedNoteId === noteId) {
            setExpandedNoteId(null)
        } else {
            setExpandedNoteId(noteId)
            if (!comments[noteId]) {
                await loadComments(noteId)
            }
        }
    }

    // Diğer tüm kullanıcılara bildirim gönder
    const notifyOtherUsers = async (message, noteId) => {
        try {
            const allUsers = await getAllUsers()
            const otherUsers = allUsers.filter(u => u.id !== userProfile?.id)

            const promises = otherUsers.map(user =>
                addNotification({
                    userId: user.id,
                    type: 'note',
                    message: message,
                    noteId: noteId,
                    fromUserId: userProfile?.id,
                    fromUserName: userProfile?.name
                })
            )
            await Promise.all(promises)
        } catch (error) {
            console.error('Error sending notifications:', error)
        }
    }

    const handleSubmit = async (e) => {
        e.preventDefault()
        if (!currentNote.title && !currentNote.content) {
            toast.warning('Not boş olamaz')
            return
        }

        try {
            setSaving(true)
            if (isEditing && currentNote.id) {
                await updateNote(currentNote.id, {
                    title: currentNote.title,
                    content: currentNote.content
                })
                toast.success('Not güncellendi')
            } else {
                const noteId = await addNote({
                    title: currentNote.title,
                    content: currentNote.content,
                    userId: userProfile?.id,
                    userName: userProfile?.name || 'Anonim'
                })
                toast.success('Not eklendi')

                // Diğer kullanıcılara bildirim gönder
                await notifyOtherUsers(
                    `${userProfile?.name || 'Birisi'} yeni not ekledi: "${currentNote.title || 'Başlıksız Not'}"`,
                    noteId
                )
            }

            setShowForm(false)
            setCurrentNote({ title: '', content: '' })
            setIsEditing(false)
            loadNotes()
        } catch (error) {
            console.error('Error saving note:', error)
            toast.error('Kaydetme hatası')
        } finally {
            setSaving(false)
        }
    }

    const handleEdit = (note) => {
        setCurrentNote(note)
        setIsEditing(true)
        setShowForm(true)
    }

    const handleDelete = async (id) => {
        if (!window.confirm('Bu notu silmek istediğinize emin misiniz?')) return

        try {
            await deleteNote(id)
            toast.success('Not silindi')
            loadNotes()
        } catch (error) {
            console.error('Error deleting note:', error)
            toast.error('Silme hatası')
        }
    }

    const handleCancel = () => {
        setShowForm(false)
        setCurrentNote({ title: '', content: '' })
        setIsEditing(false)
    }

    const handleAddComment = async (note) => {
        if (!newComment.trim()) return

        try {
            await addComment(note.id, {
                text: newComment,
                userId: userProfile?.id,
                userName: userProfile?.name || 'Anonim'
            })

            // Diğer tüm kullanıcılara bildirim gönder
            await notifyOtherUsers(
                `${userProfile?.name || 'Birisi'} bir nota yorum yaptı: "${note.title || 'Başlıksız Not'}"`,
                note.id
            )

            setNewComment('')
            await loadComments(note.id)
            toast.success('Yorum eklendi')
        } catch (error) {
            console.error('Error adding comment:', error)
            toast.error('Yorum eklenemedi')
        }
    }

    const handleDeleteComment = async (noteId, commentId) => {
        try {
            await deleteComment(noteId, commentId)
            await loadComments(noteId)
            toast.success('Yorum silindi')
        } catch (error) {
            console.error('Error deleting comment:', error)
            toast.error('Yorum silinemedi')
        }
    }

    const formatDate = (timestamp) => {
        if (!timestamp) return ''
        const date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp)
        return date.toLocaleDateString('tr-TR', {
            day: 'numeric',
            month: 'short',
            hour: '2-digit',
            minute: '2-digit'
        })
    }

    if (loading) {
        return (
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '60px 20px', color: 'rgba(255,255,255,0.5)' }}>
                <div style={{ fontSize: '32px', marginBottom: '12px' }}>⏳</div>
                <div>Notlar yükleniyor...</div>
            </div>
        )
    }

    return (
        <div style={{ paddingBottom: '100px' }}>
            {/* Header */}
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '20px' }}>
                <div>
                    <h2 style={{ fontSize: '20px', fontWeight: '700', color: '#fff', margin: 0 }}>Hususi Notlar</h2>
                    <p style={{ fontSize: '13px', color: 'rgba(255,255,255,0.5)', margin: '4px 0 0 0' }}>{notes.length} adet not</p>
                </div>
                {!showForm && (
                    <button
                        onClick={() => {
                            setCurrentNote({ title: '', content: '' })
                            setIsEditing(false)
                            setShowForm(true)
                        }}
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
                        + Yeni Not
                    </button>
                )}
            </div>

            {/* Form */}
            {showForm && (
                <div style={{
                    background: '#1e1e1e',
                    borderRadius: '16px',
                    padding: '20px',
                    marginBottom: '20px',
                    border: '1px solid rgba(212, 175, 55, 0.3)'
                }}>
                    <form onSubmit={handleSubmit}>
                        <input
                            type="text"
                            placeholder="Başlık (Opsiyonel)"
                            value={currentNote.title}
                            onChange={e => setCurrentNote({ ...currentNote, title: e.target.value })}
                            style={{
                                width: '100%',
                                padding: '12px 14px',
                                borderRadius: '10px',
                                border: '1px solid rgba(255,255,255,0.1)',
                                background: 'rgba(0,0,0,0.3)',
                                color: '#fff',
                                fontSize: '15px',
                                fontWeight: '600',
                                marginBottom: '12px',
                                outline: 'none',
                                boxSizing: 'border-box'
                            }}
                        />
                        <textarea
                            placeholder="Not içeriği..."
                            rows={5}
                            value={currentNote.content}
                            onChange={e => setCurrentNote({ ...currentNote, content: e.target.value })}
                            autoFocus
                            style={{
                                width: '100%',
                                padding: '12px 14px',
                                borderRadius: '10px',
                                border: '1px solid rgba(255,255,255,0.1)',
                                background: 'rgba(0,0,0,0.3)',
                                color: '#fff',
                                fontSize: '14px',
                                resize: 'vertical',
                                marginBottom: '16px',
                                outline: 'none',
                                boxSizing: 'border-box'
                            }}
                        />
                        <div style={{ display: 'flex', gap: '12px' }}>
                            <button
                                type="button"
                                onClick={handleCancel}
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
                                {saving ? 'Kaydediliyor...' : (isEditing ? 'Güncelle' : 'Kaydet')}
                            </button>
                        </div>
                    </form>
                </div>
            )}

            {/* Liste */}
            {notes.length === 0 ? (
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '60px 20px', opacity: 0.5 }}>
                    <div style={{ fontSize: '48px', marginBottom: '12px' }}>📝</div>
                    <p style={{ color: 'rgba(255,255,255,0.6)' }}>Henüz not eklenmemiş</p>
                </div>
            ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                    {notes.map(note => {
                        const isExpanded = expandedNoteId === note.id
                        const noteComments = comments[note.id] || []
                        const isLoadingComments = loadingComments[note.id]

                        return (
                            <div
                                key={note.id}
                                style={{
                                    background: '#1e1e1e',
                                    borderRadius: '14px',
                                    overflow: 'hidden',
                                    border: '1px solid rgba(255,255,255,0.08)'
                                }}
                            >
                                {/* Note Header */}
                                <div style={{ padding: '16px' }}>
                                    <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: '8px' }}>
                                        <div style={{ flex: 1 }}>
                                            <div style={{ fontWeight: '600', color: '#fff', fontSize: '16px' }}>
                                                {note.title || 'Başlıksız Not'}
                                            </div>
                                            <div style={{ fontSize: '11px', color: 'rgba(255,255,255,0.4)', marginTop: '2px' }}>
                                                {note.userName || 'Anonim'} • {formatDate(note.updatedAt)}
                                            </div>
                                        </div>
                                    </div>
                                    <div style={{
                                        whiteSpace: 'pre-wrap',
                                        color: 'rgba(255,255,255,0.7)',
                                        fontSize: '14px',
                                        lineHeight: '1.5',
                                        marginBottom: '12px'
                                    }}>
                                        {note.content}
                                    </div>

                                    {/* Actions */}
                                    <div style={{
                                        display: 'flex',
                                        justifyContent: 'space-between',
                                        alignItems: 'center',
                                        paddingTop: '12px',
                                        borderTop: '1px solid rgba(255,255,255,0.08)'
                                    }}>
                                        <button
                                            onClick={() => handleToggleExpand(note.id)}
                                            style={{
                                                background: 'none',
                                                border: 'none',
                                                color: '#6366f1',
                                                fontSize: '13px',
                                                fontWeight: '500',
                                                cursor: 'pointer',
                                                display: 'flex',
                                                alignItems: 'center',
                                                gap: '4px'
                                            }}
                                        >
                                            💬 {isExpanded ? 'Yorumları Gizle' : 'Yorumlar'}
                                            {noteComments.length > 0 && !isExpanded && (
                                                <span style={{
                                                    background: '#6366f1',
                                                    color: '#fff',
                                                    fontSize: '10px',
                                                    padding: '2px 6px',
                                                    borderRadius: '10px',
                                                    marginLeft: '4px'
                                                }}>
                                                    {noteComments.length}
                                                </span>
                                            )}
                                        </button>
                                        <div style={{ display: 'flex', gap: '12px' }}>
                                            {note.userId === userProfile?.id && (
                                                <>
                                                    <button
                                                        onClick={() => handleEdit(note)}
                                                        style={{
                                                            background: 'none',
                                                            border: 'none',
                                                            color: '#d4af37',
                                                            fontSize: '13px',
                                                            fontWeight: '500',
                                                            cursor: 'pointer'
                                                        }}
                                                    >
                                                        ✏️ Düzenle
                                                    </button>
                                                    <button
                                                        onClick={() => handleDelete(note.id)}
                                                        style={{
                                                            background: 'none',
                                                            border: 'none',
                                                            color: '#ef4444',
                                                            fontSize: '13px',
                                                            fontWeight: '500',
                                                            cursor: 'pointer'
                                                        }}
                                                    >
                                                        🗑️ Sil
                                                    </button>
                                                </>
                                            )}
                                        </div>
                                    </div>
                                </div>

                                {/* Comments Section */}
                                {isExpanded && (
                                    <div style={{
                                        background: 'rgba(0,0,0,0.2)',
                                        borderTop: '1px solid rgba(255,255,255,0.08)',
                                        padding: '16px'
                                    }}>
                                        {isLoadingComments ? (
                                            <div style={{ textAlign: 'center', color: 'rgba(255,255,255,0.5)', padding: '12px' }}>
                                                Yorumlar yükleniyor...
                                            </div>
                                        ) : (
                                            <>
                                                {noteComments.length === 0 ? (
                                                    <div style={{ textAlign: 'center', color: 'rgba(255,255,255,0.4)', fontSize: '13px', padding: '8px 0' }}>
                                                        Henüz yorum yok
                                                    </div>
                                                ) : (
                                                    <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', marginBottom: '16px' }}>
                                                        {noteComments.map(comment => (
                                                            <div key={comment.id} style={{
                                                                background: 'rgba(255,255,255,0.05)',
                                                                borderRadius: '10px',
                                                                padding: '10px 12px'
                                                            }}>
                                                                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px' }}>
                                                                    <span style={{ fontSize: '12px', fontWeight: '600', color: '#d4af37' }}>
                                                                        {comment.userName || 'Anonim'}
                                                                    </span>
                                                                    <span style={{ fontSize: '10px', color: 'rgba(255,255,255,0.4)' }}>
                                                                        {formatDate(comment.createdAt)}
                                                                    </span>
                                                                </div>
                                                                <div style={{ fontSize: '13px', color: 'rgba(255,255,255,0.8)' }}>
                                                                    {comment.text}
                                                                </div>
                                                                {comment.userId === userProfile?.id && (
                                                                    <button
                                                                        onClick={() => handleDeleteComment(note.id, comment.id)}
                                                                        style={{
                                                                            background: 'none',
                                                                            border: 'none',
                                                                            color: '#ef4444',
                                                                            fontSize: '11px',
                                                                            marginTop: '6px',
                                                                            cursor: 'pointer',
                                                                            padding: 0
                                                                        }}
                                                                    >
                                                                        Sil
                                                                    </button>
                                                                )}
                                                            </div>
                                                        ))}
                                                    </div>
                                                )}

                                                {/* Add Comment */}
                                                <div style={{ display: 'flex', gap: '8px' }}>
                                                    <input
                                                        type="text"
                                                        placeholder="Yorum yaz..."
                                                        value={newComment}
                                                        onChange={(e) => setNewComment(e.target.value)}
                                                        onKeyPress={(e) => e.key === 'Enter' && handleAddComment(note)}
                                                        style={{
                                                            flex: 1,
                                                            padding: '10px 12px',
                                                            borderRadius: '10px',
                                                            border: '1px solid rgba(255,255,255,0.1)',
                                                            background: 'rgba(0,0,0,0.3)',
                                                            color: '#fff',
                                                            fontSize: '13px',
                                                            outline: 'none'
                                                        }}
                                                    />
                                                    <button
                                                        onClick={() => handleAddComment(note)}
                                                        style={{
                                                            padding: '10px 16px',
                                                            borderRadius: '10px',
                                                            border: 'none',
                                                            background: '#6366f1',
                                                            color: '#fff',
                                                            fontSize: '13px',
                                                            fontWeight: '600',
                                                            cursor: 'pointer'
                                                        }}
                                                    >
                                                        Gönder
                                                    </button>
                                                </div>
                                            </>
                                        )}
                                    </div>
                                )}
                            </div>
                        )
                    })}
                </div>
            )}
        </div>
    )
}

export default Notes
