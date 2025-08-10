"use client"

import { useSession, signOut } from "next-auth/react"
import { Button } from "@/components/ui/button"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"

export default function AppBar() {
  const { data: session } = useSession()

  if (!session) {
    return null
  }

  return (
    <div className="w-full bg-background border-b">
      <div className="max-w-7xl mx-auto px-4">
        <div className="flex justify-end py-2">
          <div className="flex items-center  bg-muted/50 rounded-full px-2 py-2 border">
            <Avatar className="w-8 h-8">
              <AvatarImage 
                src={session.user?.image || ""} 
                alt={session.user?.name || "User"} 
              />
              <AvatarFallback className="text-sm">
                {session.user?.name?.charAt(0).toUpperCase() || "U"}
              </AvatarFallback>
            </Avatar>
            <Button 
              onClick={() => signOut()} 
              variant="ghost"
              size="sm"
              className="h-8 px-3 text-sm"
            >
              Sign Out
            </Button>
          </div>
        </div>
      </div>
    </div>
  )
} 