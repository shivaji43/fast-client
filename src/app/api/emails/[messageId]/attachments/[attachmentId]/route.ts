import { NextRequest, NextResponse } from 'next/server'
// @ts-expect-error - NextAuth getToken import issue
import { getToken } from 'next-auth/jwt'

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ messageId: string; attachmentId: string }> }
) {
  try {
    const token = await getToken({ 
      req: request,
      secret: process.env.NEXTAUTH_SECRET
    })
    
    if (!token?.accessToken) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 })
    }

    const { messageId, attachmentId } = await params

    const response = await fetch(
      `https://gmail.googleapis.com/gmail/v1/users/me/messages/${messageId}/attachments/${attachmentId}`,
      {
        headers: {
          'Authorization': `Bearer ${token.accessToken}`,
          'Content-Type': 'application/json',
        },
      }
    )

    if (!response.ok) {
      throw new Error(`Failed to download attachment: ${response.status}`)
    }

    const attachmentData = await response.json()
    
    // Convert base64url to binary data
    const binaryData = Buffer.from(attachmentData.data, 'base64url')

    return new NextResponse(binaryData, {
      headers: {
        'Content-Type': 'application/octet-stream',
        'Content-Disposition': 'attachment'
      }
    })

  } catch (error) {
    console.error('Error downloading attachment:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to download attachment' },
      { status: 500 }
    )
  }
} 