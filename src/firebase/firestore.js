// Firestore CRUD Operations
import {
    collection,
    addDoc,
    updateDoc,
    deleteDoc,
    doc,
    getDocs,
    getDoc,
    setDoc,
    query,
    where,
    orderBy,
    Timestamp,
    limit
} from 'firebase/firestore'
import { db } from './config'

// STUDENTS COLLECTION
const studentsRef = collection(db, 'students')

// Tüm talebeleri getir
export const getAllStudents = async () => {
    try {
        const snapshot = await getDocs(query(studentsRef, orderBy('name')))
        return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }))
    } catch (error) {
        console.error('Error fetching students:', error)
        throw error
    }
}

// Yeni talebe ekle
export const addStudent = async (studentData) => {
    try {
        const docRef = await addDoc(studentsRef, {
            ...studentData,
            createdAt: Timestamp.now()
        })
        return docRef.id
    } catch (error) {
        console.error('Error adding student:', error)
        throw error
    }
}

// Talebe güncelle
export const updateStudent = async (id, studentData) => {
    try {
        const docRef = doc(db, 'students', id)
        await updateDoc(docRef, {
            ...studentData,
            updatedAt: Timestamp.now()
        })
    } catch (error) {
        console.error('Error updating student:', error)
        throw error
    }
}

// Talebe sil
export const deleteStudent = async (id) => {
    try {
        await deleteDoc(doc(db, 'students', id))
    } catch (error) {
        console.error('Error deleting student:', error)
        throw error
    }
}

// Tek talebe getir
export const getStudent = async (id) => {
    try {
        const docRef = doc(db, 'students', id)
        const docSnap = await getDoc(docRef)

        if (docSnap.exists()) {
            return { id: docSnap.id, ...docSnap.data() }
        } else {
            return null
        }
    } catch (error) {
        console.error('Error fetching student:', error)
        throw error
    }
}

// EVALUATIONS COLLECTION
const evaluationsRef = collection(db, 'evaluations')

// Değerlendirme Parametreleri
export const EVALUATION_PARAMS = {
    bed: { label: 'Kullandığı Yatağı düzgün', icon: '🛏️', type: 'positive' },
    desk: { label: 'Kullandığı masa ve sandalyesi', icon: '🪑', type: 'positive' },
    bookshelf: { label: 'Kitaplığı düzgün', icon: '📚', type: 'positive' },
    cleanliness: { label: 'Temizlik mahali temiz', icon: '🧹', type: 'positive' },
    bullying: { label: 'Zorbalık şikayeti', icon: '👊', type: 'negative' },
    programCompliance: { label: 'Yurt programına riayet', icon: '📅', type: 'positive' },
    classDismissal: { label: 'Dersten kovulma', icon: '🚪', type: 'negative' },
    dressCode: { label: 'Kılık kıyafet tertip düzen', icon: '👔', type: 'positive' },
    phoneCaught: { label: 'Telefon Yakalatma', icon: '📱', type: 'negative' }
}

// Bugünkü değerlendirmeleri getir
export const getTodayEvaluations = async () => {
    try {
        const today = new Date()
        const startOfDay = new Date(today)
        startOfDay.setHours(0, 0, 0, 0)

        const endOfDay = new Date(today)
        endOfDay.setHours(23, 59, 59, 999)

        const startTimestamp = Timestamp.fromDate(startOfDay)
        const endTimestamp = Timestamp.fromDate(endOfDay)

        const q = query(
            evaluationsRef,
            where('date', '>=', startTimestamp),
            where('date', '<=', endTimestamp),
            orderBy('date', 'desc')
        )

        const snapshot = await getDocs(q)
        return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }))
    } catch (error) {
        console.error('Error fetching today evaluations:', error)
        throw error
    }
}

// Belirli bir tarih aralığındaki değerlendirmeleri getir
export const getEvaluationsByDateRange = async (startDateStr, endDateStr) => {
    try {
        const start = new Date(startDateStr)
        start.setHours(0, 0, 0, 0)

        const end = new Date(endDateStr)
        end.setHours(23, 59, 59, 999)

        const q = query(
            evaluationsRef,
            where('date', '>=', Timestamp.fromDate(start)),
            where('date', '<=', Timestamp.fromDate(end)),
            orderBy('date', 'desc')
        )

        const snapshot = await getDocs(q)
        return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }))
    } catch (error) {
        console.error('Error fetching evaluations by date:', error)
        throw error
    }
}

// Mevcut değerlendirmeyi kontrol et (Upsert için helper)
export const getExistingEvaluation = async (studentId, date) => {
    try {
        const evalDate = date.toDate ? date.toDate() : new Date(date)

        // Sadece studentId ile sorgula (composite index hatasını önlemek için)
        const q = query(
            evaluationsRef,
            where('studentId', '==', studentId)
        )

        const snapshot = await getDocs(q)

        // Tarih kontrolünü client-side yap (YYYY-MM-DD olarak)
        const targetDateStr = evalDate.toLocaleDateString('en-CA')

        for (const docSnapshot of snapshot.docs) {
            const data = docSnapshot.data()
            const docDate = data.date?.toDate ? data.date.toDate() : new Date(data.date)
            const docDateStr = docDate.toLocaleDateString('en-CA')

            if (docDateStr === targetDateStr) {
                return { id: docSnapshot.id, ...data }
            }
        }

        return null
    } catch (error) {
        console.error('Error checking existing evaluation:', error)
        throw error
    }
}

// Helper: Puan Hesaplama
const calculateTotalMinus = (parameters) => {
    let totalMinus = 0
    Object.keys(EVALUATION_PARAMS).forEach(key => {
        const param = EVALUATION_PARAMS[key]
        const value = parameters[key]

        if (param.type === 'positive') {
            // Olumlu madde (örn: Yatak Düzgün): FALSE ise eksi puan
            if (value === false) totalMinus += 1
        } else if (param.type === 'negative') {
            // Olumsuz madde (örn: Telefon Yakalatma): TRUE ise eksi puan
            if (value === true) totalMinus += 1
        }
    })
    return totalMinus
}

// Yeni değerlendirme ekle veya varsa güncelle (Upsert Logic)
export const addEvaluation = async (evaluationData) => {
    try {
        // Calculate minus points
        const parameters = evaluationData.parameters || {}
        const totalMinus = calculateTotalMinus(parameters)

        // Check for existing evaluation
        const existingEval = await getExistingEvaluation(
            evaluationData.studentId,
            evaluationData.date
        )

        if (existingEval) {
            // Update existing evaluation
            const docRef = doc(db, 'evaluations', existingEval.id)
            await updateDoc(docRef, {
                ...evaluationData,
                totalMinus,
                updatedAt: Timestamp.now()
            })
            return { id: existingEval.id, updated: true }
        } else {
            // Add new evaluation
            const docRef = await addDoc(evaluationsRef, {
                ...evaluationData,
                totalMinus,
                createdAt: Timestamp.now()
            })
            return { id: docRef.id, updated: false }
        }
    } catch (error) {
        console.error('Error adding/updating evaluation:', error)
        throw error
    }
}

// Değerlendirme güncelle (Direct update)
export const updateEvaluation = async (id, evaluationData) => {
    try {
        // Recalculate minus points if parameters provided
        let updateData = { ...evaluationData }

        if (evaluationData.parameters) {
            updateData.totalMinus = calculateTotalMinus(evaluationData.parameters)
        }

        const docRef = doc(db, 'evaluations', id)
        await updateDoc(docRef, {
            ...updateData,
            updatedAt: Timestamp.now()
        })
    } catch (error) {
        console.error('Error updating evaluation:', error)
        throw error
    }
}

// Değerlendirme sil
export const deleteEvaluation = async (id) => {
    try {
        await deleteDoc(doc(db, 'evaluations', id))
    } catch (error) {
        console.error('Error deleting evaluation:', error)
        throw error
    }
}

// Tüm değerlendirmeleri getir (Limitli)
export const getAllEvaluations = async () => {
    try {
        const snapshot = await getDocs(query(evaluationsRef, orderBy('date', 'desc'), limit(50)))
        return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }))
    } catch (error) {
        console.error('Error fetching all evaluations:', error)
        throw error
    }
}

// NOTES COLLECTION
const notesRef = collection(db, 'notes')

// Tüm notları getir (Tarihe göre sıralı)
export const getAllNotes = async () => {
    try {
        const snapshot = await getDocs(query(notesRef, orderBy('updatedAt', 'desc')))
        return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }))
    } catch (error) {
        console.error('Error fetching notes:', error)
        throw error
    }
}

// Yeni not ekle (userId bilgisi ile)
export const addNote = async (noteData) => {
    try {
        const docRef = await addDoc(notesRef, {
            ...noteData,
            createdAt: Timestamp.now(),
            updatedAt: Timestamp.now()
        })
        return docRef.id
    } catch (error) {
        console.error('Error adding note:', error)
        throw error
    }
}

// Not güncelle
export const updateNote = async (id, noteData) => {
    try {
        const docRef = doc(db, 'notes', id)
        await updateDoc(docRef, {
            ...noteData,
            updatedAt: Timestamp.now()
        })
    } catch (error) {
        console.error('Error updating note:', error)
        throw error
    }
}

// Not sil
export const deleteNote = async (id) => {
    try {
        await deleteDoc(doc(db, 'notes', id))
    } catch (error) {
        console.error('Error deleting note:', error)
        throw error
    }
}

// COMMENTS (Notes altında subcollection)
export const getComments = async (noteId) => {
    try {
        const commentsRef = collection(db, 'notes', noteId, 'comments')
        const snapshot = await getDocs(query(commentsRef, orderBy('createdAt', 'asc')))
        return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }))
    } catch (error) {
        console.error('Error fetching comments:', error)
        throw error
    }
}

export const addComment = async (noteId, commentData) => {
    try {
        const commentsRef = collection(db, 'notes', noteId, 'comments')
        const docRef = await addDoc(commentsRef, {
            ...commentData,
            createdAt: Timestamp.now()
        })
        return docRef.id
    } catch (error) {
        console.error('Error adding comment:', error)
        throw error
    }
}

export const deleteComment = async (noteId, commentId) => {
    try {
        await deleteDoc(doc(db, 'notes', noteId, 'comments', commentId))
    } catch (error) {
        console.error('Error deleting comment:', error)
        throw error
    }
}

// NOTIFICATIONS COLLECTION
const notificationsRef = collection(db, 'notifications')

// Kullanıcıya ait bildirimleri getir
export const getNotifications = async (userId) => {
    try {
        const q = query(
            notificationsRef,
            where('userId', '==', userId),
            orderBy('createdAt', 'desc'),
            limit(50)
        )
        const snapshot = await getDocs(q)
        return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }))
    } catch (error) {
        console.error('Error fetching notifications:', error)
        throw error
    }
}

// Okunmamış bildirim sayısını getir (composite index olmadan)
export const getUnreadNotificationCount = async (userId) => {
    try {
        // Sadece userId ile sorgula (index gerekmez)
        const q = query(
            notificationsRef,
            where('userId', '==', userId)
        )
        const snapshot = await getDocs(q)
        // Client-side'da read==false olanları say
        let count = 0
        snapshot.docs.forEach(doc => {
            if (doc.data().read === false) {
                count++
            }
        })
        return count
    } catch (error) {
        console.error('Error fetching unread count:', error)
        return 0
    }
}

// Yeni bildirim oluştur
export const addNotification = async (notificationData) => {
    try {
        const docRef = await addDoc(notificationsRef, {
            ...notificationData,
            read: false,
            createdAt: Timestamp.now()
        })
        return docRef.id
    } catch (error) {
        console.error('Error adding notification:', error)
        throw error
    }
}

// Bildirimi okundu olarak işaretle
export const markNotificationAsRead = async (notificationId) => {
    try {
        const docRef = doc(db, 'notifications', notificationId)
        await updateDoc(docRef, { read: true })
    } catch (error) {
        console.error('Error marking notification as read:', error)
        throw error
    }
}

// Tüm bildirimleri okundu olarak işaretle
export const markAllNotificationsAsRead = async (userId) => {
    try {
        const q = query(
            notificationsRef,
            where('userId', '==', userId),
            where('read', '==', false)
        )
        const snapshot = await getDocs(q)
        const updatePromises = snapshot.docs.map(docSnap =>
            updateDoc(doc(db, 'notifications', docSnap.id), { read: true })
        )
        await Promise.all(updatePromises)
    } catch (error) {
        console.error('Error marking all as read:', error)
        throw error
    }
}

// USERS COLLECTION
const usersRef = collection(db, 'users')

export const getUserProfile = async (userId) => {
    try {
        const docRef = doc(db, 'users', userId)
        const docSnap = await getDoc(docRef)
        if (docSnap.exists()) {
            return { id: docSnap.id, ...docSnap.data() }
        }
        return null
    } catch (error) {
        console.error('Error fetching user profile:', error)
        throw error
    }
}

export const createUserProfile = async (userId, userData) => {
    try {
        const docRef = doc(db, 'users', userId)
        await setDoc(docRef, {
            ...userData,
            createdAt: Timestamp.now()
        })
    } catch (error) {
        console.error('Error creating user profile:', error)
        throw error
    }
}

export const getAllUsers = async () => {
    try {
        const snapshot = await getDocs(usersRef)
        return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }))
    } catch (error) {
        console.error('Error fetching users:', error)
        throw error
    }
}
