import React, { useState, useEffect, useRef } from 'react'
import { supabase } from '../../lib/supabase'

export default function EspaceChat({ entrepriseId, user, showToast }) {
  const [messages, setMessages] = useState([])
  const [text, setText]         = useState('')
  const [loading, setLoading]   = useState(true)
  const [sending, setSending]   = useState(false)
  const bottomRef = useRef(null)

  useEffect(() => {
    load()
    const channel = supabase
      .channel(`espace_messages:${entrepriseId}`)
      .on('postgres_changes', {
        event: 'INSERT', schema: 'public', table: 'espace_messages',
        filter: `entreprise_id=eq.${entrepriseId}`,
      }, () => load())
      .subscribe()
    return () => { supabase.removeChannel(channel) }
  }, [entrepriseId])

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  async function load() {
    const { data, error } = await supabase
      .from('espace_messages')
      .select('*, profile:profiles(prenom, initiale)')
      .eq('entreprise_id', entrepriseId)
      .order('created_at')
    if (error) { showToast(error.message, 'error'); setLoading(false); return }
    setMessages(data)
    setLoading(false)
  }

  async function handleSend(e) {
    e.preventDefault()
    if (!text.trim()) return
    setSending(true)
    const { error } = await supabase.from('espace_messages').insert({
      entreprise_id: entrepriseId, user_id: user.id, contenu: text.trim(),
    })
    if (error) showToast(error.message, 'error')
    else setText('')
    setSending(false)
  }

  if (loading) return <p style={{ color: 'var(--text-3)' }}>Chargement…</p>

  return (
    <div className="espace-chat">
      <div className="espace-chat-messages">
        {messages.length === 0 && <p className="empty-state">Aucun message pour l'instant.</p>}
        {messages.map(m => (
          <div key={m.id} className={`chat-bubble ${m.user_id === user.id ? 'mine' : ''}`}>
            <div className="chat-bubble-author">{m.profile?.prenom} {m.profile?.initiale}</div>
            <div className="chat-bubble-content">{m.contenu}</div>
            <div className="chat-bubble-time">
              {new Date(m.created_at).toLocaleString('fr-FR', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' })}
            </div>
          </div>
        ))}
        <div ref={bottomRef} />
      </div>
      <form className="espace-chat-input" onSubmit={handleSend}>
        <input
          className="form-input"
          value={text}
          onChange={e => setText(e.target.value)}
          placeholder="Écrire un message…"
        />
        <button className="btn-primary" style={{ width: 'auto', padding: '0.65rem 1.4rem' }} type="submit" disabled={sending}>
          Envoyer
        </button>
      </form>
    </div>
  )
}
