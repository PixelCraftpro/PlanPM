import React, { useState, useRef } from 'react'
import { Upload, X, FileText, FileSpreadsheet } from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'

interface ImportProgress {
  isImporting: boolean
  progress: number
  processedRows: number
  fileName: string
}

interface FileImporterProps {
  onDataImported: (data: any[]) => void
  darkMode: boolean
}

export const FileImporter: React.FC<FileImporterProps> = ({ onDataImported, darkMode }) => {
  const [importProgress, setImportProgress] = useState<ImportProgress>({
    isImporting: false,
    progress: 0,
    processedRows: 0,
    fileName: ''
  })
  
  const fileInputRef = useRef<HTMLInputElement>(null)
  const workerRef = useRef<Worker | null>(null)

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (!file) return

    const isXLSX = file.name.toLowerCase().endsWith('.xlsx')
    const isCSV = file.name.toLowerCase().endsWith('.csv')
    
    if (!isXLSX && !isCSV) {
      alert('Obsługiwane formaty: CSV, XLSX')
      return
    }

    setImportProgress({
      isImporting: true,
      progress: 0,
      processedRows: 0,
      fileName: file.name
    })

    try {
      // Terminate existing worker
      if (workerRef.current) {
        workerRef.current.terminate()
      }

      // Create appropriate worker
      const workerPath = isXLSX ? '/src/workers/xlsxWorker.js' : '/src/workers/csvWorker.js'
      workerRef.current = new Worker(workerPath, { type: 'module' })
      
      const allRows: any[] = []

      workerRef.current.onmessage = (e) => {
        const { type, rows, progress, totalRows, error } = e.data

        if (type === 'chunk') {
          allRows.push(...rows)
          setImportProgress(prev => ({
            ...prev,
            progress: progress || 0,
            processedRows: allRows.length
          }))
        } else if (type === 'done') {
          setImportProgress(prev => ({
            ...prev,
            progress: 100
          }))
          
          setTimeout(() => {
            onDataImported(allRows)
            setImportProgress({
              isImporting: false,
              progress: 0,
              processedRows: 0,
              fileName: ''
            })
          }, 500)
        } else if (type === 'error') {
          console.error('Import error:', error)
          alert(`Błąd importu: ${error}`)
          setImportProgress({
            isImporting: false,
            progress: 0,
            processedRows: 0,
            fileName: ''
          })
        }
      }

      // Send file to worker
      if (isXLSX) {
        const arrayBuffer = await file.arrayBuffer()
        workerRef.current.postMessage({ arrayBuffer })
      } else {
        workerRef.current.postMessage({ file })
      }

    } catch (error) {
      console.error('Worker creation failed:', error)
      alert('Błąd podczas tworzenia workera')
      setImportProgress({
        isImporting: false,
        progress: 0,
        processedRows: 0,
        fileName: ''
      })
    }

    // Reset input
    event.target.value = ''
  }

  const cancelImport = () => {
    if (workerRef.current) {
      workerRef.current.terminate()
      workerRef.current = null
    }
    setImportProgress({
      isImporting: false,
      progress: 0,
      processedRows: 0,
      fileName: ''
    })
  }

  return (
    <>
      <button
        onClick={() => fileInputRef.current?.click()}
        disabled={importProgress.isImporting}
        className={`flex items-center gap-2 px-3 py-2 rounded-lg transition-colors disabled:opacity-50 ${
          darkMode 
            ? 'bg-blue-600 hover:bg-blue-700 text-white' 
            : 'bg-blue-500 hover:bg-blue-600 text-white'
        }`}
      >
        <Upload size={16} />
        Załaduj CSV/XLSX
      </button>
      
      <input
        ref={fileInputRef}
        type="file"
        accept=".csv,.xlsx"
        onChange={handleFileUpload}
        className="hidden"
      />

      {/* Import Progress Modal */}
      <AnimatePresence>
        {importProgress.isImporting && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50"
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className={`rounded-lg shadow-xl p-6 max-w-md w-full mx-4 ${
                darkMode ? 'bg-gray-800 text-white' : 'bg-white text-gray-900'
              }`}
            >
              <div className="flex justify-between items-start mb-4">
                <div className="flex items-center gap-3">
                  {importProgress.fileName.toLowerCase().endsWith('.xlsx') ? (
                    <FileSpreadsheet className="text-green-500" size={24} />
                  ) : (
                    <FileText className="text-blue-500" size={24} />
                  )}
                  <div>
                    <h3 className="text-lg font-semibold">Importuję plik</h3>
                    <p className="text-sm opacity-70 truncate">{importProgress.fileName}</p>
                  </div>
                </div>
                <button
                  onClick={cancelImport}
                  className={`p-1 rounded-lg transition-colors ${
                    darkMode ? 'hover:bg-gray-700' : 'hover:bg-gray-100'
                  }`}
                >
                  <X size={20} />
                </button>
              </div>
              
              <div className="space-y-3">
                <div className={`w-full bg-gray-200 rounded-full h-2 ${darkMode ? 'bg-gray-700' : 'bg-gray-200'}`}>
                  <motion.div
                    className="bg-blue-500 h-2 rounded-full"
                    initial={{ width: 0 }}
                    animate={{ width: `${importProgress.progress}%` }}
                    transition={{ duration: 0.3 }}
                  />
                </div>
                
                <div className="flex justify-between text-sm">
                  <span>Przetworzono: {importProgress.processedRows} rekordów</span>
                  <span>{Math.round(importProgress.progress)}%</span>
                </div>
                
                <div className="text-center">
                  <motion.div
                    animate={{ rotate: 360 }}
                    transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
                    className="inline-block w-4 h-4 border-2 border-blue-500 border-t-transparent rounded-full"
                  />
                  <p className="text-sm mt-2 opacity-70">Skanuję plik...</p>
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  )
}