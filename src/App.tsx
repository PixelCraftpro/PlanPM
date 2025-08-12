import React, { useState, useRef, useCallback, useEffect } from 'react'
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import { 
  Download, 
  FileImage, 
  FileText, 
  Sun, 
  Moon, 
  Search, 
  X, 
  ZoomIn, 
  ZoomOut,
  Calendar,
  Package,
  Trash2
} from 'lucide-react'
import { format, parseISO, isValid, parse } from 'date-fns'
import { pl } from 'date-fns/locale'
import { toPng } from 'html-to-image'
import jsPDF from 'jspdf'
import { useVirtualizer } from '@tanstack/react-virtual'
import { LandingPage } from './components/LandingPage'
import { FileImporter } from './components/FileImporter'
import { ColumnMapping } from './components/ColumnMapper'
import { TaskBar } from './components/TaskBar'
import { Task, RouteConnection } from './types'
import { hashColor } from './utils/colorUtils'

// Utility functions
const parseDate = (dateStr: string): Date | null => {
  if (!dateStr) return null
  
  console.log('🔍 Parsowanie daty:', dateStr)
  
  // Try parsing as timestamp first
  const timestamp = parseInt(dateStr)
  if (!isNaN(timestamp) && timestamp > 1000000000) {
    return new Date(timestamp * (timestamp < 10000000000 ? 1000 : 1))
  }
  
  // Try ISO format
  try {
    const isoDate = parseISO(dateStr)
    if (isValid(isoDate)) {
      console.log('✅ Sparsowano jako ISO:', isoDate)
      return isoDate
    }
  } catch {}
  
  // Try various formats
  const formats = [
    'dd.MM.yyyy HH:mm',
    'dd.MM.yyyy HH:mm:ss',
    'dd.MM.yyyy H:mm',
    'dd.MM.yyyy H:mm:ss',
    'yyyy-MM-dd HH:mm',
    'yyyy-MM-dd H:mm',
    'dd/MM/yyyy HH:mm',
    'dd/MM/yyyy H:mm',
    'MM/dd/yyyy HH:mm',
    'MM/dd/yyyy H:mm',
    'dd.MM.yyyy',
    'yyyy-MM-dd'
  ]
  
  for (const formatStr of formats) {
    try {
      const parsed = parse(dateStr, formatStr, new Date())
      if (isValid(parsed)) {
        console.log(`✅ Sparsowano jako ${formatStr}:`, parsed)
        return parsed
      }
    } catch {}
  }
  
  console.log('❌ Nie udało się sparsować daty:', dateStr)
  return null
}

const normalizeColumnName = (name: string): string => {
  return name.toLowerCase()
    .replace(/[^a-z0-9]/g, '')
    .replace(/^(order|id|nr|no|orderno).*/, 'orderno')
    .replace(/^(resource|maszyna|machine).*/, 'resource')
    .replace(/^(start|begin|początek).*/, 'starttime')
    .replace(/^(end|finish|koniec).*/, 'endtime')
    .replace(/^(qty|quantity|ilość|ilosc).*/, 'qty')
    .replace(/^(op|operation|operacja).*/, 'opno')
    .replace(/^(product|produkt).*/, 'product')
    .replace(/^(part|partno|partnumber).*/, 'partno')
}

const normalizeImportedData = (data: any[], mapping?: ColumnMapping): Task[] => {
  if (!data.length) return []
  
  console.log('🔄 normalizeImportedData - rozpoczynam parsowanie:', {
    dataLength: data.length,
    mapping,
    sampleRow: data[0]
  })
  
  let columnMap: Record<string, string> = {}

  if (mapping) {
    // Use provided mapping
    columnMap = {
      orderno: mapping.orderNo,
      resource: mapping.resource,
      starttime: mapping.startTime,
      endtime: mapping.endTime,
      qty: mapping.qty || '',
      opno: mapping.opNo || '',
      product: mapping.product || '',
      partno: mapping.partNo || ''
    }
    console.log('📋 Używam mapowania:', columnMap)
  } else {
    // Auto-detect columns (legacy behavior)
    const firstRow = data[0]
    
    Object.keys(firstRow).forEach(key => {
      const normalized = normalizeColumnName(key)
      if (['orderno', 'resource', 'starttime', 'endtime', 'qty', 'opno', 'product', 'partno'].includes(normalized)) {
        columnMap[normalized] = key
      }
    })
    console.log('🔍 Auto-wykryte mapowanie:', columnMap)
  }

  const parsedTasks: Task[] = []
  
  data.forEach((row, index) => {
    const orderNo = row[columnMap.orderno] || row['Order No.'] || ''
    const resource = row[columnMap.resource] || row['Resource'] || ''
    const startTimeStr = row[columnMap.starttime] || row['Start Time'] || ''
    const endTimeStr = row[columnMap.endtime] || row['End Time'] || ''
    const qtyStr = row[columnMap.qty] || row['Qty.'] || ''
    const opNo = row[columnMap.opno] || row['Op. No.'] || ''
    const product = row[columnMap.product] || row['Product'] || ''
    const partNo = row[columnMap.partno] || row['Part No.'] || ''

    if (index < 5) { // Log tylko pierwsze 5 rekordów
      console.log(`📝 Przetwarzanie rekordu ${index + 1}:`, {
        orderNo,
        resource,
        startTimeStr,
        endTimeStr,
        opNo,
        rawRow: row
      })
    }

    if (!orderNo || !resource) {
      console.log(`❌ Brak wymaganych danych dla rekordu ${index + 1}:`, {
        orderNo,
        resource,
        availableKeys: Object.keys(row)
      })
      return
    }

    if (!startTimeStr || !endTimeStr) {
      console.log(`❌ Brak dat dla rekordu ${index + 1}:`, {
        startTimeStr,
        endTimeStr,
        availableKeys: Object.keys(row)
      })
      return
    }

    const startTime = parseDate(startTimeStr.toString())
    const endTime = parseDate(endTimeStr.toString())

    if (!startTime || !endTime) {
      console.log(`❌ Błąd parsowania dat dla rekordu ${index + 1}:`, {
        startTimeStr,
        endTimeStr,
        startTime,
        endTime
      })
      return
    }

    parsedTasks.push({
      id: `${orderNo}-${opNo || index}`,
      orderNo,
      resource,
      startTime,
      endTime,
      qty: qtyStr ? parseInt(qtyStr.toString()) : undefined,
      opNo: opNo ? opNo.toString() : undefined,
      product: product ? product.toString() : undefined,
      partNo: partNo ? partNo.toString() : undefined
    })
  })
  
  console.log(`✅ Sparsowano ${parsedTasks.length} zadań z ${data.length} rekordów`)
  console.log('📊 Przykładowe zadania:', parsedTasks.slice(0, 3))
  return parsedTasks
}

// Legacy function for backward compatibility
const normalizeImportedDataLegacy = (data: any[]): Task[] => {
  if (!data.length) return []
  
  // Get column mapping
  const firstRow = data[0]
  const columnMap: Record<string, string> = {}
  
  Object.keys(firstRow).forEach(key => {
    const normalized = normalizeColumnName(key)
    if (['orderno', 'resource', 'starttime', 'endtime', 'qty', 'opno', 'product', 'partno'].includes(normalized)) {
      columnMap[normalized] = key
    }
  })
  
  const parsedTasks: Task[] = []
  
  data.forEach((row, index) => {
    const orderNo = row[columnMap.orderno] || row['Order No.'] || row['Order No'] || row['ID'] || ''
    const resource = row[columnMap.resource] || row['Resource'] || row['Maszyna'] || ''
    const startTimeStr = row[columnMap.starttime] || row['Start Time'] || row['Start'] || ''
    const endTimeStr = row[columnMap.endtime] || row['End Time'] || row['End'] || ''
    const qtyStr = row[columnMap.qty] || row['Qty'] || row['Qty.'] || row['Ilość'] || ''
    const opNo = row[columnMap.opno] || row['Op. No.'] || row['Op No'] || row['Operation'] || ''
    const product = row[columnMap.product] || row['Product'] || row['Produkt'] || ''
    const partNo = row[columnMap.partno] || row['Part No.'] || row['Part No'] || row['Part Number'] || ''

    console.log(`📝 Przetwarzanie rekordu legacy ${index + 1}:`, {
      orderNo,
      resource,
      startTimeStr,
      endTimeStr
    })

    if (!orderNo || !resource || !startTimeStr || !endTimeStr) return

    const startTime = parseDate(startTimeStr.toString())
    const endTime = parseDate(endTimeStr.toString())

    if (!startTime || !endTime) {
      console.log(`❌ Błąd parsowania dat legacy dla rekordu ${index + 1}:`, {
        startTimeStr,
        endTimeStr,
        startTime,
        endTime
      })
      return
    }

    parsedTasks.push({
      id: `${orderNo}-${opNo || index}`,
      orderNo: orderNo.toString(),
      resource: resource.toString(),
      startTime,
      endTime,
      qty: qtyStr ? parseInt(qtyStr.toString()) : undefined,
      opNo: opNo ? opNo.toString() : undefined,
      product: product ? product.toString() : undefined,
      partNo: partNo ? partNo.toString() : undefined
    })
  })
  
  console.log(`✅ Sparsowano legacy ${parsedTasks.length} zadań z ${data.length} rekordów`)
  return parsedTasks
}

const assignLanes = (tasks: Task[]): Task[] => {
  const resourceGroups = tasks.reduce((acc, task) => {
    if (!acc[task.resource]) acc[task.resource] = []
    acc[task.resource].push(task)
    return acc
  }, {} as Record<string, Task[]>)
  
  Object.values(resourceGroups).forEach(resourceTasks => {
    resourceTasks.sort((a, b) => a.startTime.getTime() - b.startTime.getTime())
    
    const lanes: { endTime: number }[] = []
    
    resourceTasks.forEach(task => {
      const startTime = task.startTime.getTime()
      let assignedLane = -1
      
      for (let i = 0; i < lanes.length; i++) {
        if (lanes[i].endTime <= startTime) {
          assignedLane = i
          break
        }
      }
      
      if (assignedLane === -1) {
        assignedLane = lanes.length
        lanes.push({ endTime: 0 })
      }
      
      lanes[assignedLane].endTime = task.endTime.getTime()
      task.lane = assignedLane
    })
  })
  
  return tasks
}

const generateDemoData = (): Task[] => {
  const now = new Date()
  const baseTime = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 8, 0)
  
  return [
    {
      id: '1',
      orderNo: 'ORD001',
      resource: 'Maszyna A',
      startTime: new Date(baseTime.getTime()),
      endTime: new Date(baseTime.getTime() + 2 * 60 * 60 * 1000),
      qty: 100
    },
    {
      id: '2',
      orderNo: 'ORD001',
      resource: 'Maszyna B',
      startTime: new Date(baseTime.getTime() + 2.5 * 60 * 60 * 1000),
      endTime: new Date(baseTime.getTime() + 4 * 60 * 60 * 1000),
      qty: 100
    },
    {
      id: '3',
      orderNo: 'ORD002',
      resource: 'Maszyna A',
      startTime: new Date(baseTime.getTime() + 3 * 60 * 60 * 1000),
      endTime: new Date(baseTime.getTime() + 5 * 60 * 60 * 1000),
      qty: 50
    },
    {
      id: '4',
      orderNo: 'ORD003',
      resource: 'Maszyna C',
      startTime: new Date(baseTime.getTime() + 1 * 60 * 60 * 1000),
      endTime: new Date(baseTime.getTime() + 6 * 60 * 60 * 1000),
      qty: 200
    },
    {
      id: '5',
      orderNo: 'ORD002',
      resource: 'Maszyna C',
      startTime: new Date(baseTime.getTime() + 6.5 * 60 * 60 * 1000),
      endTime: new Date(baseTime.getTime() + 8 * 60 * 60 * 1000),
      qty: 50
    }
  ]
}

function GanttPlanner() {
  const [tasks, setTasks] = useState<Task[]>([])
  const [filteredTasks, setFilteredTasks] = useState<Task[]>([])
  const [selectedTask, setSelectedTask] = useState<Task | null>(null)
  const [darkMode, setDarkMode] = useState(() => {
    const saved = localStorage.getItem('darkMode')
    return saved ? JSON.parse(saved) : false
  })
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedResources, setSelectedResources] = useState<string[]>([])
  const [resourceSearch, setResourceSearch] = useState('')
  const [zoomLevel, setZoomLevel] = useState(() => {
    const saved = localStorage.getItem('zoomLevel')
    return saved ? parseInt(saved) : 100
  })
  const [timeRange, setTimeRange] = useState<{ start: Date; end: Date } | null>(null)
  const [customTimeRange, setCustomTimeRange] = useState(() => {
    const saved = localStorage.getItem('customTimeRange')
    return saved ? JSON.parse(saved) : { start: '', end: '' }
  })
  const [routeConnections, setRouteConnections] = useState<RouteConnection[]>([])
  
  const ganttRef = useRef<HTMLDivElement>(null)
  const scrollRef = useRef<HTMLDivElement>(null)
  const resourceListRef = useRef<HTMLDivElement>(null)

  // Save preferences to localStorage
  useEffect(() => {
    localStorage.setItem('darkMode', JSON.stringify(darkMode))
  }, [darkMode])
  
  useEffect(() => {
    localStorage.setItem('zoomLevel', zoomLevel.toString())
  }, [zoomLevel])
  
  useEffect(() => {
    localStorage.setItem('customTimeRange', JSON.stringify(customTimeRange))
  }, [customTimeRange])

  // Apply filters and calculate time range
  useEffect(() => {
    console.log('🔄 Filtrowanie zadań:', {
      totalTasks: tasks.length,
      selectedResources: selectedResources.length,
      searchQuery
    })
    
    let filtered = tasks

    // Filter by selected resources
    if (selectedResources.length > 0) {
      filtered = filtered.filter(task => selectedResources.includes(task.resource))
    }

    // Handle search query
    if (searchQuery.trim()) {
      const exactMatch = filtered.filter(task => 
        task.orderNo.toLowerCase() === searchQuery.toLowerCase()
      )
      
      if (exactMatch.length > 0) {
        // Exact match - show route and connections
        filtered = exactMatch
        
        // Create route connections
        const sortedRoute = exactMatch.sort((a, b) => {
          // First try to sort by operation number
          if (a.opNo && b.opNo) {
            const opA = parseInt(a.opNo)
            const opB = parseInt(b.opNo)
            if (!isNaN(opA) && !isNaN(opB)) {
              return opA - opB
            }
          }
          // Fallback to start time
          return a.startTime.getTime() - b.startTime.getTime()
        })
        
        const connections: RouteConnection[] = []
        for (let i = 0; i < sortedRoute.length - 1; i++) {
          connections.push({ from: sortedRoute[i], to: sortedRoute[i + 1] })
        }
        setRouteConnections(connections)
        
        // Auto-adjust time range for route
        if (exactMatch.length > 0) {
          const minTime = Math.min(...exactMatch.map(t => t.startTime.getTime()))
          const maxTime = Math.max(...exactMatch.map(t => t.endTime.getTime()))
          const margin = (maxTime - minTime) * 0.1 // 10% margin
          setTimeRange({
            start: new Date(minTime - margin),
            end: new Date(maxTime + margin)
          })
        }
      } else {
        // Partial match - filter list
        filtered = filtered.filter(task => 
          task.orderNo.toLowerCase().includes(searchQuery.toLowerCase())
        )
        setRouteConnections([])
      }
    } else {
      setRouteConnections([])
    }

    // Assign lanes
    filtered = assignLanes(filtered)
    console.log('📈 Zadania po filtracji i lane assignment:', {
      filteredLength: filtered.length,
      sampleTasks: filtered.slice(0, 3)
    })
    setFilteredTasks(filtered)

    // Calculate time range if not set by route
    if (!searchQuery.trim() && filtered.length > 0 && !timeRange) {
      const minTime = Math.min(...filtered.map(t => t.startTime.getTime()))
      const maxTime = Math.max(...filtered.map(t => t.endTime.getTime()))
      setTimeRange({
        start: new Date(minTime),
        end: new Date(maxTime)
      })
    }
  }, [tasks, selectedResources, searchQuery, timeRange])

  const handleDataImported = useCallback((data: any[]) => {
    const parsedTasks = normalizeImportedDataLegacy(data)
    setTasks(parsedTasks)
    setTimeRange(null) // Reset time range to auto-calculate
  }, [])

  const handleDataImportedWithMapping = useCallback((data: any[], mapping: ColumnMapping) => {
    const parsedTasks = normalizeImportedData(data, mapping)
    setTasks(parsedTasks)
    setTimeRange(null) // Reset time range to auto-calculate
  }, [])

  const handleDemoData = useCallback(() => {
    const demoTasks = generateDemoData()
    setTasks(demoTasks)
    setTimeRange(null) // Reset time range to auto-calculate
  }, [])

  const handleClearData = useCallback(() => {
    setTasks([])
    setFilteredTasks([])
    setSelectedTask(null)
    setSearchQuery('')
    setSelectedResources([])
    setRouteConnections([])
    setTimeRange(null)
  }, [])

  const handleZoom = useCallback((delta: number, clientX?: number) => {
    const newZoom = Math.max(20, Math.min(500, zoomLevel + delta))
    
    if (clientX && scrollRef.current) {
      // Calculate anchor point for zoom
      const scrollContainer = scrollRef.current
      const rect = scrollContainer.getBoundingClientRect()
      const relativeX = clientX - rect.left
      const scrollRatio = (scrollContainer.scrollLeft + relativeX) / scrollContainer.scrollWidth
      
      setZoomLevel(newZoom)
      
      // Adjust scroll position to maintain anchor
      setTimeout(() => {
        const newScrollLeft = scrollRatio * scrollContainer.scrollWidth - relativeX
        scrollContainer.scrollLeft = Math.max(0, newScrollLeft)
      }, 0)
    } else {
      setZoomLevel(newZoom)
    }
  }, [zoomLevel])

  const handleWheel = useCallback((event: React.WheelEvent) => {
    if (event.ctrlKey) {
      event.preventDefault()
      const delta = -event.deltaY * 0.5
      handleZoom(delta, event.clientX)
    }
  }, [handleZoom])

  const setTimePreset = useCallback((preset: string) => {
    const now = new Date()
    let start: Date, end: Date

    switch (preset) {
      case 'today':
        start = new Date(now.getFullYear(), now.getMonth(), now.getDate())
        end = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1)
        break
      case '7days':
        start = new Date(now.getFullYear(), now.getMonth(), now.getDate())
        end = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 7)
        break
      case '30days':
        start = new Date(now.getFullYear(), now.getMonth(), now.getDate())
        end = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 30)
        break
      default:
        return
    }

    setTimeRange({ start, end })
    setSearchQuery('') // Clear search to avoid auto-range
  }, [])

  const handleCustomTimeRange = useCallback(() => {
    if (customTimeRange.start && customTimeRange.end) {
      const start = new Date(customTimeRange.start)
      const end = new Date(customTimeRange.end)
      if (isValid(start) && isValid(end) && start < end) {
        setTimeRange({ start, end })
        setSearchQuery('') // Clear search to avoid auto-range
      }
    }
  }, [customTimeRange])

  const exportToPNG = useCallback(async () => {
    if (!ganttRef.current) return
    
    try {
      const dataUrl = await toPng(ganttRef.current, {
        quality: 1.0,
        backgroundColor: darkMode ? '#1f2937' : '#ffffff'
      })
      
      const link = document.createElement('a')
      link.download = `gantt-${format(new Date(), 'yyyy-MM-dd-HHmm')}.png`
      link.href = dataUrl
      link.click()
    } catch (error) {
      console.error('Export to PNG failed:', error)
    }
  }, [darkMode])

  const exportToPDF = useCallback(async () => {
    if (!ganttRef.current) return
    
    try {
      const dataUrl = await toPng(ganttRef.current, {
        quality: 1.0,
        backgroundColor: darkMode ? '#1f2937' : '#ffffff'
      })
      
      const pdf = new jsPDF('landscape')
      const imgWidth = 297 // A4 landscape width in mm
      const imgHeight = 210 // A4 landscape height in mm
      
      pdf.addImage(dataUrl, 'PNG', 0, 0, imgWidth, imgHeight)
      pdf.save(`gantt-${format(new Date(), 'yyyy-MM-dd-HHmm')}.pdf`)
    } catch (error) {
      console.error('Export to PDF failed:', error)
    }
  }, [darkMode])

  const exportToCSV = useCallback(() => {
    const csvData = filteredTasks.map(task => ({
      'Order No.': task.orderNo,
      'Resource': task.resource,
      'Start Time': format(task.startTime, 'yyyy-MM-dd HH:mm'),
      'End Time': format(task.endTime, 'yyyy-MM-dd HH:mm'),
      'Qty.': task.qty || '',
      'Duration(min)': Math.round((task.endTime.getTime() - task.startTime.getTime()) / (1000 * 60))
    }))
    
    const csv = Papa.unparse(csvData)
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' })
    const link = document.createElement('a')
    link.href = URL.createObjectURL(blob)
    link.download = `gantt-export-${format(new Date(), 'yyyy-MM-dd-HHmm')}.csv`
    link.click()
  }, [filteredTasks])

  // Get unique resources for filter
  const allResources = Array.from(new Set(tasks.map(task => task.resource))).sort()
  const filteredResources = allResources.filter(resource =>
    resource.toLowerCase().includes(resourceSearch.toLowerCase())
  )

  // Calculate chart dimensions
  const chartWidth = timeRange ? 
    (timeRange.end.getTime() - timeRange.start.getTime()) / (1000 * 60 * 60) * zoomLevel : 
    1000
  
  const resourceGroups = filteredTasks.reduce((acc, task) => {
    if (!acc[task.resource]) acc[task.resource] = []
    acc[task.resource].push(task)
    return acc
  }, {} as Record<string, Task[]>)

  const maxLanesPerResource = Object.values(resourceGroups).reduce((max, tasks) => {
    const maxLane = Math.max(...tasks.map(t => t.lane || 0))
    return Math.max(max, maxLane + 1)
  }, 1)

  const rowHeight = Math.max(60, maxLanesPerResource * 40)
  
  // Virtualization for resource rows
  const resourceKeys = Object.keys(resourceGroups)
  const virtualizer = useVirtualizer({
    count: resourceKeys.length,
    getScrollElement: () => resourceListRef.current,
    estimateSize: () => rowHeight,
    overscan: 5
  })

  return (
    <div className={`min-h-screen transition-colors duration-200 ${
      darkMode ? 'dark bg-gray-900 text-white' : 'bg-gray-50 text-gray-900'
    }`}>
      {/* Sticky Toolbar */}
      <div className={`sticky top-0 z-50 border-b transition-colors ${
        darkMode ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'
      }`}>
        <div className="px-4 py-3">
          <div className="flex flex-wrap items-center gap-3">
            {/* File Import */}
            <FileImporter 
              onDataImported={handleDataImported} 
              onDataImportedWithMapping={handleDataImportedWithMapping}
              darkMode={darkMode} 
            />

            {/* Demo Button */}
            <button
              onClick={handleDemoData}
              className={`flex items-center gap-2 px-3 py-2 rounded-lg transition-colors ${
                darkMode 
                  ? 'bg-green-600 hover:bg-green-700 text-white' 
                  : 'bg-green-500 hover:bg-green-600 text-white'
              }`}
            >
              <Package size={16} />
              Demo
            </button>

            {/* Clear Data Button */}
            <button
              onClick={handleClearData}
              disabled={tasks.length === 0}
              className={`flex items-center gap-2 px-3 py-2 rounded-lg transition-colors disabled:opacity-50 ${
                darkMode 
                  ? 'bg-red-600 hover:bg-red-700 text-white' 
                  : 'bg-red-500 hover:bg-red-600 text-white'
              }`}
            >
              <Trash2 size={16} />
              Wyczyść
            </button>

            {/* Export Buttons */}
            <div className="flex gap-1">
              <button
                onClick={exportToPNG}
                disabled={filteredTasks.length === 0}
                className={`p-2 rounded-lg transition-colors disabled:opacity-50 ${
                  darkMode 
                    ? 'bg-gray-700 hover:bg-gray-600 text-white' 
                    : 'bg-gray-200 hover:bg-gray-300 text-gray-700'
                }`}
                title="Eksport PNG"
              >
                <FileImage size={16} />
              </button>
              <button
                onClick={exportToPDF}
                disabled={filteredTasks.length === 0}
                className={`p-2 rounded-lg transition-colors disabled:opacity-50 ${
                  darkMode 
                    ? 'bg-gray-700 hover:bg-gray-600 text-white' 
                    : 'bg-gray-200 hover:bg-gray-300 text-gray-700'
                }`}
                title="Eksport PDF"
              >
                <FileText size={16} />
              </button>
              <button
                onClick={exportToCSV}
                disabled={filteredTasks.length === 0}
                className={`p-2 rounded-lg transition-colors disabled:opacity-50 ${
                  darkMode 
                    ? 'bg-gray-700 hover:bg-gray-600 text-white' 
                    : 'bg-gray-200 hover:bg-gray-300 text-gray-700'
                }`}
                title="Eksport CSV"
              >
                <Download size={16} />
              </button>
            </div>

            {/* Zoom Controls */}
            <div className="flex items-center gap-2">
              <button
                onClick={() => handleZoom(-20)}
                className={`p-2 rounded-lg transition-colors ${
                  darkMode 
                    ? 'bg-gray-700 hover:bg-gray-600 text-white' 
                    : 'bg-gray-200 hover:bg-gray-300 text-gray-700'
                }`}
              >
                <ZoomOut size={16} />
              </button>
              <input
                type="range"
                min="20"
                max="500"
                value={zoomLevel}
                onChange={(e) => setZoomLevel(parseInt(e.target.value))}
                className="w-20"
              />
              <button
                onClick={() => handleZoom(20)}
                className={`p-2 rounded-lg transition-colors ${
                  darkMode 
                    ? 'bg-gray-700 hover:bg-gray-600 text-white' 
                    : 'bg-gray-200 hover:bg-gray-300 text-gray-700'
                }`}
              >
                <ZoomIn size={16} />
              </button>
              <span className="text-sm font-mono">{zoomLevel}px/h</span>
            </div>

            {/* Search */}
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={16} />
              <input
                type="text"
                placeholder="Szukaj Order No..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className={`pl-10 pr-4 py-2 rounded-lg border transition-colors ${
                  darkMode 
                    ? 'bg-gray-700 border-gray-600 text-white placeholder-gray-400' 
                    : 'bg-white border-gray-300 text-gray-900 placeholder-gray-500'
                }`}
              />
            </div>

            {/* Time Range Presets */}
            <div className="flex gap-1">
              <button
                onClick={() => setTimePreset('today')}
                className={`px-3 py-2 text-sm rounded-lg transition-colors ${
                  darkMode 
                    ? 'bg-gray-700 hover:bg-gray-600 text-white' 
                    : 'bg-gray-200 hover:bg-gray-300 text-gray-700'
                }`}
              >
                Dziś
              </button>
              <button
                onClick={() => setTimePreset('7days')}
                className={`px-3 py-2 text-sm rounded-lg transition-colors ${
                  darkMode 
                    ? 'bg-gray-700 hover:bg-gray-600 text-white' 
                    : 'bg-gray-200 hover:bg-gray-300 text-gray-700'
                }`}
              >
                7 dni
              </button>
              <button
                onClick={() => setTimePreset('30days')}
                className={`px-3 py-2 text-sm rounded-lg transition-colors ${
                  darkMode 
                    ? 'bg-gray-700 hover:bg-gray-600 text-white' 
                    : 'bg-gray-200 hover:bg-gray-300 text-gray-700'
                }`}
              >
                30 dni
              </button>
            </div>

            {/* Custom Time Range */}
            <div className="flex items-center gap-2">
              <input
                type="datetime-local"
                value={customTimeRange.start}
                onChange={(e) => setCustomTimeRange(prev => ({ ...prev, start: e.target.value }))}
                className={`px-2 py-1 text-sm rounded border ${
                  darkMode 
                    ? 'bg-gray-700 border-gray-600 text-white' 
                    : 'bg-white border-gray-300 text-gray-900'
                }`}
              />
              <span>–</span>
              <input
                type="datetime-local"
                value={customTimeRange.end}
                onChange={(e) => setCustomTimeRange(prev => ({ ...prev, end: e.target.value }))}
                className={`px-2 py-1 text-sm rounded border ${
                  darkMode 
                    ? 'bg-gray-700 border-gray-600 text-white' 
                    : 'bg-white border-gray-300 text-gray-900'
                }`}
              />
              <button
                onClick={handleCustomTimeRange}
                className={`px-2 py-1 text-sm rounded transition-colors ${
                  darkMode 
                    ? 'bg-gray-700 hover:bg-gray-600 text-white' 
                    : 'bg-gray-200 hover:bg-gray-300 text-gray-700'
                }`}
              >
                Ustaw
              </button>
            </div>

            {/* Dark Mode Toggle */}
            <button
              onClick={() => setDarkMode(!darkMode)}
              className={`p-2 rounded-lg transition-colors ${
                darkMode 
                  ? 'bg-gray-700 hover:bg-gray-600 text-yellow-400' 
                  : 'bg-gray-200 hover:bg-gray-300 text-gray-700'
              }`}
            >
              {darkMode ? <Sun size={16} /> : <Moon size={16} />}
            </button>
          </div>
        </div>
      </div>

      {/* Sticky Resource Filter */}
      <div className={`sticky top-[73px] z-40 border-b transition-colors ${
        darkMode ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'
      }`}>
        <div className="px-4 py-3">
          <div className="flex flex-wrap items-center gap-3">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={16} />
              <input
                type="text"
                placeholder="Szukaj maszyny..."
                value={resourceSearch}
                onChange={(e) => setResourceSearch(e.target.value)}
                className={`pl-10 pr-4 py-2 rounded-lg border transition-colors ${
                  darkMode 
                    ? 'bg-gray-700 border-gray-600 text-white placeholder-gray-400' 
                    : 'bg-white border-gray-300 text-gray-900 placeholder-gray-500'
                }`}
              />
            </div>

            <div className="flex gap-2">
              <button
                onClick={() => setSelectedResources(filteredResources)}
                className={`px-3 py-2 text-sm rounded-lg transition-colors ${
                  darkMode 
                    ? 'bg-green-600 hover:bg-green-700 text-white' 
                    : 'bg-green-500 hover:bg-green-600 text-white'
                }`}
              >
                Zaznacz widoczne
              </button>
              <button
                onClick={() => setSelectedResources([])}
                className={`px-3 py-2 text-sm rounded-lg transition-colors ${
                  darkMode 
                    ? 'bg-red-600 hover:bg-red-700 text-white' 
                    : 'bg-red-500 hover:bg-red-600 text-white'
                }`}
              >
                Wyczyść wybór
              </button>
            </div>

            <div className="flex flex-wrap gap-2">
              {filteredResources.map(resource => (
                <button
                  key={resource}
                  onClick={() => {
                    setSelectedResources(prev => 
                      prev.includes(resource) 
                        ? prev.filter(r => r !== resource)
                        : [...prev, resource]
                    )
                  }}
                  className={`px-3 py-1 text-sm rounded-full transition-colors ${
                    selectedResources.includes(resource)
                      ? darkMode 
                        ? 'bg-blue-600 text-white' 
                        : 'bg-blue-500 text-white'
                      : darkMode 
                        ? 'bg-gray-700 hover:bg-gray-600 text-gray-300' 
                        : 'bg-gray-200 hover:bg-gray-300 text-gray-700'
                  }`}
                >
                  {resource}
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex h-[calc(100vh-146px)]">
        {/* Left Panel - Resource Names */}
        <div className={`w-80 border-r transition-colors ${
          darkMode ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'
        }`}>
          {/* Sticky Header */}
          <div className={`sticky top-0 h-12 border-b flex items-center px-4 font-medium transition-colors ${
            darkMode ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'
          }`}>
            Zasoby
          </div>
          
          {/* Resource List */}
          <div 
            ref={resourceListRef}
            className="overflow-y-auto"
            style={{ height: `${virtualizer.getTotalSize()}px` }}
          >
            {virtualizer.getVirtualItems().map(virtualRow => {
              const resource = resourceKeys[virtualRow.index]
              return (
                <div
                  key={virtualRow.key}
                  className={`absolute top-0 left-0 w-full border-b flex items-center px-4 transition-colors ${
                    darkMode ? 'border-gray-700' : 'border-gray-200'
                  }`}
                  style={{
                    height: `${virtualRow.size}px`,
                    transform: `translateY(${virtualRow.start}px)`
                  }}
                >
                  <div className="font-medium truncate">{resource}</div>
                </div>
              )
            })}
          </div>
        </div>

        {/* Right Panel - Gantt Chart */}
        <div className="flex-1 overflow-hidden">
          {/* Sticky Time Header */}
          <div className={`sticky top-0 h-12 border-b transition-colors ${
            darkMode ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'
          }`}>
            <div 
              ref={scrollRef}
              className="overflow-x-auto h-full"
              onWheel={handleWheel}
            >
              <div style={{ width: `${chartWidth}px` }} className="h-full relative">
                {timeRange && (
                  <>
                    {/* Time Grid */}
                    {Array.from({ length: Math.ceil((timeRange.end.getTime() - timeRange.start.getTime()) / (1000 * 60 * 60)) }, (_, i) => {
                      const time = new Date(timeRange.start.getTime() + i * 60 * 60 * 1000)
                      const x = i * zoomLevel
                      const isDay = time.getHours() === 0
                      
                      return (
                        <div
                          key={i}
                          className={`absolute top-0 bottom-0 ${
                            isDay 
                              ? darkMode ? 'border-gray-500' : 'border-gray-400'
                              : darkMode ? 'border-gray-600' : 'border-gray-300'
                          } ${isDay ? 'border-l-2' : 'border-l'}`}
                          style={{ left: `${x}px` }}
                        >
                          {isDay && (
                            <div className={`absolute top-1 left-1 text-xs font-medium ${
                              darkMode ? 'text-gray-300' : 'text-gray-600'
                            }`}>
                              {format(time, 'dd.MM', { locale: pl })}
                            </div>
                          )}
                          {!isDay && time.getHours() % 4 === 0 && (
                            <div className={`absolute top-1 left-1 text-xs ${
                              darkMode ? 'text-gray-400' : 'text-gray-500'
                            }`}>
                              {format(time, 'HH:mm')}
                            </div>
                          )}
                        </div>
                      )
                    })}
                    
                    {/* Current Time Line */}
                    {(() => {
                      const now = new Date()
                      if (now >= timeRange.start && now <= timeRange.end) {
                        const x = ((now.getTime() - timeRange.start.getTime()) / (1000 * 60 * 60)) * zoomLevel
                        return (
                          <div
                            className="absolute top-0 bottom-0 border-l-2 border-red-500 z-10"
                            style={{ left: `${x}px` }}
                          >
                            <div className="absolute top-1 left-1 text-xs text-red-500 font-medium">
                              Teraz
                            </div>
                          </div>
                        )
                      }
                      return null
                    })()}
                  </>
                )}
              </div>
            </div>
          </div>

          {/* Gantt Content */}
          <div 
            ref={ganttRef}
            className="overflow-auto flex-1"
            onWheel={handleWheel}
          >
            {filteredTasks.length === 0 ? (
              <div className="flex items-center justify-center h-64">
                <div className={`text-center ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>
                  <Calendar size={48} className="mx-auto mb-4 opacity-50" />
                  <p className="text-lg font-medium mb-2">Brak danych do wyświetlenia</p>
                  <p className="text-sm">Wgraj plik CSV/XLSX lub użyj danych demo</p>
                </div>
              </div>
            ) : (
            <div style={{ width: `${chartWidth}px` }} className="relative">
              {virtualizer.getVirtualItems().map(virtualRow => {
                const resource = resourceKeys[virtualRow.index]
                const resourceTasks = resourceGroups[resource]
                
                if (!resourceTasks || resourceTasks.length === 0) return null
                
                return (
                  <div
                    key={virtualRow.key}
                    className={`absolute top-0 left-0 w-full border-b transition-colors ${
                      darkMode ? 'border-gray-700' : 'border-gray-200'
                    }`}
                    style={{
                      height: `${virtualRow.size}px`,
                      transform: `translateY(${virtualRow.start}px)`
                    }}
                  >
                    {/* Time Grid Lines */}
                    {timeRange && Array.from({ length: Math.ceil((timeRange.end.getTime() - timeRange.start.getTime()) / (1000 * 60 * 60)) }, (_, i) => {
                      const x = i * zoomLevel
                      const time = new Date(timeRange.start.getTime() + i * 60 * 60 * 1000)
                      const isDay = time.getHours() === 0
                      
                      return (
                        <div
                          key={i}
                          className={`absolute top-0 bottom-0 ${
                            isDay 
                              ? darkMode ? 'border-gray-600' : 'border-gray-300'
                              : darkMode ? 'border-gray-700' : 'border-gray-200'
                          } ${isDay ? 'border-l-2' : 'border-l'}`}
                          style={{ left: `${x}px` }}
                        />
                      )
                    })}

                    {/* Tasks */}
                    {resourceTasks.map(task => {
                      if (!timeRange) return null
                      
                      try {
                      const startX = ((task.startTime.getTime() - timeRange.start.getTime()) / (1000 * 60 * 60)) * zoomLevel
                      const width = ((task.endTime.getTime() - task.startTime.getTime()) / (1000 * 60 * 60)) * zoomLevel
                      const laneHeight = Math.floor(rowHeight / maxLanesPerResource)
                      const y = (task.lane || 0) * laneHeight + 5
                      const height = Math.min(laneHeight - 10, Math.max(30, width * 0.1))
                      
                      // Viewport culling - only render visible tasks
                      const viewportLeft = scrollRef.current?.scrollLeft || 0
                      const viewportRight = viewportLeft + (scrollRef.current?.clientWidth || 0)
                      
                      if (startX + width < viewportLeft || startX > viewportRight) {
                        return null
                      }
                      
                      return (
                        <TaskBar
                          key={task.id}
                          task={task}
                          x={startX}
                          y={y}
                          width={width}
                          height={height}
                          onClick={() => setSelectedTask(task)}
                        />
                      )
                      } catch (error) {
                        console.error('Error rendering task:', task.id, error)
                        return null
                      }
                    })}
                  </div>
                )
              })}

              {/* Route Connections */}
              {routeConnections.length > 0 && timeRange && (
                <svg className="absolute inset-0 pointer-events-none" style={{ width: `${chartWidth}px`, height: `${virtualizer.getTotalSize()}px` }}>
                  {routeConnections.map((connection, index) => {
                    try {
                    const fromResource = connection.from.resource
                    const toResource = connection.to.resource
                    const fromResourceIndex = resourceKeys.indexOf(fromResource)
                    const toResourceIndex = resourceKeys.indexOf(toResource)
                    
                    if (fromResourceIndex === -1 || toResourceIndex === -1) return null
                    
                    const fromX = ((connection.from.endTime.getTime() - timeRange.start.getTime()) / (1000 * 60 * 60)) * zoomLevel
                    const toX = ((connection.to.startTime.getTime() - timeRange.start.getTime()) / (1000 * 60 * 60)) * zoomLevel
                    
                    // Calculate Y position based on lane
                    const fromLane = connection.from.lane || 0
                    const toLane = connection.to.lane || 0
                    const laneHeight = Math.floor(rowHeight / maxLanesPerResource)
                    const fromY = fromResourceIndex * rowHeight + fromLane * laneHeight + laneHeight / 2
                    const toY = toResourceIndex * rowHeight + toLane * laneHeight + laneHeight / 2
                    
                    // Create a more sophisticated connection path
                    const controlOffset = Math.min(50, Math.abs(toX - fromX) * 0.3)
                    const midX1 = fromX + controlOffset
                    const midX2 = toX - controlOffset
                    
                    return (
                      <g key={index}>
                        {/* Connection line */}
                        <path
                          d={`M ${fromX} ${fromY} C ${midX1} ${fromY}, ${midX2} ${toY}, ${toX} ${toY}`}
                          stroke={darkMode ? '#60a5fa' : '#3b82f6'}
                          strokeWidth="2"
                          strokeDasharray="5,5"
                          fill="none"
                          markerEnd="url(#arrowhead)"
                        />
                        {/* Connection points */}
                        <circle
                          cx={fromX}
                          cy={fromY}
                          r="3"
                          fill={darkMode ? '#60a5fa' : '#3b82f6'}
                        />
                        <circle
                          cx={toX}
                          cy={toY}
                          r="3"
                          fill={darkMode ? '#60a5fa' : '#3b82f6'}
                        />
                      </g>
                    )
                    } catch (error) {
                      console.error('Error rendering connection:', index, error)
                      return null
                    }
                  })}
                  
                  {/* Arrow marker definition */}
                  <defs>
                    <marker
                      id="arrowhead"
                      markerWidth="10"
                      markerHeight="7"
                      refX="9"
                      refY="3.5"
                      orient="auto"
                      markerUnits="strokeWidth"
                    >
                      <polygon
                        points="0 0, 10 3.5, 0 7"
                        fill={darkMode ? '#60a5fa' : '#3b82f6'}
                      />
                    </marker>
                  </defs>
                </svg>
              )}
            </div>
            )}
          </div>
        </div>
      </div>

      {/* Task Details Popover */}
      <AnimatePresence>
        {selectedTask && (
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.9 }}
            className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50"
            onClick={() => setSelectedTask(null)}
          >
            <motion.div
              className={`rounded-lg shadow-xl p-6 max-w-md w-full mx-4 ${
                darkMode ? 'bg-gray-800 text-white' : 'bg-white text-gray-900'
              }`}
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex justify-between items-start mb-4">
                <h3 className="text-lg font-semibold">Szczegóły zadania</h3>
                <button
                  onClick={() => setSelectedTask(null)}
                  className={`p-1 rounded-lg transition-colors ${
                    darkMode ? 'hover:bg-gray-700' : 'hover:bg-gray-100'
                  }`}
                >
                  <X size={20} />
                </button>
              </div>
              
              <div className="space-y-3">
                <div>
                  <label className="text-sm font-medium opacity-70">Order No.</label>
                  <div className="font-mono">{selectedTask.orderNo}</div>
                </div>
                {selectedTask.product && (
                  <div>
                    <label className="text-sm font-medium opacity-70">Produkt</label>
                    <div>{selectedTask.product}</div>
                  </div>
                )}
                {selectedTask.partNo && (
                  <div>
                    <label className="text-sm font-medium opacity-70">Part No.</label>
                    <div className="font-mono">{selectedTask.partNo}</div>
                  </div>
                )}
                {selectedTask.opNo && (
                  <div>
                    <label className="text-sm font-medium opacity-70">Op. No.</label>
                    <div className="font-mono">{selectedTask.opNo}</div>
                  </div>
                )}
                <div>
                  <label className="text-sm font-medium opacity-70">Zasób</label>
                  <div>{selectedTask.resource}</div>
                </div>
                <div>
                  <label className="text-sm font-medium opacity-70">Start</label>
                  <div className="font-mono">{format(selectedTask.startTime, 'dd.MM.yyyy HH:mm', { locale: pl })}</div>
                </div>
                <div>
                  <label className="text-sm font-medium opacity-70">Koniec</label>
                  <div className="font-mono">{format(selectedTask.endTime, 'dd.MM.yyyy HH:mm', { locale: pl })}</div>
                </div>
                <div>
                  <label className="text-sm font-medium opacity-70">Czas trwania</label>
                  <div>{Math.round((selectedTask.endTime.getTime() - selectedTask.startTime.getTime()) / (1000 * 60))} min</div>
                </div>
                {selectedTask.qty && (
                  <div>
                    <label className="text-sm font-medium opacity-70">Ilość</label>
                    <div>{selectedTask.qty}</div>
                  </div>
                )}
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Details Panel */}
      {selectedTask && (
        <div className={`border-t transition-colors ${
          darkMode ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'
        }`}>
          <div className="px-4 py-3">
            <div className="flex items-center gap-4 text-sm">
              <span className="font-medium">Wybrane zadanie:</span>
              <span className="font-mono">{selectedTask.orderNo}</span>
              {selectedTask.opNo && <span className="opacity-70">Op: {selectedTask.opNo}</span>}
              <span>na {selectedTask.resource}</span>
              <span className="opacity-70">
                {format(selectedTask.startTime, 'dd.MM HH:mm', { locale: pl })} - {format(selectedTask.endTime, 'HH:mm', { locale: pl })}
              </span>
              {selectedTask.qty && <span>Qty: {selectedTask.qty}</span>}
            </div>
          </div>
        </div>
      )}

      {/* Keyboard Shortcuts */}
      <div className="fixed bottom-4 right-4 text-xs opacity-50">
        <div>CTRL + scroll = zoom</div>
        <div>ESC = zamknij szczegóły</div>
      </div>

      {/* Keyboard Handler */}
      <div
        tabIndex={-1}
        onKeyDown={(e) => {
          if (e.key === 'Escape') {
            setSelectedTask(null)
          }
        }}
        className="sr-only"
      />
    </div>
  )
}

export default function App() {
  const [darkMode, setDarkMode] = useState(() => {
    const saved = localStorage.getItem('darkMode')
    return saved ? JSON.parse(saved) : false
  })

  return (
    <Router>
      <Routes>
        <Route 
          path="/" 
          element={<LandingPage darkMode={darkMode} setDarkMode={setDarkMode} />} 
        />
        <Route 
          path="/planner" 
          element={<GanttPlanner />} 
        />
      </Routes>
    </Router>
  )
}