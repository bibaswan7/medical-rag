"use client"

import Footer from "@/components/Footer"
import Header from "@/components/Header"
import LoadingDots from "@/components/LoadingDots"
import { useRef, useState } from "react"
import { Toaster } from "react-hot-toast"
import ReactMarkdown from "react-markdown"
import { Send, RefreshCw, MessageCircle } from "lucide-react"

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
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-100">
      <Header />
      <main className="flex-1 flex flex-col items-center px-4 py-12 max-w-6xl mx-auto w-full">
        <div className="text-center mb-12">
          <h1 className="text-6xl font-black bg-gradient-to-r from-blue-600 to-indigo-600 bg-clip-text text-transparent mb-4 tracking-tight">
            Burke AI
          </h1>
          <p className="text-xl text-slate-600">
            Intelligent conversations powered by{" "}
            <span className="font-bold text-blue-600">Mistral</span> and{" "}
            <span className="font-bold text-indigo-600">Pinecone</span>
          </p>
        </div>

        <div className="w-full max-w-4xl bg-white/80 backdrop-blur-lg rounded-3xl shadow-2xl overflow-hidden border border-white/20 flex flex-col h-[75vh]">
          {/* Chat messages container */}
          <div ref={chatContainerRef} className="h-[65vh] overflow-y-auto p-8 space-y-6 bg-gradient-to-b from-white/50 to-slate-50/50">
            {messages.length === 0 && !loading && !currentAiMessage ? (
              <div className="flex flex-col items-center justify-center h-full text-center text-slate-500">
                <div className="w-20 h-20 bg-gradient-to-r from-blue-100 to-indigo-100 rounded-2xl flex items-center justify-center mb-6 p-4">
                  <MessageCircle className="w-10 h-10 text-blue-500" />
                </div>
                <p className="text-2xl font-semibold mb-2">Welcome to Burke AI</p>
                <p className="text-lg">Ask anything to start chatting</p>
              </div>
            ) : (
              <div className="space-y-6">
                {messages.map((message) => (
                  <div key={message.id} className={`flex ${message.type === "user" ? "justify-end" : "justify-start"}`}>
                    <div
                      className={`max-w-[75%] px-6 py-4 rounded-2xl shadow-lg transition-all duration-200 ${
                        message.type === "user"
                          ? "bg-gradient-to-r from-blue-500 to-indigo-600 text-white rounded-br-md"
                          : "bg-white/80 backdrop-blur-sm text-slate-800 rounded-bl-md border border-slate-200/50"
                      }`}
                    >
                      {message.type === "ai" ? (
                        <div className="prose prose-slate max-w-none">
                          <ReactMarkdown>{message.content}</ReactMarkdown>
                        </div>
                      ) : (
                        message.content
                      )}
                    </div>
                  </div>
                ))}

                {/* Show current AI response being streamed */}
                {(loading || currentAiMessage) && (
                  <div className="flex justify-start">
                    <div className="bg-white/80 backdrop-blur-sm text-slate-800 px-6 py-4 rounded-2xl rounded-bl-md border border-slate-200/50 max-w-[75%] shadow-lg">
                      {loading && !currentAiMessage ? (
                        <LoadingDots color="#3b82f6" style="small" />
                      ) : (
                        <div className="prose prose-slate max-w-none">
                          <ReactMarkdown>{currentAiMessage}</ReactMarkdown>
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Input area */}
          <div className="border-t border-slate-200/50 p-6 bg-white/50">
            <form onSubmit={generateResponse} className="flex items-end gap-3">
              <div className="flex-1 relative">
                <textarea
                  value={prompt}
                  onChange={(e) => setPrompt(e.target.value)}
                  disabled={loading}
                  rows={1}
                  className={`w-full resize-none rounded-2xl border-2 border-slate-200/50 focus:border-blue-500 transition-colors duration-200 px-5 py-4 text-base placeholder-slate-500 ${
                    loading ? "bg-slate-100 text-slate-500 cursor-not-allowed" : "bg-white/50"
                  } focus:outline-none focus:ring-2 focus:ring-blue-500/20`}
                  placeholder={loading ? "Thinking..." : "Type your message..."}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" && !e.shiftKey && !loading) {
                      e.preventDefault()
                      generateResponse(e)
                    }
                  }}
                  style={{ minHeight: "56px", maxHeight: "120px" }}
                />
              </div>

              {!loading ? (
                <button
                  type="submit"
                  disabled={!prompt.trim()}
                  className={`rounded-full p-4 transition-all duration-200 shadow-lg ${
                    prompt.trim()
                      ? "bg-gradient-to-r from-blue-500 to-indigo-600 text-white hover:shadow-xl hover:scale-105 active:scale-95"
                      : "bg-slate-200 text-slate-400 cursor-not-allowed"
                  }`}
                >
                  <Send size={20} />
                  <span className="sr-only">Send message</span>
                </button>
              ) : (
                <div className="rounded-full p-4 bg-slate-200">
                  <LoadingDots color="#3b82f6" style="small" />
                </div>
              )}
            </form>
          </div>
        </div>

        {messages.length > 0 && (
          <button
            onClick={resetAndScroll}
            className="mt-8 flex items-center gap-2 text-slate-600 hover:text-blue-600 transition-colors font-medium"
          >
            <RefreshCw size={18} className="rotate-45" />
            <span>New Conversation</span>
          </button>
        )}
      </main>

      <Toaster position="top-center" reverseOrder={false} toastOptions={{ duration: 2000 }} />

      <Footer />
    </div>
  )
}
