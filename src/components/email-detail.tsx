"use client"

import { useState, useEffect, useCallback } from 'react'
import { Button } from '@/components/ui/button'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { ArrowLeft, Download, Reply, Forward, Archive, Trash2, MoreVertical } from 'lucide-react'

interface EmailDetail {
  id: string
  threadId: string
  subject: string
  from: string
  to: string
  cc?: string
  date: string
  body: string
  isHtml: boolean
  snippet: string
  labelIds: string[]
  isUnread: boolean
  attachments: Array<{
    id: string
    filename: string
    mimeType: string
    size: number
  }>
  internalDate: string
}

interface EmailDetailProps {
  messageId: string | null
  onClose: () => void
}

export default function EmailDetail({ messageId, onClose }: EmailDetailProps) {
  const [email, setEmail] = useState<EmailDetail | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const fetchEmailDetail = useCallback(async (id: string) => {
    setLoading(true)
    setError(null)
    
    try {
      const response = await fetch(`/api/emails/${id}`)
      
      if (!response.ok) {
        throw new Error('Failed to fetch email details')
      }
      
      const emailData = await response.json()
      setEmail(emailData)
      
      // Mark as read if it's unread
      if (emailData.isUnread) {
        markAsRead(id)
      }
      
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch email')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    if (messageId) {
      fetchEmailDetail(messageId)
    }
  }, [messageId, fetchEmailDetail])

  const markAsRead = async (id: string) => {
    try {
      await fetch(`/api/emails/${id}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ action: 'markAsRead' })
      })
    } catch (err) {
      console.error('Failed to mark as read:', err)
    }
  }

  const downloadAttachment = async (attachmentId: string, filename: string) => {
    try {
      const response = await fetch(`/api/emails/${messageId}/attachments/${attachmentId}`)
      
      if (!response.ok) {
        throw new Error('Failed to download attachment')
      }
      
      const blob = await response.blob()
      const url = window.URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = filename
      document.body.appendChild(a)
      a.click()
      window.URL.revokeObjectURL(url)
      document.body.removeChild(a)
    } catch (err) {
      console.error('Failed to download attachment:', err)
    }
  }

  const formatDate = (dateString: string) => {
    try {
      const date = new Date(dateString)
      return date.toLocaleDateString('en-US', {
        weekday: 'long',
        year: 'numeric',
        month: 'long',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      })
    } catch {
      return dateString
    }
  }

  const getInitials = (fromString: string) => {
    const match = fromString.match(/^([^<]+)/)
    const name = match ? match[1].trim() : fromString
    return name.split(' ').map(word => word[0]).join('').toUpperCase().slice(0, 2)
  }

  const getSenderName = (fromString: string) => {
    const match = fromString.match(/^([^<]+)/)
    return match ? match[1].trim() : fromString
  }

  const getSenderEmail = (fromString: string) => {
    const match = fromString.match(/<([^>]+)>/)
    return match ? match[1] : fromString
  }

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '0 Bytes'
    const k = 1024
    const sizes = ['Bytes', 'KB', 'MB', 'GB']
    const i = Math.floor(Math.log(bytes) / Math.log(k))
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i]
  }

  if (!messageId) {
    return (
      <div className="flex-1 flex items-center justify-center bg-muted/20">
        <div className="text-center text-muted-foreground">
          <p className="text-lg mb-2">Select an email to view</p>
          <p className="text-sm">Choose an email from the list to see its contents here</p>
        </div>
      </div>
    )
  }

  if (loading) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900"></div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <div className="text-center">
          <p className="text-red-500 mb-4">Error: {error}</p>
          <Button onClick={() => messageId && fetchEmailDetail(messageId)}>Retry</Button>
        </div>
      </div>
    )
  }

  if (!email) {
    return null
  }

  return (
    <div className="flex-1 flex flex-col bg-background border-l">
      {/* Header */}
      <div className="p-4 border-b bg-background">
        <div className="flex items-center justify-between mb-4">
          <Button
            variant="ghost"
            size="sm"
            onClick={onClose}
            className="flex items-center gap-2"
          >
            <ArrowLeft className="h-4 w-4" />
            Back to list
          </Button>
          
          <div className="flex items-center gap-2">
            <Button variant="ghost" size="sm">
              <Reply className="h-4 w-4" />
            </Button>
            <Button variant="ghost" size="sm">
              <Forward className="h-4 w-4" />
            </Button>
            <Button variant="ghost" size="sm">
              <Archive className="h-4 w-4" />
            </Button>
            <Button variant="ghost" size="sm">
              <Trash2 className="h-4 w-4" />
            </Button>
            <Button variant="ghost" size="sm">
              <MoreVertical className="h-4 w-4" />
            </Button>
          </div>
        </div>

        <h1 className="text-xl font-semibold mb-3">{email.subject}</h1>
        
        <div className="flex items-start gap-3">
          <Avatar className="w-10 h-10">
            <AvatarFallback>
              {getInitials(email.from)}
            </AvatarFallback>
          </Avatar>
          
          <div className="flex-1">
            <div className="flex items-center justify-between">
              <div>
                <p className="font-medium">{getSenderName(email.from)}</p>
                <p className="text-sm text-muted-foreground">{getSenderEmail(email.from)}</p>
              </div>
              <span className="text-sm text-muted-foreground">
                {formatDate(email.date)}
              </span>
            </div>
            
            {email.to && (
              <div className="mt-2 text-sm text-muted-foreground">
                <span className="font-medium">To:</span> {email.to}
              </div>
            )}
            
            {email.cc && (
              <div className="text-sm text-muted-foreground">
                <span className="font-medium">Cc:</span> {email.cc}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Email Body */}
      <div className="flex-1 overflow-auto p-4">
        {email.isHtml ? (
          <div 
            className="prose max-w-none"
            dangerouslySetInnerHTML={{ __html: email.body }}
          />
        ) : (
          <div className="whitespace-pre-wrap font-mono text-sm">
            {email.body}
          </div>
        )}
      </div>

      {/* Attachments */}
      {email.attachments.length > 0 && (
        <div className="border-t p-4">
          <h3 className="font-medium mb-3">Attachments ({email.attachments.length})</h3>
          <div className="space-y-2">
            {email.attachments.map((attachment) => (
              <div
                key={attachment.id}
                className="flex items-center justify-between p-3 bg-muted/50 rounded-lg"
              >
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 bg-blue-100 rounded flex items-center justify-center">
                    <span className="text-xs font-medium text-blue-600">
                      {attachment.filename.split('.').pop()?.toUpperCase()}
                    </span>
                  </div>
                  <div>
                    <p className="text-sm font-medium">{attachment.filename}</p>
                    <p className="text-xs text-muted-foreground">
                      {formatFileSize(attachment.size)}
                    </p>
                  </div>
                </div>
                
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => downloadAttachment(attachment.id, attachment.filename)}
                  className="flex items-center gap-2"
                >
                  <Download className="h-4 w-4" />
                  Download
                </Button>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
} 