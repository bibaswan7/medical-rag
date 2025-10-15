"use client"

import Footer from "@/components/Footer"
import Header from "@/components/Header"
import LoadingDots from "@/components/LoadingDots"
import { useRef, useState, useEffect } from "react"
import { Toaster } from "react-hot-toast"
import ReactMarkdown from "react-markdown"
import { Send, Bot, User, CornerDownLeft, RefreshCw } from "lucide-react"

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

  const scrollToBottom = () => {
    if (chatContainerRef.current) {
      chatContainerRef.current.scrollTop = chatContainerRef.current.scrollHeight
    }
  }

  useEffect(() => {
    scrollToBottom()
  }, [messages, currentAiMessage])

  const resetChat = () => {
    setMessages([])
    setCurrentAiMessage("")
  }

  const streamResponse = async (response: Response) => {
    const reader = response.body?.getReader()
    if (!reader) return

    setCurrentAiMessage("")
    let fullResponse = ""

    while (true) {
      const { done, value } = await reader.read()
      if (done) {
        setMessages((prev) => [
          ...prev,
          { id: Date.now().toString(), type: "ai", content: fullResponse },
        ])
        setCurrentAiMessage("")
        break
      }
      const text = new TextDecoder("utf-8").decode(value)
      fullResponse += text
      setCurrentAiMessage(fullResponse)
    }
  }

  const generateResponse = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!prompt.trim() || loading) return

    const userMessage: Message = { id: Date.now().toString(), type: "user", content: prompt.trim() }
    setMessages((prev) => [...prev, userMessage])
    setPrompt("")
    setLoading(true)

    try {
      const response = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ prompt: userMessage.content }),
      })

      if (!response.ok) throw new Error(response.statusText)

      await streamResponse(response as any)
    } catch (error) {
      console.error("Error fetching response:", error)
      const errorMessage: Message = { id: "error", type: "ai", content: "Sorry, something went wrong. Please try again." }
      setMessages((prev) => [...prev, errorMessage])
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="flex flex-col h-screen bg-background text-foreground">
      <Header />

      <main className="flex-1 flex flex-col pt-20 pb-28">
        <div ref={chatContainerRef} className="flex-1 overflow-y-auto p-6 space-y-8">
          {messages.length === 0 && !loading && !currentAiMessage ? (
            <div className="flex flex-col items-center justify-center h-full text-center text-muted-foreground">
              <Bot size={48} className="mb-4" />
              <h2 className="text-2xl font-semibold">Burke Trading Chat</h2>
              <p className="text-sm mt-2">Start a conversation by typing below.</p>
            </div>
          ) : (
            <>
              {messages.map((message) => (
                <div key={message.id} className="flex items-start gap-4 animate-fade-in-up">
                  <div className={`flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center ${message.type === 'ai' ? 'bg-primary text-primary-foreground' : 'bg-secondary text-secondary-foreground'}`}>
                    {message.type === 'ai' ? <Bot size={20} /> : <User size={20} />}
                  </div>
                  <div className="flex-1">
                    <p className={`font-semibold ${message.type === 'ai' ? 'text-primary-foreground' : 'text-secondary-foreground'}`}>
                      {message.type === 'ai' ? 'AI' : 'You'}
                    </p>
                    <div className="prose prose-sm max-w-none text-foreground">
                      <ReactMarkdown>{message.content}</ReactMarkdown>
                    </div>
                  </div>
                </div>
              ))}

              {(loading || currentAiMessage) && (
                <div className="flex items-start gap-4 animate-fade-in-up">
                  <div className="flex-shrink-0 w-8 h-8 rounded-full bg-primary text-primary-foreground flex items-center justify-center">
                    <Bot size={20} />
                  </div>
                  <div className="flex-1">
                    <p className="font-semibold text-primary-foreground">AI</p>
                    {loading && !currentAiMessage ? (
                      <LoadingDots color="white" />
                    ) : (
                      <div className="prose prose-sm max-w-none text-foreground">
                        <ReactMarkdown>{currentAiMessage}</ReactMarkdown>
                      </div>
                    )}
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      </main>

      <div className="fixed bottom-0 left-0 w-full bg-background/50 backdrop-blur-sm">
        <div className="max-w-4xl mx-auto p-4">
          {messages.length > 0 && (
             <button
                onClick={resetChat}
                className="mb-2 flex items-center gap-2 text-xs text-muted-foreground hover:text-foreground transition-colors"
             >
                <RefreshCw size={14} />
                <span>New Chat</span>
             </button>
          )}
          <form onSubmit={generateResponse} className="relative">
            <textarea
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
              disabled={loading}
              rows={1}
              className="w-full resize-none rounded-lg border bg-secondary px-4 py-3 pr-20 text-base focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary disabled:opacity-60"
              placeholder="Ask anything..."
              onKeyDown={(e) => {
                if (e.key === "Enter" && !e.shiftKey && !loading) {
                  e.preventDefault();
                  generateResponse(e);
                }
              }}
              style={{ minHeight: "52px", maxHeight: "150px" }}
            />
            <button
              type="submit"
              disabled={!prompt.trim() || loading}
              className="absolute right-3 top-1/2 -translate-y-1/2 rounded-md p-2 bg-primary text-primary-foreground enabled:hover:bg-primary/90 disabled:opacity-50 transition-colors"
            >
              {loading ? <LoadingDots color="black" /> : <Send size={18} />}
              <span className="sr-only">Send</span>
            </button>
          </form>
        </div>
      </div>
      <Toaster theme="dark" position="top-center" />
    </div>
  )
}