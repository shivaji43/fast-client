"use client"

import { useState, useEffect } from 'react'
import { useSession } from 'next-auth/react'
import { Button } from '@/components/ui/button'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
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
  const [backgroundFetching, setBackgroundFetching] = useState(false)
  const [totalFetched, setTotalFetched] = useState(0)
  const MAX_EMAILS = 120
  const INITIAL_BATCH_SIZE = 15
  const SUBSEQUENT_BATCH_SIZE = 30

  const fetchEmails = async (pageToken?: string, batchSize?: number, isBackground = false) => {
    try {
      const url = new URL('/api/emails', window.location.origin)
      if (pageToken) {
        url.searchParams.append('pageToken', pageToken)
      }
      if (batchSize) {
        url.searchParams.append('batchSize', batchSize.toString())
      }

      const response = await fetch(url.toString())
      
      if (!response.ok) {
        throw new Error('Failed to fetch emails')
      }

      const data: EmailsResponse = await response.json()
      
      if (pageToken) {
        setEmails(prev => [...prev, ...data.emails])
        setTotalFetched(prev => prev + data.emails.length)
      } else {
        setEmails(data.emails)
        setTotalFetched(data.emails.length)
      }
      
      // Always set nextPageToken from API response
      setNextPageToken(data.nextPageToken)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch emails')
    }
  }

  useEffect(() => {
    if (session) {
      setLoading(true)
      // Load initial batch of 15 emails
      fetchEmails(undefined, INITIAL_BATCH_SIZE).finally(() => setLoading(false))
    }
  }, [session])

  // Background fetching effect
  useEffect(() => {
    if (session && !loading && !backgroundFetching && nextPageToken && totalFetched < MAX_EMAILS) {
      const timer = setTimeout(() => {
        setBackgroundFetching(true)
        fetchEmails(nextPageToken, SUBSEQUENT_BATCH_SIZE, true).finally(() => {
          setBackgroundFetching(false)
        })
      }, 2000) // Wait 2 seconds before starting background fetch

      return () => clearTimeout(timer)
    }
  }, [session, loading, backgroundFetching, nextPageToken, totalFetched])

  const loadMore = async () => {
    if (!nextPageToken || loadingMore) return
    
    setLoadingMore(true)
    await fetchEmails(nextPageToken, SUBSEQUENT_BATCH_SIZE)
    setLoadingMore(false)
  }

  const refreshEmails = async () => {
    setRefreshing(true)
    setTotalFetched(0)
    setBackgroundFetching(false)
    await fetchEmails(undefined, INITIAL_BATCH_SIZE)
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
      <div className="flex h-screen">
        {/* Email List Panel - Left Side */}
        <div className={`${selectedEmailId ? 'w-1/2' : 'w-full'} flex flex-col transition-all duration-300 border-r`}>
          <div className="p-4 border-b bg-background flex-shrink-0">
                  {/* Header with actions */}
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-3">
                <h1 className="text-2xl font-bold">Inbox</h1>
                {totalFetched > 0 && (
                  <span className="text-sm text-muted-foreground bg-muted px-2 py-1 rounded">
                    {totalFetched}
                  </span>
                )}
              </div>
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
          </div>

          <div className="flex-1 overflow-auto bg-background border rounded-lg mx-4 mb-4">
                      {emails.length === 0 ? (
                <div className="p-8 text-center text-muted-foreground">
                  No emails found
                </div>
              ) : (
                <>
                  <div className="divide-y">
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
                  
                  {/* Load More or Status */}
                  <div className="p-4 border-t">
                    {nextPageToken ? (
                      <Button 
                        onClick={loadMore} 
                        disabled={loadingMore}
                        variant="outline"
                        className="w-full"
                      >
                        {loadingMore ? 'Loading...' : 'Load More'}
                      </Button>
                    ) : (
                      <div className="text-center text-sm text-muted-foreground">
                        {totalFetched > 0 && `Loaded ${totalFetched} emails`}
                        {backgroundFetching && (
                          <div className="flex items-center justify-center gap-2 mt-2">
                            <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-gray-900"></div>
                            <span>Loading more emails...</span>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                </>
              )}
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