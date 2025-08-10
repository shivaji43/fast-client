import { NextRequest, NextResponse } from 'next/server'
import { getToken } from 'next-auth/jwt'

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ messageId: string }> }
) {
  try {
    const token = await getToken({ 
      req: request,
      secret: process.env.NEXTAUTH_SECRET
    })
    
    if (!token?.accessToken) {
      return NextResponse.json({ 
        error: 'Not authenticated' 
      }, { status: 401 })
    }

    const { messageId } = await params



    // Fetch full message details
    const response = await fetch(
      `https://gmail.googleapis.com/gmail/v1/users/me/messages/${messageId}?format=full`,
      {
        headers: {
          'Authorization': `Bearer ${token.accessToken}`,
          'Content-Type': 'application/json',
        },
      }
    )

    if (!response.ok) {
      const errorData = await response.json()

      
      // If it's the specific "metadata scope doesn't allow format FULL" error, try metadata format
      if (response.status === 403 && errorData.error?.message?.includes("Metadata scope doesn't allow format FULL")) {
        
        const metadataResponse = await fetch(
          `https://gmail.googleapis.com/gmail/v1/users/me/messages/${messageId}?format=metadata&metadataHeaders=Subject&metadataHeaders=From&metadataHeaders=To&metadataHeaders=Cc&metadataHeaders=Date`,
          {
            headers: {
              'Authorization': `Bearer ${token.accessToken}`,
              'Content-Type': 'application/json',
            },
          }
        )
        
        if (!metadataResponse.ok) {
          const metadataError = await metadataResponse.json()
          throw new Error(`Gmail API error: ${metadataResponse.status} - ${metadataError.error?.message || 'Unknown error'}`)
        }
        
        const metadataMessageData = await metadataResponse.json()
        
        // Extract headers
        const headers = metadataMessageData.payload?.headers || []
        const subject = headers.find((h: any) => h.name === 'Subject')?.value || 'No Subject'
        const from = headers.find((h: any) => h.name === 'From')?.value || 'Unknown Sender'
        const to = headers.find((h: any) => h.name === 'To')?.value || ''
        const cc = headers.find((h: any) => h.name === 'Cc')?.value || ''
        const date = headers.find((h: any) => h.name === 'Date')?.value || ''
        
        // For metadata format, use snippet with upgrade message
        const body = metadataMessageData.snippet ? 
          `${metadataMessageData.snippet}\n\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n\n⚠️ LIMITED PREVIEW ONLY\n\nTo view the full email content:\n1. Sign out of your account\n2. Sign back in to refresh permissions\n3. Gmail will ask for updated permissions\n\nThis will enable full email content viewing.` :
          'Email content not available. Please sign out and sign back in to view full emails.'
        
        const emailDetail = {
          id: metadataMessageData.id,
          threadId: metadataMessageData.threadId,
          subject,
          from,
          to,
          cc,
          date,
          body,
          isHtml: false,
          snippet: metadataMessageData.snippet || '',
          labelIds: metadataMessageData.labelIds || [],
          isUnread: metadataMessageData.labelIds?.includes('UNREAD') || false,
          attachments: [], // No attachments in metadata format
          internalDate: metadataMessageData.internalDate
        }
        
        return NextResponse.json(emailDetail)
      }
      
      throw new Error(`Gmail API error: ${response.status} - ${errorData.error?.message || 'Unknown error'}`)
    }

    const messageData = await response.json()
    
    // Extract headers
    const headers = messageData.payload?.headers || []
    const subject = headers.find((h: any) => h.name === 'Subject')?.value || 'No Subject'
    const from = headers.find((h: any) => h.name === 'From')?.value || 'Unknown Sender'
    const to = headers.find((h: any) => h.name === 'To')?.value || ''
    const cc = headers.find((h: any) => h.name === 'Cc')?.value || ''
    const date = headers.find((h: any) => h.name === 'Date')?.value || ''
    
    // Extract email body
    let body = ''
    let isHtml = false
    

    
    const extractBody = (payload: any): void => {
      if (payload.parts) {
        // Multipart message - look for text parts
        for (const part of payload.parts) {

          
          if (part.mimeType === 'text/plain' && !body) {
            // Use plain text if no HTML found yet
            if (part.body?.data) {
              try {
                body = Buffer.from(part.body.data.replace(/-/g, '+').replace(/_/g, '/'), 'base64').toString('utf-8')
              } catch (err) {
                console.error('Error decoding plain text part:', err)
              }
            }
          } else if (part.mimeType === 'text/html') {
            // Prefer HTML content
            if (part.body?.data) {
              try {
                body = Buffer.from(part.body.data.replace(/-/g, '+').replace(/_/g, '/'), 'base64').toString('utf-8')
                isHtml = true
              } catch (err) {
                console.error('Error decoding HTML part:', err)
              }
            }
          } else if (part.parts) {
            // Recursively check nested parts
            extractBody(part)
          }
        }
      } else if (payload.body?.data) {
        // Single part message
        try {
          body = Buffer.from(payload.body.data.replace(/-/g, '+').replace(/_/g, '/'), 'base64').toString('utf-8')
          isHtml = payload.mimeType === 'text/html'
        } catch (err) {
          console.error('Error decoding single part body:', err)
        }
      }
    }
    
    extractBody(messageData.payload)
    
    // Fallback to snippet if no body found
    if (!body) {
      body = messageData.snippet || 'No content available'
    }

    // Extract attachments info
    const attachments: any[] = []
    const extractAttachments = (payload: any): void => {
      if (payload.parts) {
        for (const part of payload.parts) {
          if (part.filename && part.body?.attachmentId) {
            attachments.push({
              id: part.body.attachmentId,
              filename: part.filename,
              mimeType: part.mimeType,
              size: part.body.size || 0
            })
          } else if (part.parts) {
            extractAttachments(part)
          }
        }
      }
    }
    
    extractAttachments(messageData.payload)

    const emailDetail = {
      id: messageData.id,
      threadId: messageData.threadId,
      subject,
      from,
      to,
      cc,
      date,
      body,
      isHtml,
      snippet: messageData.snippet || '',
      labelIds: messageData.labelIds || [],
      isUnread: messageData.labelIds?.includes('UNREAD') || false,
      attachments,
      internalDate: messageData.internalDate
    }



    return NextResponse.json(emailDetail)

  } catch (error) {
    console.error('Error fetching email details:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to fetch email details' },
      { status: 500 }
    )
  }
}

// Mark email as read
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ messageId: string }> }
) {
  try {
    const token = await getToken({ 
      req: request,
      secret: process.env.NEXTAUTH_SECRET
    })
    
    if (!token?.accessToken) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 })
    }

    const { messageId } = await params
    const { action } = await request.json()

    let body = {}
    if (action === 'markAsRead') {
      body = {
        removeLabelIds: ['UNREAD']
      }
    } else if (action === 'markAsUnread') {
      body = {
        addLabelIds: ['UNREAD']
      }
    }

    const response = await fetch(
      `https://gmail.googleapis.com/gmail/v1/users/me/messages/${messageId}/modify`,
      {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token.accessToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(body)
      }
    )

    if (!response.ok) {
      throw new Error(`Failed to update message: ${response.status}`)
    }

    const result = await response.json()
    return NextResponse.json({ success: true, messageId: result.id })

  } catch (error) {
    console.error('Error updating email:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to update email' },
      { status: 500 }
    )
  }
} 