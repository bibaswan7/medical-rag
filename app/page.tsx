// app/page.tsx
"use client"

import { useRef, useState, useEffect } from "react"
import ReactMarkdown from "react-markdown"
import remarkGfm from "remark-gfm"
import { Send, RefreshCw, MessageCircle, User, Bot } from "lucide-react"

type Message = {
  id: string
  type: "user" | "ai"
  content: string
}

export default function Home() {
  const [loading, setLoading] = useState(false)
  const [prompt, setPrompt] = useState("")
  const [messages, setMessages] = useState<Message[]>([])
  const [currentAiMessage, setCurrentAiMessage] = useState("")
  const chatContainerRef = useRef<HTMLDivElement>(null)
  const textareaRef = useRef<HTMLTextAreaElement>(null)

  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto'
      textareaRef.current.style.height = Math.min(textareaRef.current.scrollHeight, 120) + 'px'
    }
  }, [prompt])

  const scrollToBottom = () => {
    chatContainerRef.current?.scrollTo({ top: chatContainerRef.current.scrollHeight, behavior: 'smooth' })
  }

  useEffect(scrollToBottom, [messages, currentAiMessage])

  const resetChat = () => {
    setMessages([])
    setCurrentAiMessage("")
    setPrompt("")
  }

  const streamResponse = async (response: Response) => {
    const reader = response.body?.getReader()
    if (!reader) return

    let fullResponse = ""

    while (true) {
      const { done, value } = await reader.read()
      if (done) {
        setMessages(prev => [...prev, { id: Date.now().toString(), type: "ai", content: fullResponse }])
        setCurrentAiMessage("")
        break
      }
      const text = new TextDecoder("utf-8").decode(value)
      const lines = text.split("\n").filter(line => line).map(line => JSON.parse(line.trim()))
      for (const line of lines) {
        const { choices } = line
        const { delta } = choices[0]
        const { content } = delta
        if (content) {
          fullResponse += content
          setCurrentAiMessage(fullResponse)
        }
      }
    }
  }

  const generateResponse = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!prompt.trim() || loading) return

    const userMessage: Message = { id: Date.now().toString(), type: "user", content: prompt.trim() }
    setMessages(prev => [...prev, userMessage])
    setPrompt("")
    setLoading(true)

    try {
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ prompt: userMessage.content }),
      })

      if (!res.ok) throw new Error("Error")

      await streamResponse(res)
    } catch (error) {
      console.error(error)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="flex h-screen bg-gray-50">
      <div ref={chatContainerRef} className="flex-1 flex flex-col overflow-hidden">
        <div className="flex-1 overflow-y-auto px-8 py-6 space-y-6">
          {messages.length === 0 && !loading && !currentAiMessage ? (
            <div className="flex flex-col items-center justify-center h-full text-center text-gray-500">
              <MessageCircle className="w-16 h-16 mb-4 opacity-50" />
              <h2 className="text-2xl font-semibold mb-2 text-gray-900">Burke AI</h2>
              <p className="text-lg text-gray-600">Ask me anything</p>
            </div>
          ) : (
            <div className="space-y-6">
              {messages.map((message) => (
                <div key={message.id} className={`flex ${message.type === "user" ? "justify-end" : "justify-start"}`}>
                  <div className={`max-w-4xl w-full flex ${message.type === "user" ? "flex-row-reverse space-x-reverse space-x-4" : "space-x-4"}`}>
                    <div className={`w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 ${message.type === "user" ? "bg-blue-500 text-white" : "bg-gray-300 text-gray-600"}`}>
                      {message.type === "user" ? <User size={14} /> : <Bot size={14} />}
                    </div>
                    <div className={`px-4 py-2 rounded-lg ${message.type === "user" ? "bg-blue-500 text-white max-w-[80%]" : "bg-white text-gray-900 shadow-sm border border-gray-200 max-w-[80%]"}`}>
                      {message.type === "ai" ? (
                        <ReactMarkdown 
                          remarkPlugins={[remarkGfm]}
                          className="prose prose-sm max-w-none prose-invert prose-headings:text-gray-900 prose-a:text-blue-500"
                        >
                          {message.content}
                        </ReactMarkdown>
                      ) : (
                        <p className="whitespace-pre-wrap">{message.content}</p>
                      )}
                    </div>
                  </div>
                </div>
              ))}
              {(loading || currentAiMessage) && (
                <div className="flex justify-start">
                  <div className="max-w-4xl w-full flex space-x-4">
                    <div className="w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 bg-gray-300 text-gray-600">
                      <Bot size={14} />
                    </div>
                    <div className="bg-white text-gray-900 px-4 py-2 rounded-lg shadow-sm border border-gray-200 max-w-[80%]">
                      {loading && !currentAiMessage ? (
                        <div className="flex space-x-1">
                          <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{animationDelay: '0s'}}></div>
                          <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{animationDelay: '0.1s'}}></div>
                          <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{animationDelay: '0.2s'}}></div>
                        </div>
                      ) : (
                        <ReactMarkdown 
                          remarkPlugins={[remarkGfm]}
                          className="prose prose-sm max-w-none prose-headings:text-gray-900 prose-a:text-blue-500"
                        >
                          {currentAiMessage}
                        </ReactMarkdown>
                      )}
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        <div className="border-t border-gray-200 bg-white p-4">
          <form onSubmit={generateResponse} className="flex items-end space-x-3">
            <textarea
              ref={textareaRef}
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
              disabled={loading}
              className="flex-1 min-h-[44px] max-h-[120px] resize-none rounded-full border border-gray-300 px-4 py-3 text-base placeholder-gray-500 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20 disabled:bg-gray-100 disabled:cursor-not-allowed transition-colors"
              placeholder={loading ? "Burke is thinking..." : "Message Burke..."}
              onKeyDown={(e) => {
                if (e.key === "Enter" && !e.shiftKey && !loading) {
                  e.preventDefault()
                  generateResponse(e)
                }
              }}
            />
            <button
              type="submit"
              disabled={!prompt.trim() || loading}
              className="p-3 rounded-full bg-blue-500 text-white disabled:bg-gray-200 disabled:cursor-not-allowed hover:bg-blue-600 transition-colors disabled:opacity-50"
            >
              <Send size={18} />
            </button>
          </form>
          {messages.length > 0 && (
            <button
              onClick={resetChat}
              className="mt-3 text-sm text-blue-500 hover:text-blue-600 flex items-center gap-1 transition-colors"
            >
              <RefreshCw size={14} className="rotate-180" />
              New conversation
            </button>
          )}
        </div>
      </div>
    </div>
  )
}