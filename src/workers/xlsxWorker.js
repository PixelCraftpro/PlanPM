import * as XLSX from 'xlsx'

self.onmessage = (e) => {
  try {
    const { arrayBuffer } = e.data
    
    // Send initial progress
    self.postMessage({ 
      type: 'chunk', 
      rows: [],
      progress: 5
    })
    
    // Read workbook
    const wb = XLSX.read(arrayBuffer, { type: 'array', dense: true })
    
    self.postMessage({ 
      type: 'chunk', 
      rows: [],
      progress: 15
    })
    
    const ws = wb.Sheets[wb.SheetNames[0]]
    
    self.postMessage({ 
      type: 'chunk', 
      rows: [],
      progress: 25
    })
    
    const json = XLSX.utils.sheet_to_json(ws, { defval: null, raw: false })
    
    self.postMessage({ 
      type: 'chunk', 
      rows: [],
      progress: 40
    })
    
    const CHUNK_SIZE = 500
    let processed = 0
    
    // Send data in chunks
    for (let i = 0; i < json.length; i += CHUNK_SIZE) {
      const chunk = json.slice(i, i + CHUNK_SIZE)
      processed += chunk.length
      
      const progress = Math.min(95, 40 + ((processed / json.length) * 55))
      
      self.postMessage({
        type: 'chunk', 
        rows: chunk,
        progress: progress
      })
      
      // Allow other operations to run
      if (i % (CHUNK_SIZE * 10) === 0) {
        // Use setTimeout instead of await for better compatibility
        setTimeout(() => {}, 1)
      }
    }
    
    // Complete immediately after processing all chunks
    setTimeout(() => {
      self.postMessage({ 
        type: 'done',
        totalRows: json.length
      })
    }, 50)
    
  } catch (error) {
    self.postMessage({ 
      type: 'error', 
      error: error.message 
    })
  }
}