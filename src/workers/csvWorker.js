import Papa from 'papaparse'

self.onmessage = async (e) => {
  const { file } = e.data
  
  Papa.parse(file, {
    header: true,
    worker: false, // We're already in a worker
    skipEmptyLines: true,
    dynamicTyping: true,
    fastMode: true,
    chunkSize: 1024 * 64,
    chunk: (results, parser) => {
      self.postMessage({ 
        type: 'chunk', 
        rows: results.data,
        progress: Math.min(100, (results.meta.cursor / file.size) * 100)
      })
    },
    complete: (results) => {
      self.postMessage({ 
        type: 'done',
        totalRows: results.data.length
      })
    },
    error: (error) => {
      self.postMessage({ 
        type: 'error', 
        error: error.message 
      })
    }
  })
}