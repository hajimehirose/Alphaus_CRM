'use client'

import { useState } from 'react'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Loader2 } from 'lucide-react'
import { USER_ROLES } from '@/lib/constants'
import { useToast } from '@/hooks/use-toast'

interface AddUserDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onSuccess: () => void
}

export default function AddUserDialog({ open, onOpenChange, onSuccess }: AddUserDialogProps) {
  const { toast } = useToast()
  const [email, setEmail] = useState('')
  const [selectedRole, setSelectedRole] = useState<string>('')
  const [loading, setLoading] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!email || !selectedRole) {
      toast({
        variant: 'destructive',
        title: 'Validation Error',
        description: 'Please fill in all fields',
      })
      return
    }

    setLoading(true)
    let res: Response | null = null
    try {
      res = await fetch('/api/users/invite', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, role: selectedRole }),
      })

      const data = await res.json()

      if (res.ok) {
        toast({
          variant: 'success',
          title: 'Success',
          description: `Role ${selectedRole} assigned to ${email}`,
        })
        setEmail('')
        setSelectedRole('')
        onOpenChange(false)
        onSuccess()
      } else {
        // Handle error response
        let errorMessage: string | React.ReactNode = data.message || data.error || 'Failed to assign role'
        let errorTitle = 'Error'
        
        if (data.error === 'User not found' || data.instructions) {
          errorTitle = 'User Not Found'
          errorMessage = data.message || errorMessage
          if (data.instructions && Array.isArray(data.instructions)) {
            errorMessage = (
              <div>
                <p className="mb-2">{String(errorMessage)}</p>
                <ul className="list-disc list-inside text-sm space-y-1">
                  {data.instructions.map((instruction: string, idx: number) => (
                    <li key={idx}>{instruction}</li>
                  ))}
                </ul>
              </div>
            )
          }
        }
        
        toast({
          variant: 'destructive',
          title: errorTitle,
          description: errorMessage,
        })
      }
    } catch (error: any) {
      console.error('Error assigning role:', error)
      toast({
        variant: 'destructive',
        title: 'Error',
        description: error.message || 'Failed to assign role. Please check your connection and try again.',
      })
    } finally {
      setLoading(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Add User / Assign Role</DialogTitle>
          <DialogDescription>
            Assign a role to a user by email. If the user hasn&apos;t logged in yet, the role will be assigned when they first log in.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="text-sm font-medium mb-2 block">Email Address</label>
            <Input
              type="email"
              placeholder="user@example.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />
            <p className="text-xs text-muted-foreground mt-1">
              User must log in via Google OAuth first
            </p>
          </div>
          <div>
            <label className="text-sm font-medium mb-2 block">Role</label>
            <Select value={selectedRole} onValueChange={setSelectedRole} required>
              <SelectTrigger>
                <SelectValue placeholder="Select a role" />
              </SelectTrigger>
              <SelectContent>
                {USER_ROLES.map(role => (
                  <SelectItem key={role} value={role}>
                    {role}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="flex justify-end gap-2 pt-4">
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={loading}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={loading}>
              {loading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Assigning...
                </>
              ) : (
                'Assign Role'
              )}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  )
}

