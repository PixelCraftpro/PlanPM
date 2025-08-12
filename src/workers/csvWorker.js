import Papa from 'papaparse'

self.onmessage = async (e) => {
  const { file } = e.data
  
  let hasCompleted = false
  
  Papa.parse(file, {
    header: true,
    worker: false, // We're already in a worker
    skipEmptyLines: true,
    dynamicTyping: true,
    fastMode: true,
    chunkSize: 1024 * 64,
    chunk: (results, parser) => {
      if (hasCompleted) return
      
      self.postMessage({ 
        type: 'chunk', 
        rows: results.data,
        progress: Math.min(100, (results.meta.cursor / file.size) * 100)
      })
    },
    complete: (results) => {
      if (hasCompleted) return
      hasCompleted = true
      
      // Small delay before completion
      setTimeout(() => {
        self.postMessage({ 
          type: 'done',
          totalRows: results.data.length
        })
      }, 100)
    },
    error: (error) => {
      if (hasCompleted) return
      hasCompleted = true
      
      self.postMessage({ 
        type: 'error', 
        error: error.message 
      })
    }
  })
}