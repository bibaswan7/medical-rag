"use client"

import LoadingDots from "@/components/LoadingDots"
import { useRef, useState, useEffect } from "react"
import ReactMarkdown from "react-markdown"
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
    if (chatContainerRef.current) {
      chatContainerRef.current.scrollTop = chatContainerRef.current.scrollHeight
    }
  }

  const resetChat = () => {
    setMessages([])
    setCurrentAiMessage("")
    setPrompt("")
    scrollToBottom()
  }

  const streamResponse = async (response: Response) => {
    const reader = response.body?.getReader()
    if (!reader) return

    setCurrentAiMessage("")
    let fullResponse = ""

    while (true) {
      const { done, value } = await reader.read()
      if (done) {
        setMessages(prev => [...prev, { id: Date.now().toString(), type: "ai", content: fullResponse }])
        setCurrentAiMessage("")
        scrollToBottom()
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
          scrollToBottom()
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
    <div className="flex flex-col h-screen bg-gray-50">
      <div ref={chatContainerRef} className="flex-1 overflow-y-auto p-4 space-y-6">
        {messages.length === 0 && !loading && !currentAiMessage ? (
          <div className="flex flex-col items-center justify-center h-full text-center text-gray-500">
            <MessageCircle className="w-16 h-16 mb-4 text-gray-400" />
            <h2 className="text-2xl font-semibold mb-2">Burke AI</h2>
            <p className="text-lg">How can I help you today?</p>
          </div>
        ) : (
          <div className="space-y-6">
            {messages.map((message) => (
              <div key={message.id} className={`flex ${message.type === "user" ? "justify-end" : "justify-start"}`}>
                <div className={`max-w-[80%] flex ${message.type === "user" ? "flex-row-reverse" : ""}`}>
                  <div className={`w-8 h-8 rounded-full flex items-center justify-center mr-3 ml-3 ${message.type === "user" ? "order-2 bg-blue-500 text-white" : "order-1 bg-gray-300 text-gray-600"}`}>
                    {message.type === "user" ? <User size={16} /> : <Bot size={16} />}
                  </div>
                  <div
                    className={`px-4 py-3 rounded-2xl ${message.type === "user" ? "bg-blue-500 text-white rounded-br-md" : "bg-white text-gray-800 rounded-bl-md shadow-sm border"}`}
                  >
                    {message.type === "ai" ? (
                      <ReactMarkdown className="prose prose-sm max-w-none prose-blue">{message.content}</ReactMarkdown>
                    ) : (
                      message.content
                    )}
                  </div>
                </div>
              </div>
            ))}
            {(loading || currentAiMessage) && (
              <div className="flex justify-start">
                <div className="max-w-[80%] flex">
                  <div className="w-8 h-8 rounded-full flex items-center justify-center mr-3 bg-gray-300 text-gray-600">
                    <Bot size={16} />
                  </div>
                  <div className="bg-white text-gray-800 px-4 py-3 rounded-2xl rounded-bl-md shadow-sm border">
                    {loading && !currentAiMessage ? (
                      <LoadingDots color="#6b7280" style="small" />
                    ) : (
                      <ReactMarkdown className="prose prose-sm max-w-none prose-gray">{currentAiMessage}</ReactMarkdown>
                    )}
                  </div>
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      <div className="border-t border-gray-200 p-4 bg-white">
        <form onSubmit={generateResponse} className="flex items-end gap-3">
          <textarea
            ref={textareaRef}
            value={prompt}
            onChange={(e) => setPrompt(e.target.value)}
            disabled={loading}
            className={`flex-1 resize-none rounded-2xl border border-gray-300 px-4 py-3 text-base focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20 disabled:bg-gray-100 disabled:cursor-not-allowed ${loading ? "bg-gray-100 text-gray-500" : ""}`}
            placeholder={loading ? "Thinking..." : "Type your message..."}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey && !loading) {
                e.preventDefault()
                generateResponse(e)
              }
            }}
          />
          {!loading ? (
            <button
              type="submit"
              disabled={!prompt.trim()}
              className={`p-3 rounded-full transition-colors ${prompt.trim() ? "bg-blue-500 text-white hover:bg-blue-600" : "bg-gray-200 text-gray-400 cursor-not-allowed"}`}
            >
              <Send size={20} />
            </button>
          ) : (
            <div className="p-3 bg-gray-200 rounded-full">
              <LoadingDots color="#6b7280" style="small" />
            </div>
          )}
        </form>
        {messages.length > 0 && (
          <button
            onClick={resetChat}
            className="mt-3 text-sm text-blue-500 hover:text-blue-600 flex items-center gap-1"
          >
            <RefreshCw size={16} />
            New chat
          </button>
        )}
      </div>
    </div>
  )
}