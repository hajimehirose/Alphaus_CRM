// File parsing utilities for CSV and Excel imports

import Papa from 'papaparse'
import * as XLSX from 'xlsx'

export interface ParsedFileData {
  headers: string[]
  rows: Record<string, any>[]
  rowCount: number
}

/**
 * Parse a CSV or Excel file
 */
export async function parseFile(file: File): Promise<ParsedFileData> {
  const fileName = file.name.toLowerCase()
  
  if (fileName.endsWith('.csv')) {
    return parseCSV(file)
  } else if (fileName.endsWith('.xlsx') || fileName.endsWith('.xls')) {
    return parseExcel(file)
  } else {
    throw new Error('Unsupported file type. Please use CSV or Excel (.xlsx, .xls) files.')
  }
}

/**
 * Parse a CSV file using PapaParse
 */
function parseCSV(file: File): Promise<ParsedFileData> {
  return new Promise((resolve, reject) => {
    Papa.parse(file, {
      header: true,
      skipEmptyLines: true,
      transformHeader: (header: string) => header.trim(),
      complete: (results) => {
        if (results.errors.length > 0 && results.data.length === 0) {
          reject(new Error(`CSV parsing error: ${results.errors[0].message}`))
          return
        }

        const rows = results.data as Record<string, any>[]
        if (rows.length === 0) {
          reject(new Error('File is empty or contains no valid data'))
          return
        }

        // Add row indices
        rows.forEach((row, idx) => {
          row.__rowIndex = idx + 1
        })

        const headers = Object.keys(rows[0])
        resolve({
          headers,
          rows,
          rowCount: rows.length,
        })
      },
      error: (error) => {
        reject(new Error(`Error reading file: ${error.message}`))
      },
    })
  })
}

/**
 * Parse an Excel file using xlsx
 */
async function parseExcel(file: File): Promise<ParsedFileData> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    
    reader.onload = (e) => {
      try {
        const data = new Uint8Array(e.target?.result as ArrayBuffer)
        const workbook = XLSX.read(data, { type: 'array' })
        
        // Get the first sheet
        const firstSheetName = workbook.SheetNames[0]
        if (!firstSheetName) {
          reject(new Error('Excel file has no sheets'))
          return
        }
        
        const worksheet = workbook.Sheets[firstSheetName]
        
        // Convert to JSON with headers
        const jsonData = XLSX.utils.sheet_to_json(worksheet, {
          header: 1,
          defval: '',
        }) as any[][]
        
        if (jsonData.length === 0) {
          reject(new Error('Excel file is empty'))
          return
        }
        
        // First row is headers
        const headers = (jsonData[0] || []).map((h: any) => String(h || '').trim()).filter(Boolean)
        
        if (headers.length === 0) {
          reject(new Error('Excel file has no headers'))
          return
        }
        
        // Convert rows to objects
        const rows: Record<string, any>[] = []
        for (let i = 1; i < jsonData.length; i++) {
          const rowData = jsonData[i] || []
          if (rowData.every(cell => !cell || String(cell).trim() === '')) {
            continue // Skip empty rows
          }
          
          const row: Record<string, any> = { __rowIndex: i }
          headers.forEach((header, idx) => {
            const value = rowData[idx]
            row[header] = value !== undefined && value !== null ? String(value).trim() : ''
          })
          rows.push(row)
        }
        
        if (rows.length === 0) {
          reject(new Error('Excel file has no data rows'))
          return
        }
        
        resolve({
          headers,
          rows,
          rowCount: rows.length,
        })
      } catch (error: any) {
        reject(new Error(`Error parsing Excel file: ${error.message}`))
      }
    }
    
    reader.onerror = () => {
      reject(new Error('Error reading Excel file'))
    }
    
    reader.readAsArrayBuffer(file)
  })
}

/**
 * Validate file size (10MB limit)
 */
export function validateFileSize(file: File): { valid: boolean; error?: string } {
  const maxSize = 10 * 1024 * 1024 // 10MB in bytes
  if (file.size > maxSize) {
    return {
      valid: false,
      error: `File size (${formatFileSize(file.size)}) exceeds the maximum limit of 10MB. Please use a smaller file.`,
    }
  }
  return { valid: true }
}

/**
 * Format file size for display
 */
export function formatFileSize(bytes: number): string {
  if (bytes < 1024) return bytes + ' B'
  if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(2) + ' KB'
  return (bytes / (1024 * 1024)).toFixed(2) + ' MB'
}

/**
 * Validate file type
 */
export function validateFileType(file: File): { valid: boolean; error?: string } {
  const fileName = file.name.toLowerCase()
  const validExtensions = ['.csv', '.xlsx', '.xls']
  const isValid = validExtensions.some(ext => fileName.endsWith(ext))
  
  if (!isValid) {
    return {
      valid: false,
      error: `Unsupported file type. Please use CSV or Excel files (.csv, .xlsx, .xls).`,
    }
  }
  return { valid: true }
}

