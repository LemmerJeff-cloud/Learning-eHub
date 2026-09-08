import React, { useEffect, useState } from 'react'

export default function Toast({ msg, type }) {
  const [visible, setVisible] = useState(false)
  useEffect(() => {
    setTimeout(() => setVisible(true), 10)
    return () => setVisible(false)
  }, [])
  return (
    <div className={`toast ${type} ${visible ? 'show' : ''}`}>{msg}</div>
  )
}
