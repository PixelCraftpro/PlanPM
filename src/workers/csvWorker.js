import Papa from 'papaparse'

self.onmessage = async (e) => {
  const { file } = e.data
  
  let hasCompleted = false
  let totalProcessed = 0
  
  Papa.parse(file, {
    header: true,
    worker: false, // We're already in a worker
    skipEmptyLines: true,
    dynamicTyping: true,
    fastMode: true,
    chunkSize: 1024 * 64,
    chunk: (results, parser) => {
      if (hasCompleted) return
      
      totalProcessed += results.data.length
      
      self.postMessage({ 
        type: 'chunk', 
        rows: results.data,
        progress: Math.min(95, (results.meta.cursor / file.size) * 100)
      })
    },
    complete: (results) => {
      if (hasCompleted) return
      hasCompleted = true
      
      // Complete immediately
      setTimeout(() => {
        self.postMessage({ 
          type: 'done',
          totalRows: totalProcessed
        })
      }, 10)
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