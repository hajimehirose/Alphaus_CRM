'use client'

import { useState, useRef, useEffect, KeyboardEvent } from 'react'
import { Card, CardContent } from '@/components/ui/card'

interface User {
  id: string
  email: string
  name: string
}

interface MentionInputProps {
  value: string
  onChange: (value: string) => void
  placeholder?: string
  users: User[]
}

export default function MentionInput({ 
  value, 
  onChange, 
  placeholder = 'Write a note...',
  users 
}: MentionInputProps) {
  const [showMentions, setShowMentions] = useState(false)
  const [mentionQuery, setMentionQuery] = useState('')
  const [mentionPosition, setMentionPosition] = useState(0)
  const [selectedMentionIndex, setSelectedMentionIndex] = useState(0)
  const textareaRef = useRef<HTMLTextAreaElement>(null)
  const mentionsRef = useRef<HTMLDivElement>(null)

  const filteredUsers = users.filter(user =>
    user.name.toLowerCase().includes(mentionQuery.toLowerCase()) ||
    user.email.toLowerCase().includes(mentionQuery.toLowerCase())
  ).slice(0, 5)

  const handleChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const newValue = e.target.value
    const cursorPos = e.target.selectionStart

    // Check for @ mention trigger
    const textBeforeCursor = newValue.substring(0, cursorPos)
    const lastAtIndex = textBeforeCursor.lastIndexOf('@')

    if (lastAtIndex !== -1) {
      const textAfterAt = textBeforeCursor.substring(lastAtIndex + 1)
      // Check if we're still typing the mention (no space after @)
      if (!textAfterAt.includes(' ') && !textAfterAt.includes('\n')) {
        setMentionQuery(textAfterAt)
        setMentionPosition(lastAtIndex)
        setShowMentions(true)
        setSelectedMentionIndex(0)
        return
      }
    }

    setShowMentions(false)
    onChange(newValue)
  }

  const insertMention = (user: User) => {
    const textBefore = value.substring(0, mentionPosition)
    const textAfter = value.substring(textareaRef.current?.selectionStart || value.length)
    const newValue = `${textBefore}@${user.name} ${textAfter}`
    
    onChange(newValue)
    setShowMentions(false)
    setMentionQuery('')

    // Focus back on textarea and set cursor position
    setTimeout(() => {
      const newCursorPos = mentionPosition + user.name.length + 2 // @ + name + space
      textareaRef.current?.setSelectionRange(newCursorPos, newCursorPos)
      textareaRef.current?.focus()
    }, 0)
  }

  const handleKeyDown = (e: KeyboardEvent<HTMLTextAreaElement>) => {
    if (showMentions && filteredUsers.length > 0) {
      if (e.key === 'ArrowDown') {
        e.preventDefault()
        setSelectedMentionIndex((prev) =>
          prev < filteredUsers.length - 1 ? prev + 1 : prev
        )
      } else if (e.key === 'ArrowUp') {
        e.preventDefault()
        setSelectedMentionIndex((prev) => (prev > 0 ? prev - 1 : 0))
      } else if (e.key === 'Enter' || e.key === 'Tab') {
        e.preventDefault()
        insertMention(filteredUsers[selectedMentionIndex])
      } else if (e.key === 'Escape') {
        setShowMentions(false)
      }
    }
  }

  // Parse mentions from content
  const parseMentions = (content: string): string[] => {
    const mentionRegex = /@(\w+)/g
    const mentions: string[] = []
    let match
    while ((match = mentionRegex.exec(content)) !== null) {
      mentions.push(match[1])
    }
    return mentions
  }

  // Render content with highlighted mentions
  const renderContent = (content: string) => {
    if (!content) return ''
    const parts = content.split(/(@\w+)/g)
    return parts.map((part, index) => {
      if (part.startsWith('@')) {
        const username = part.substring(1)
        const user = users.find(u => 
          u.name.toLowerCase() === username.toLowerCase() ||
          u.email.split('@')[0].toLowerCase() === username.toLowerCase()
        )
        if (user) {
          return (
            <span key={index} className="bg-blue-100 dark:bg-blue-900/30 px-1 rounded font-medium">
              {part}
            </span>
          )
        }
      }
      return <span key={index}>{part}</span>
    })
  }

  return (
    <div className="relative">
      <textarea
        ref={textareaRef}
        value={value}
        onChange={handleChange}
        onKeyDown={handleKeyDown}
        placeholder={placeholder}
        className="w-full min-h-[100px] rounded-md border border-input bg-background px-3 py-2 text-sm"
      />
      
      {showMentions && filteredUsers.length > 0 && (
        <Card className="absolute z-50 mt-1 w-64 shadow-lg">
          <CardContent className="p-0">
            <div ref={mentionsRef} className="max-h-48 overflow-y-auto">
              {filteredUsers.map((user, index) => (
                <button
                  key={user.id}
                  type="button"
                  className={`w-full text-left px-3 py-2 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors ${
                    index === selectedMentionIndex ? 'bg-gray-100 dark:bg-gray-800' : ''
                  }`}
                  onClick={() => insertMention(user)}
                >
                  <div className="font-medium text-sm">{user.name}</div>
                  <div className="text-xs text-muted-foreground">{user.email}</div>
                </button>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}

