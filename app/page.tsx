"use client"

import Footer from "@/components/Footer"
import Header from "@/components/Header"
import LoadingDots from "@/components/LoadingDots"
import { useRef, useState } from "react"
import { Toaster } from "react-hot-toast"
import ReactMarkdown from "react-markdown"
import { Send, Bot, User, RefreshCw, X } from "lucide-react"

type Props = {}
type Response = {
  body: ReadableStream<Uint8Array> | null
}

type Message = {
  id: string
  type: "user" | "ai"
  content: string
}

export default function Home(props: Props) {
  const [loading, setLoading] = useState(false)
  const [prompt, setPrompt] = useState("")
  const [messages, setMessages] = useState<Message[]>([])
  const [currentAiMessage, setCurrentAiMessage] = useState("")
  const answerRef = useRef<null | HTMLDivElement>(null)
  const chatContainerRef = useRef<null | HTMLDivElement>(null)

  const resetAndScroll = () => {
    setPrompt("")
    setMessages([])
    setCurrentAiMessage("")
    window.scrollTo(0, 0)
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
          {
            id: Date.now().toString(),
            type: "ai",
            content: fullResponse,
          },
        ])
        setCurrentAiMessage("")
        break
      }
      const text = new TextDecoder("utf-8").decode(value)
      const lines = text
        .split("\n")
        .filter((line) => line)
        .map((line) => JSON.parse(line.trim()))
      for (const line of lines) {
        const { choices } = line
        const { delta } = choices[0]
        const { content } = delta
        if (content) {
          fullResponse += content
          setCurrentAiMessage(fullResponse)
          if (chatContainerRef.current) {
            chatContainerRef.current.scrollTop = chatContainerRef.current.scrollHeight
          }
        }
      }
    }
  }

  const generateResponse = async (e: any) => {
    e.preventDefault()
    if (!prompt.trim() || loading) return

    setMessages((prev) => [
      ...prev,
      {
        id: Date.now().toString(),
        type: "user",
        content: prompt.trim(),
      },
    ])

    setLoading(true)

    try {
      const response = await fetch("/api/chat", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ prompt }),
      })

      if (!response.ok) {
        throw new Error(response.statusText)
      }

      setPrompt("")

      await streamResponse(response)
    } catch (error) {
      console.error("Error fetching response:", error)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="flex flex-col min-h-screen bg-background">
      <Header />

      <main className="flex-1 flex flex-col items-center py-8 max-w-5xl mx-auto w-full">
        <div className="w-full max-w-4xl bg-card rounded-2xl shadow-lg overflow-hidden border flex flex-col h-[85vh]">
          <div ref={chatContainerRef} className="flex-1 overflow-y-auto p-6 space-y-6">
            {messages.length === 0 && !loading && !currentAiMessage ? (
              <div className="flex flex-col items-center justify-center h-full text-center text-muted-foreground">
                <Bot size={48} className="mb-4" />
                <h2 className="text-2xl font-semibold">Burke Trading Chat</h2>
                <p className="text-sm mt-2">Ask me anything about Burke Trading!</p>
              </div>
            ) : (
              messages.map((message) => (
                <div key={message.id} className={`flex items-start gap-4 ${message.type === "user" ? "justify-end" : ""}`}>
                  {message.type === "ai" && <div className="w-8 h-8 rounded-full bg-primary flex items-center justify-center text-primary-foreground"><Bot size={20} /></div>}
                  <div
                    className={`px-4 py-3 rounded-2xl max-w-[80%] whitespace-pre-wrap ${
                      message.type === "user"
                        ? "bg-primary text-primary-foreground rounded-br-none"
                        : "bg-muted text-muted-foreground rounded-bl-none"
                    }`}
                  >
                    <ReactMarkdown>{message.content}</ReactMarkdown>
                  </div>
                  {message.type === "user" && <div className="w-8 h-8 rounded-full bg-secondary flex items-center justify-center text-secondary-foreground"><User size={20} /></div>}
                </div>
              ))
            )}

            {(loading || currentAiMessage) && (
              <div className="flex items-start gap-4">
                <div className="w-8 h-8 rounded-full bg-primary flex items-center justify-center text-primary-foreground"><Bot size={20} /></div>
                <div className="bg-muted text-muted-foreground px-4 py-3 rounded-2xl rounded-bl-none max-w-[80%]">
                  {loading && !currentAiMessage ? (
                    <LoadingDots color="currentColor" style="small" />
                  ) : (
                    <ReactMarkdown>{currentAiMessage}</ReactMarkdown>
                  )}
                </div>
              </div>
            )}
          </div>

          <div className="border-t p-4 bg-background">
            <form onSubmit={generateResponse} className="flex items-center gap-2">
              <textarea
                value={prompt}
                onChange={(e) => setPrompt(e.target.value)}
                disabled={loading}
                rows={1}
                className="w-full resize-none rounded-lg border bg-input px-4 py-3 pr-12 text-sm focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary disabled:opacity-50"
                placeholder={loading ? "Waiting for response..." : "Type your message..."}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && !e.shiftKey && !loading) {
                    e.preventDefault()
                    generateResponse(e)
                  }
                }}
                style={{ minHeight: "50px", maxHeight: "150px" }}
              />

              <button
                type="submit"
                disabled={!prompt.trim() || loading}
                className="rounded-full p-3 bg-primary text-primary-foreground enabled:hover:bg-primary/90 disabled:opacity-50 transition-colors"
              >
                {loading ? <LoadingDots color="currentColor" style="small" /> : <Send size={18} />}
                <span className="sr-only">Send message</span>
              </button>
            </form>
          </div>
        </div>

        {messages.length > 0 && (
          <button
            onClick={resetAndScroll}
            className="mt-6 flex items-center gap-2 text-muted-foreground hover:text-foreground transition-colors"
          >
            <RefreshCw size={16} />
            <span>Start a new conversation</span>
          </button>
        )}
      </main>

      <Toaster position="top-center" reverseOrder={false} toastOptions={{ duration: 2000 }} />

      <Footer />
    </div>
  )
}