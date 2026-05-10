import type { Metadata } from 'next'
import './globals.css'

export const metadata: Metadata = {
  title: 'Everest System — نظام إدارة الديكور',
  description: 'Decoration & Project Management System',
}

// Patch broken localStorage in environments where it exists but getItem is broken
const patchScript = `
try {
  if (typeof localStorage !== 'undefined' && typeof localStorage.getItem !== 'function') {
    var _mem = {};
    Object.defineProperty(window, 'localStorage', { value: { getItem: function(k){return _mem[k]||null}, setItem: function(k,v){_mem[k]=v}, removeItem: function(k){delete _mem[k]}, clear: function(){_mem={}}, key: function(){return null}, length: 0 }, writable: true });
  }
} catch(e) {}
`

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: patchScript }} />
      </head>
      <body suppressHydrationWarning>{children}</body>
    </html>
  )
}
