"use client"

import { useState, useEffect } from 'react'
import { useSession } from 'next-auth/react'
import { Button } from '@/components/ui/button'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import ComposeEmail from './compose-email'
import EmailDetail from './email-detail'
import { Plus, RefreshCw } from 'lucide-react'

interface Email {
  id: string
  threadId: string
  subject: string
  from: string
  date: string
  snippet: string
  labelIds: string[]
  isUnread: boolean
}

interface EmailsResponse {
  emails: Email[]
  nextPageToken: string | null
}

export default function EmailList() {
  const { data: session } = useSession()
  const [emails, setEmails] = useState<Email[]>([])
  const [loading, setLoading] = useState(true)
  const [loadingMore, setLoadingMore] = useState(false)
  const [nextPageToken, setNextPageToken] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [showCompose, setShowCompose] = useState(false)
  const [refreshing, setRefreshing] = useState(false)
  const [selectedEmailId, setSelectedEmailId] = useState<string | null>(null)

  const fetchEmails = async (pageToken?: string) => {
    try {
      const url = new URL('/api/emails', window.location.origin)
      if (pageToken) {
        url.searchParams.append('pageToken', pageToken)
      }

      const response = await fetch(url.toString())
      
      if (!response.ok) {
        throw new Error('Failed to fetch emails')
      }

      const data: EmailsResponse = await response.json()
      
      if (pageToken) {
        setEmails(prev => [...prev, ...data.emails])
      } else {
        setEmails(data.emails)
      }
      
      setNextPageToken(data.nextPageToken)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch emails')
    }
  }

  useEffect(() => {
    if (session) {
      setLoading(true)
      fetchEmails().finally(() => setLoading(false))
    }
  }, [session])

  const loadMore = async () => {
    if (!nextPageToken || loadingMore) return
    
    setLoadingMore(true)
    await fetchEmails(nextPageToken)
    setLoadingMore(false)
  }

  const refreshEmails = async () => {
    setRefreshing(true)
    await fetchEmails()
    setRefreshing(false)
  }

  const handleEmailSent = () => {
    // Refresh email list after sending
    refreshEmails()
  }

  const handleEmailClick = (emailId: string) => {
    setSelectedEmailId(emailId)
  }

  const handleCloseEmailDetail = () => {
    setSelectedEmailId(null)
  }

  const formatDate = (dateString: string) => {
    try {
      const date = new Date(dateString)
      const now = new Date()
      const diffTime = Math.abs(now.getTime() - date.getTime())
      const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24))
      
      if (diffDays === 1) {
        return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
      } else if (diffDays <= 7) {
        return date.toLocaleDateString([], { weekday: 'short' })
      } else {
        return date.toLocaleDateString([], { month: 'short', day: 'numeric' })
      }
    } catch {
      return ''
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

  if (!session) {
    return null
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900"></div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center">
          <p className="text-red-500 mb-4">Error: {error}</p>
          <Button onClick={() => window.location.reload()}>Retry</Button>
        </div>
      </div>
    )
  }

  return (
    <>
      <div className="flex h-[calc(100vh-80px)] overflow-hidden">
        {/* Email List Panel - Left Side */}
        <div className={`${selectedEmailId ? 'w-1/2' : 'w-full'} flex flex-col transition-all duration-300 border-r`}>
          <div className="p-4 border-b bg-background">
                  {/* Header with actions */}
            <div className="flex items-center justify-between mb-4">
              <h1 className="text-2xl font-bold">Inbox</h1>
                      <div className="flex items-center gap-2">
                <Button
                  onClick={refreshEmails}
                  variant="outline"
                  size="sm"
                  disabled={refreshing}
                  className="flex items-center gap-2"
                >
                  <RefreshCw className={`h-4 w-4 ${refreshing ? 'animate-spin' : ''}`} />
                  Refresh
                </Button>
                <Button
                  onClick={() => setShowCompose(true)}
                  className="flex items-center gap-2"
                >
                  <Plus className="h-4 w-4" />
                  Compose
                </Button>
              </div>
            </div>

            <div className="bg-background border rounded-lg flex-1 overflow-hidden flex flex-col">
                      {emails.length === 0 ? (
                <div className="p-8 text-center text-muted-foreground">
                  No emails found
                </div>
              ) : (
                <div className="divide-y overflow-auto flex-1">
                              {emails.map((email) => (
                    <div
                      key={email.id}
                      onClick={() => handleEmailClick(email.id)}
                      className={`p-4 hover:bg-muted/50 cursor-pointer transition-colors ${
                        email.isUnread ? 'bg-background' : 'bg-muted/20'
                      } ${selectedEmailId === email.id ? 'bg-blue-50 border-r-2 border-blue-500' : ''}`}
                    >
                <div className="flex items-center gap-3">
                                        <Avatar className="w-10 h-10 flex-shrink-0">
                        <AvatarFallback className="text-sm">
                          {getInitials(email.from)}
                        </AvatarFallback>
                      </Avatar>
                      
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between mb-1">
                          <p className={`text-sm truncate ${
                            email.isUnread ? 'font-semibold' : 'font-normal'
                          }`}>
                            {getSenderName(email.from)}
                          </p>
                          <span className="text-xs text-muted-foreground flex-shrink-0 ml-2">
                            {formatDate(email.date)}
                          </span>
                        </div>
                        
                        <h3 className={`text-sm truncate mb-1 ${
                          email.isUnread ? 'font-semibold' : 'font-normal'
                        }`}>
                          {email.subject}
                        </h3>
                        
                        <p className="text-xs text-muted-foreground truncate">
                          {email.snippet}
                        </p>
                      </div>
                      
                      {email.isUnread && (
                        <div className="w-2 h-2 bg-blue-500 rounded-full flex-shrink-0"></div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
            
            {nextPageToken && (
              <div className="p-4 border-t">
                <Button 
                  onClick={loadMore} 
                  disabled={loadingMore}
                  variant="outline"
                  className="w-full"
                >
                  {loadingMore ? 'Loading...' : 'Load More'}
                </Button>
              </div>
            )}
            </div>
          </div>
        </div>

        {/* Email Detail Panel - Right Side */}
        {selectedEmailId && (
          <EmailDetail
            messageId={selectedEmailId}
            onClose={handleCloseEmailDetail}
          />
        )}
      </div>

      {/* Compose Email Modal */}
      <ComposeEmail
        isOpen={showCompose}
        onClose={() => setShowCompose(false)}
        onSent={handleEmailSent}
      />
    </>
  )
} 