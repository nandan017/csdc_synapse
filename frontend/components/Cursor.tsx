'use client'

import { useEffect, useRef } from 'react'

export default function Cursor() {
  const dotRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    // Hide on touch devices
    if ('ontouchstart' in window || navigator.maxTouchPoints > 0) return

    const onMove = (e: MouseEvent) => {
      if (dotRef.current) {
        dotRef.current.style.left = e.clientX + 'px'
        dotRef.current.style.top  = e.clientY + 'px'
        dotRef.current.style.opacity = '1'
      }
    }
    window.addEventListener('mousemove', onMove)
    return () => window.removeEventListener('mousemove', onMove)
  }, [])

  return (
    <div ref={dotRef} style={{
      position:'fixed', zIndex:10000, pointerEvents:'none',
      width:8, height:8, borderRadius:'50%',
      background:'#CFFF00',
      transform:'translate(-50%,-50%)',
      boxShadow:'0 0 8px rgba(207,255,0,0.7)',
      opacity:0,
      transition:'opacity .2s',
    }} />
  )
}
