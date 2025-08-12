import React, { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { X, Check, ArrowRight } from 'lucide-react'

interface ColumnMapperProps {
  isOpen: boolean
  onClose: () => void
  onConfirm: (mapping: ColumnMapping) => void
  columns: string[]
  sampleData: any[]
  darkMode: boolean
}

export interface ColumnMapping {
  orderNo: string
  resource: string
  startTime: string
  endTime: string
  qty?: string
  opNo?: string
  product?: string
  partNo?: string
}

const REQUIRED_FIELDS = [
  { key: 'orderNo', label: 'Order No.', description: 'Numer zlecenia' },
  { key: 'resource', label: 'Resource', description: 'Maszyna/Zasób' },
  { key: 'startTime', label: 'Start Time', description: 'Czas rozpoczęcia' },
  { key: 'endTime', label: 'End Time', description: 'Czas zakończenia' }
] as const

const OPTIONAL_FIELDS = [
  { key: 'qty', label: 'Qty.', description: 'Ilość' },
  { key: 'opNo', label: 'Op. No.', description: 'Numer operacji' },
  { key: 'product', label: 'Product', description: 'Produkt' },
  { key: 'partNo', label: 'Part No.', description: 'Numer części' }
] as const

export const ColumnMapper: React.FC<ColumnMapperProps> = ({
  isOpen,
  onClose,
  onConfirm,
  columns,
  sampleData,
  darkMode
}) => {
  const [mapping, setMapping] = useState<ColumnMapping>({
    orderNo: '',
    resource: '',
    startTime: '',
    endTime: ''
  })

  // Auto-detect columns on open
  useEffect(() => {
    if (isOpen && columns.length > 0) {
      const autoMapping: ColumnMapping = {
        orderNo: '',
        resource: '',
        startTime: '',
        endTime: ''
      }

      columns.forEach(col => {
        const normalized = col.toLowerCase().replace(/[^a-z0-9]/g, '')
        
        // Order No detection
        if (!autoMapping.orderNo && (
          normalized.includes('order') || 
          normalized.includes('orderno') ||
          normalized.includes('zlecenie')
        )) {
          autoMapping.orderNo = col
        }
        
        // Resource detection - prefer "Resource Group Name" over "Resource"
        if (normalized.includes('resourcegroup') || normalized.includes('resourcegroupname') || normalized.includes('resourcegroupname')) {
          autoMapping.resource = col
        } else if (!autoMapping.resource && (
          normalized.includes('resource') || 
          normalized.includes('maszyna') ||
          normalized.includes('machine') ||
          normalized.includes('resourcegroupname')
        )) {
          autoMapping.resource = col
        }
        
        // Start Time detection
        if (!autoMapping.startTime && (
          normalized.includes('start') || 
          normalized.includes('begin') ||
          normalized.includes('poczatek')
        )) {
          autoMapping.startTime = col
        }
        
        // End Time detection
        if (!autoMapping.endTime && (
          normalized.includes('end') || 
          normalized.includes('finish') ||
          normalized.includes('koniec')
        )) {
          autoMapping.endTime = col
        }
        
        // Optional fields
        if (!autoMapping.qty && (
          normalized.includes('qty') || 
          normalized.includes('quantity') ||
          normalized.includes('ilosc')
        )) {
          autoMapping.qty = col
        }
        
        if (!autoMapping.opNo && (
          normalized.includes('opno') || 
          normalized.includes('operation') ||
          normalized.includes('operacja')
        )) {
          autoMapping.opNo = col
        }
        
        if (!autoMapping.product && (
          normalized.includes('product') || 
          normalized.includes('produkt')
        )) {
          autoMapping.product = col
        }
        
        if (!autoMapping.partNo && (
          normalized.includes('partno') || 
          normalized.includes('partnumber') ||
          normalized.includes('part')
        )) {
          autoMapping.partNo = col
        }
      })

      setMapping(autoMapping)
    }
  }, [isOpen, columns])

  const handleConfirm = () => {
    // Validate required fields
    if (!mapping.orderNo || !mapping.resource || !mapping.startTime || !mapping.endTime) {
      alert('Proszę wypełnić wszystkie wymagane pola')
      return
    }
    
    onConfirm(mapping)
  }

  const isValid = mapping.orderNo && mapping.resource && mapping.startTime && mapping.endTime

  if (!isOpen) return null

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4"
      >
        <motion.div
          initial={{ scale: 0.9, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          exit={{ scale: 0.9, opacity: 0 }}
          className={`rounded-lg shadow-xl max-w-4xl w-full max-h-[90vh] overflow-hidden ${
            darkMode ? 'bg-gray-800 text-white' : 'bg-white text-gray-900'
          }`}
        >
          {/* Header */}
          <div className={`border-b p-6 ${darkMode ? 'border-gray-700' : 'border-gray-200'}`}>
            <div className="flex justify-between items-start">
              <div>
                <h2 className="text-xl font-semibold mb-2">Mapowanie kolumn</h2>
                <p className={`text-sm ${darkMode ? 'text-gray-300' : 'text-gray-600'}`}>
                  Dopasuj kolumny z pliku Excel do odpowiednich pól w systemie
                </p>
              </div>
              <button
                onClick={onClose}
                className={`p-2 rounded-lg transition-colors ${
                  darkMode ? 'hover:bg-gray-700' : 'hover:bg-gray-100'
                }`}
              >
                <X size={20} />
              </button>
            </div>
          </div>

          {/* Content */}
          <div className="p-6 overflow-y-auto max-h-[calc(90vh-200px)]">
            <div className="grid lg:grid-cols-2 gap-8">
              {/* Mapping Form */}
              <div className="space-y-6">
                <div>
                  <h3 className="text-lg font-medium mb-4">Wymagane pola</h3>
                  <div className="space-y-4">
                    {REQUIRED_FIELDS.map(field => (
                      <div key={field.key}>
                        <label className="block text-sm font-medium mb-2">
                          {field.label} <span className="text-red-500">*</span>
                          <span className={`block text-xs font-normal ${
                            darkMode ? 'text-gray-400' : 'text-gray-500'
                          }`}>
                            {field.description}
                          </span>
                        </label>
                        <select
                          value={mapping[field.key as keyof ColumnMapping] || ''}
                          onChange={(e) => setMapping(prev => ({
                            ...prev,
                            [field.key]: e.target.value
                          }))}
                          className={`w-full px-3 py-2 rounded-lg border transition-colors ${
                            darkMode 
                              ? 'bg-gray-700 border-gray-600 text-white' 
                              : 'bg-white border-gray-300 text-gray-900'
                          }`}
                        >
                          <option value="">-- Wybierz kolumnę --</option>
                          {columns.map(col => (
                            <option key={col} value={col}>{col}</option>
                          ))}
                        </select>
                      </div>
                    ))}
                  </div>
                </div>

                <div>
                  <h3 className="text-lg font-medium mb-4">Pola opcjonalne</h3>
                  <div className="space-y-4">
                    {OPTIONAL_FIELDS.map(field => (
                      <div key={field.key}>
                        <label className="block text-sm font-medium mb-2">
                          {field.label}
                          <span className={`block text-xs font-normal ${
                            darkMode ? 'text-gray-400' : 'text-gray-500'
                          }`}>
                            {field.description}
                          </span>
                        </label>
                        <select
                          value={mapping[field.key as keyof ColumnMapping] || ''}
                          onChange={(e) => setMapping(prev => ({
                            ...prev,
                            [field.key]: e.target.value
                          }))}
                          className={`w-full px-3 py-2 rounded-lg border transition-colors ${
                            darkMode 
                              ? 'bg-gray-700 border-gray-600 text-white' 
                              : 'bg-white border-gray-300 text-gray-900'
                          }`}
                        >
                          <option value="">-- Nie używaj --</option>
                          {columns.map(col => (
                            <option key={col} value={col}>{col}</option>
                          ))}
                        </select>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              {/* Preview */}
              <div>
                <h3 className="text-lg font-medium mb-4">Podgląd danych</h3>
                {sampleData.length > 0 && (
                  <div className={`rounded-lg border overflow-hidden ${
                    darkMode ? 'border-gray-600' : 'border-gray-300'
                  }`}>
                    <div className="overflow-x-auto">
                      <table className="w-full text-sm">
                        <thead className={`${darkMode ? 'bg-gray-700' : 'bg-gray-50'}`}>
                          <tr>
                            <th className="px-3 py-2 text-left font-medium">Pole</th>
                            <th className="px-3 py-2 text-left font-medium">Wartość</th>
                          </tr>
                        </thead>
                        <tbody>
                          {[...REQUIRED_FIELDS, ...OPTIONAL_FIELDS].map(field => {
                            const columnName = mapping[field.key as keyof ColumnMapping]
                            const value = columnName ? sampleData[0]?.[columnName] : ''
                            
                            return (
                              <tr key={field.key} className={`border-t ${
                                darkMode ? 'border-gray-600' : 'border-gray-200'
                              }`}>
                                <td className="px-3 py-2 font-medium">
                                  <div className="flex items-center gap-2">
                                    {field.label}
                                    {REQUIRED_FIELDS.some(f => f.key === field.key) && (
                                      <span className="text-red-500 text-xs">*</span>
                                    )}
                                  </div>
                                </td>
                                <td className="px-3 py-2">
                                  {columnName ? (
                                    <div className="flex items-center gap-2">
                                      <span className={`px-2 py-1 text-xs rounded ${
                                        darkMode ? 'bg-blue-600 text-white' : 'bg-blue-100 text-blue-800'
                                      }`}>
                                        {columnName}
                                      </span>
                                      <ArrowRight size={12} className="opacity-50" />
                                      <span className="font-mono text-xs">
                                        {value ? String(value).substring(0, 20) + (String(value).length > 20 ? '...' : '') : '(brak)'}
                                      </span>
                                    </div>
                                  ) : (
                                    <span className="text-gray-400 text-xs">Nie zmapowane</span>
                                  )}
                                </td>
                              </tr>
                            )
                          })}
                        </tbody>
                      </table>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Footer */}
          <div className={`border-t p-6 flex justify-end gap-3 ${
            darkMode ? 'border-gray-700' : 'border-gray-200'
          }`}>
            <button
              onClick={onClose}
              className={`px-4 py-2 rounded-lg transition-colors ${
                darkMode 
                  ? 'bg-gray-700 hover:bg-gray-600 text-white' 
                  : 'bg-gray-200 hover:bg-gray-300 text-gray-700'
              }`}
            >
              Anuluj
            </button>
            <button
              onClick={handleConfirm}
              disabled={!isValid}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg transition-colors disabled:opacity-50 ${
                darkMode 
                  ? 'bg-blue-600 hover:bg-blue-700 text-white' 
                  : 'bg-blue-500 hover:bg-blue-600 text-white'
              }`}
            >
              <Check size={16} />
              Potwierdź mapowanie
            </button>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  )
}