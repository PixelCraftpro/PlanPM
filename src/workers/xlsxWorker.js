import * as XLSX from 'xlsx'

self.onmessage = (e) => {
  try {
    const { arrayBuffer } = e.data
    
    // Read workbook
    const wb = XLSX.read(arrayBuffer, { type: 'array', dense: true })
    const ws = wb.Sheets[wb.SheetNames[0]]
    const json = XLSX.utils.sheet_to_json(ws, { defval: null, raw: false })
    
    const CHUNK_SIZE = 500
    let processed = 0
    
    // Send data in chunks
    for (let i = 0; i < json.length; i += CHUNK_SIZE) {
      const chunk = json.slice(i, i + CHUNK_SIZE)
      processed += chunk.length
      
      self.postMessage({ 
        type: 'chunk', 
        rows: chunk,
        progress: Math.min(100, (processed / json.length) * 100)
      })
    }
    
    self.postMessage({ 
      type: 'done',
      totalRows: json.length
    })
  } catch (error) {
    self.postMessage({ 
      type: 'error', 
      error: error.message 
    })
  }
}