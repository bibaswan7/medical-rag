"use client"

import Footer from "@/components/Footer"
import Header from "@/components/Header"
import LoadingDots from "@/components/LoadingDots"
import { useRef, useState } from "react"
import { Toaster } from "react-hot-toast"
import ReactMarkdown from "react-markdown"
import { Send, RefreshCw } from "lucide-react"

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
        // When streaming is done, add the complete AI message to the chat history
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
          // Auto scroll to the bottom of the chat
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

    // Add user message to chat history
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

      // Clear input after sending
      setPrompt("")

      await streamResponse(response)
    } catch (error) {
      console.error("Error fetching response:", error)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="flex flex-col min-h-screen bg-gradient-to-b from-gray-50 to-gray-100">
      <Header />

      <main className="flex-1 flex flex-col items-center px-4 py-8 max-w-5xl mx-auto w-full">
        <div className="text-center mb-8">
          <h1 className="text-5xl font-bold text-gray-900 mb-3 tracking-tight">Ask anything.</h1>
          <p className="text-gray-600 text-lg">
            Powered by <span className="font-semibold">open source LLMs</span> and{" "}
            <span className="font-semibold">Pinecone</span>
          </p>
        </div>

        <div className="w-full max-w-4xl bg-white rounded-2xl shadow-lg overflow-hidden border border-gray-200 flex flex-col h-[80vh]">
          {/* Chat messages container */}
          <div ref={chatContainerRef} className="h-[70vh] overflow-y-auto p-6 bg-gray-50">
            {messages.length === 0 && !loading && !currentAiMessage ? (
              <div className="flex flex-col items-center justify-center h-full text-center text-gray-500">
                <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mb-4">
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    width="24"
                    height="24"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    className="text-gray-400"
                  >
                    <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"></path>
                  </svg>
                </div>
                <p className="text-lg font-medium">Start a conversation</p>
                <p className="text-sm mt-1">Ask a question to get started</p>
              </div>
            ) : (
              <div className="space-y-6">
                {messages.map((message) => (
                  <div key={message.id} className={`flex ${message.type === "user" ? "justify-end" : "justify-start"}`}>
                    <div
                      className={`px-4 py-3 rounded-2xl ${
                        message.type === "user"
                          ? "bg-blue-600 text-white rounded-tr-none"
                          : "bg-gray-200 text-gray-800 rounded-tl-none"
                      } max-w-[80%]`}
                    >
                      {message.type === "ai" ? (
                        <div className="prose prose-sm max-w-none">
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
                    <div className="bg-gray-200 text-gray-800 px-4 py-3 rounded-2xl rounded-tl-none max-w-[80%]">
                      {loading && !currentAiMessage ? (
                        <LoadingDots color="black" style="small" />
                      ) : (
                        <div className="prose prose-sm max-w-none">
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
          <div className="border-t border-gray-200 p-4">
            <form onSubmit={generateResponse} className="flex items-end gap-2">
              <div className="flex-1 relative">
                <textarea
                  value={prompt}
                  onChange={(e) => setPrompt(e.target.value)}
                  disabled={loading}
                  rows={1}
                  className={`w-full resize-none rounded-lg border ${
                    loading ? "bg-gray-100 text-gray-500" : "bg-white"
                  } border-gray-300 px-4 py-3 pr-12 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500`}
                  placeholder={loading ? "Waiting for response..." : "Type your message..."}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" && !e.shiftKey && !loading) {
                      e.preventDefault()
                      generateResponse(e)
                    }
                  }}
                  style={{ minHeight: "50px", maxHeight: "150px" }}
                />
              </div>

              {!loading ? (
                <button
                  type="submit"
                  disabled={!prompt.trim()}
                  className={`rounded-full p-3 ${
                    prompt.trim()
                      ? "bg-blue-600 text-white hover:bg-blue-700"
                      : "bg-gray-200 text-gray-400 cursor-not-allowed"
                  } transition-colors`}
                >
                  <Send size={18} />
                  <span className="sr-only">Send message</span>
                </button>
              ) : (
                <div className="rounded-full p-3 bg-gray-200">
                  <LoadingDots color="black" style="small" />
                </div>
              )}
            </form>
          </div>
        </div>

        {messages.length > 0 && (
          <button
            onClick={resetAndScroll}
            className="mt-6 flex items-center gap-2 text-gray-600 hover:text-gray-900 transition-colors"
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

