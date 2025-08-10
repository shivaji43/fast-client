"use client"

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { X, Send, Minimize2 } from 'lucide-react'

interface ComposeEmailProps {
  isOpen: boolean
  onClose: () => void
  onSent?: () => void
}

export default function ComposeEmail({ isOpen, onClose, onSent }: ComposeEmailProps) {
  const [to, setTo] = useState('')
  const [cc, setCc] = useState('')
  const [bcc, setBcc] = useState('')
  const [subject, setSubject] = useState('')
  const [body, setBody] = useState('')
  const [showCc, setShowCc] = useState(false)
  const [showBcc, setShowBcc] = useState(false)
  const [isMinimized, setIsMinimized] = useState(false)
  const [isSending, setIsSending] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const resetForm = () => {
    setTo('')
    setCc('')
    setBcc('')
    setSubject('')
    setBody('')
    setShowCc(false)
    setShowBcc(false)
    setError(null)
  }

  const handleClose = () => {
    resetForm()
    onClose()
  }

  const handleSend = async () => {
    if (!to.trim() || !subject.trim() || !body.trim()) {
      setError('Please fill in all required fields')
      return
    }

    setIsSending(true)
    setError(null)

    try {
      const response = await fetch('/api/emails/send', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          to: to.trim(),
          cc: cc.trim() || undefined,
          bcc: bcc.trim() || undefined,
          subject: subject.trim(),
          body: body.trim(),
          isHtml: false
        })
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Failed to send email')
      }

      // Success
      resetForm()
      onClose()
      onSent?.()
      
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to send email')
    } finally {
      setIsSending(false)
    }
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-end p-4">
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/20" onClick={handleClose} />
      
      {/* Compose Window */}
      <div className={`relative bg-background border border-border rounded-lg shadow-xl transition-all duration-200 ${
        isMinimized 
          ? 'w-80 h-12' 
          : 'w-[600px] h-[500px]'
      }`}>
        
        {/* Header */}
        <div className="flex items-center justify-between p-3 border-b bg-muted/50 rounded-t-lg">
          <h2 className="text-sm font-medium">
            {isMinimized ? 'New Message' : 'Compose'}
          </h2>
          <div className="flex items-center gap-1">
            <Button
              variant="ghost"
              size="sm"
              className="h-6 w-6 p-0"
              onClick={() => setIsMinimized(!isMinimized)}
            >
              <Minimize2 className="h-3 w-3" />
            </Button>
            <Button
              variant="ghost"
              size="sm"
              className="h-6 w-6 p-0"
              onClick={handleClose}
            >
              <X className="h-3 w-3" />
            </Button>
          </div>
        </div>

        {/* Content */}
        {!isMinimized && (
          <div className="flex flex-col h-[calc(100%-48px)]">
            {/* Recipients */}
            <div className="p-3 space-y-2 border-b">
              <div className="flex items-center gap-2">
                <label className="text-sm font-medium w-12">To:</label>
                <input
                  type="email"
                  value={to}
                  onChange={(e) => setTo(e.target.value)}
                  placeholder="Recipients"
                  className="flex-1 text-sm bg-transparent border-none outline-none"
                  multiple
                />
                <div className="flex gap-2 text-xs">
                  {!showCc && (
                    <button
                      type="button"
                      onClick={() => setShowCc(true)}
                      className="text-blue-600 hover:underline"
                    >
                      Cc
                    </button>
                  )}
                  {!showBcc && (
                    <button
                      type="button"
                      onClick={() => setShowBcc(true)}
                      className="text-blue-600 hover:underline"
                    >
                      Bcc
                    </button>
                  )}
                </div>
              </div>
              
              {showCc && (
                <div className="flex items-center gap-2">
                  <label className="text-sm font-medium w-12">Cc:</label>
                  <input
                    type="email"
                    value={cc}
                    onChange={(e) => setCc(e.target.value)}
                    placeholder="Carbon copy"
                    className="flex-1 text-sm bg-transparent border-none outline-none"
                  />
                </div>
              )}
              
              {showBcc && (
                <div className="flex items-center gap-2">
                  <label className="text-sm font-medium w-12">Bcc:</label>
                  <input
                    type="email"
                    value={bcc}
                    onChange={(e) => setBcc(e.target.value)}
                    placeholder="Blind carbon copy"
                    className="flex-1 text-sm bg-transparent border-none outline-none"
                  />
                </div>
              )}
              
              <div className="flex items-center gap-2">
                <label className="text-sm font-medium w-12">Subject:</label>
                <input
                  type="text"
                  value={subject}
                  onChange={(e) => setSubject(e.target.value)}
                  placeholder="Subject"
                  className="flex-1 text-sm bg-transparent border-none outline-none"
                />
              </div>
            </div>

            {/* Message Body */}
            <div className="flex-1 p-3">
              <textarea
                value={body}
                onChange={(e) => setBody(e.target.value)}
                placeholder="Compose your message..."
                className="w-full h-full resize-none bg-transparent border-none outline-none text-sm"
              />
            </div>

            {/* Error Message */}
            {error && (
              <div className="px-3 py-2 text-sm text-red-600 bg-red-50 border-t">
                {error}
              </div>
            )}

            {/* Footer */}
            <div className="flex items-center justify-between p-3 border-t">
              <Button
                onClick={handleSend}
                disabled={isSending || !to.trim() || !subject.trim() || !body.trim()}
                className="flex items-center gap-2"
              >
                <Send className="h-4 w-4" />
                {isSending ? 'Sending...' : 'Send'}
              </Button>
              
              <div className="text-xs text-muted-foreground">
                {body.length} characters
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
} 