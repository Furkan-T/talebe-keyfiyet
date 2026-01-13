// Excel Export Utility using SheetJS (xlsx)
import * as XLSX from 'xlsx'
import { saveAs } from 'file-saver'

/**
 * Export data to Excel file
 * @param {Array} data - Array of objects to export
 * @param {string} fileName - Name of the file (without extension)
 * @param {Object} metadata - Optional metadata for the report
 */
export const exportToExcel = async (data, fileName, metadata = {}) => {
    try {
        // Yeni workbook oluştur
        const workbook = XLSX.utils.book_new()

        // Veri sayfası oluştur
        const worksheet = XLSX.utils.json_to_sheet(data)

        // Kolon genişliklerini ayarla
        const colWidths = []
        if (data.length > 0) {
            Object.keys(data[0]).forEach(key => {
                const maxLength = Math.max(
                    key.length,
                    ...data.map(row => String(row[key] || '').length)
                )
                colWidths.push({ wch: Math.min(maxLength + 2, 40) })
            })
        }
        worksheet['!cols'] = colWidths

        // Sayfayı workbook'a ekle
        XLSX.utils.book_append_sheet(workbook, worksheet, 'Değerlendirmeler')

        // Özet sayfası oluştur
        if (metadata.title) {
            const summaryData = [
                { 'Bilgi': 'Rapor Başlığı', 'Değer': metadata.title },
                { 'Bilgi': 'Tarih Aralığı', 'Değer': metadata.dateRange || '' },
                { 'Bilgi': 'Toplam Değerlendirme', 'Değer': metadata.totalEvaluations || 0 },
                { 'Bilgi': 'Toplam Eksi Puan', 'Değer': metadata.totalMinus || 0 },
                { 'Bilgi': 'Oluşturma Tarihi', 'Değer': new Date().toLocaleString('tr-TR') }
            ]

            const summarySheet = XLSX.utils.json_to_sheet(summaryData)
            summarySheet['!cols'] = [{ wch: 25 }, { wch: 40 }]
            XLSX.utils.book_append_sheet(workbook, summarySheet, 'Özet')
        }

        // Excel dosyasını binary olarak oluştur
        const excelBuffer = XLSX.write(workbook, {
            bookType: 'xlsx',
            type: 'array'
        })

        // Blob oluştur ve indir
        const blob = new Blob([excelBuffer], {
            type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
        })

        saveAs(blob, `${fileName}.xlsx`)

        return true
    } catch (error) {
        console.error('Excel export error:', error)
        throw error
    }
}

/**
 * Export student summary to Excel
 * @param {Array} students - Array of student objects
 * @param {Array} evaluations - Array of evaluation objects
 * @param {string} fileName - Name of the file
 */
export const exportStudentSummary = async (students, evaluations, fileName) => {
    const summaryData = students.map(student => {
        const studentEvals = evaluations.filter(e => e.studentId === student.id)
        const totalMinus = studentEvals.reduce((sum, e) => sum + (e.totalMinus || 0), 0)

        return {
            'İsim': student.name,
            'Oda': student.room || '-',
            'Değerlendirme Sayısı': studentEvals.length,
            'Toplam Eksi': totalMinus,
            'Ortalama Eksi': studentEvals.length > 0
                ? (totalMinus / studentEvals.length).toFixed(2)
                : 0
        }
    })

    return exportToExcel(summaryData, fileName, {
        title: 'Talebe Özet Raporu'
    })
}
