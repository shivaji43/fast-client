import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth/next'
// @ts-expect-error - NextAuth getToken import issue
import { getToken } from 'next-auth/jwt'
import { authOptions } from '@/lib/auth'

interface GmailHeader {
  name: string;
  value: string;
}

interface GmailMessage {
  id: string;
  threadId: string;
  labelIds?: string[];
  snippet?: string;
  payload?: {
    headers?: GmailHeader[];
  };
  internalDate?: string;
}

export async function GET(request: NextRequest) {
  try {
    // Try to get session first (which should work better in app router)
    const session = await getServerSession(authOptions)
    
    // Also try to get token
    const token = await getToken({ 
      req: request,
      secret: process.env.NEXTAUTH_SECRET
    })
    

    
    // Use session access token if available, otherwise token
    const accessToken = (session as { accessToken?: string })?.accessToken || token?.accessToken
    
    if (!accessToken) {
      return NextResponse.json({ 
        error: 'No access token found. Please sign out and sign back in.',
        debug: { 
          hasSession: !!session,
          hasToken: !!token,
          sessionKeys: session ? Object.keys(session) : [],
          tokenKeys: token ? Object.keys(token) : [],
          suggestion: 'Sign out and sign back in to get fresh tokens'
        }
      }, { status: 401 })
    }


    const { searchParams } = new URL(request.url)
    const pageToken = searchParams.get('pageToken') || ''
    const maxResults = 15

    // Build Gmail API URL
    const gmailUrl = new URL('https://gmail.googleapis.com/gmail/v1/users/me/messages')
    gmailUrl.searchParams.append('maxResults', maxResults.toString())
    if (pageToken) {
      gmailUrl.searchParams.append('pageToken', pageToken)
    }

    // Fetch message list
    const messagesResponse = await fetch(gmailUrl.toString(), {
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
    })

    if (!messagesResponse.ok) {
      throw new Error(`Gmail API error: ${messagesResponse.status}`)
    }

    const messagesData = await messagesResponse.json()
    
    if (!messagesData.messages) {
      return NextResponse.json({ 
        emails: [], 
        nextPageToken: null 
      })
    }

    // Fetch details for each message
    const emailPromises = messagesData.messages.map(async (message: { id: string; threadId: string }) => {
      const messageResponse = await fetch(
        `https://gmail.googleapis.com/gmail/v1/users/me/messages/${message.id}?format=metadata&metadataHeaders=Subject&metadataHeaders=From&metadataHeaders=Date`,
        {
          headers: {
            'Authorization': `Bearer ${accessToken}`,
            'Content-Type': 'application/json',
          },
        }
      )
      
      if (!messageResponse.ok) {
        return null
      }
      
      const messageData: GmailMessage = await messageResponse.json()
      
      // Extract headers
      const headers = messageData.payload?.headers || []
      const subject = headers.find((h: GmailHeader) => h.name === 'Subject')?.value || 'No Subject'
      const from = headers.find((h: GmailHeader) => h.name === 'From')?.value || 'Unknown Sender'
      const date = headers.find((h: GmailHeader) => h.name === 'Date')?.value || ''
      
      return {
        id: messageData.id,
        threadId: messageData.threadId,
        subject,
        from,
        date,
        snippet: messageData.snippet || '',
        labelIds: messageData.labelIds || [],
        isUnread: messageData.labelIds?.includes('UNREAD') || false,
      }
    })

    const emails = (await Promise.all(emailPromises)).filter(Boolean)

    return NextResponse.json({
      emails,
      nextPageToken: messagesData.nextPageToken || null,
    })

  } catch (error) {
    console.error('Error fetching emails:', error)
    return NextResponse.json(
      { error: 'Failed to fetch emails' },
      { status: 500 }
    )
  }
} 