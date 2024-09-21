'use client';

import Footer from '@/components/Footer';
import Header from '@/components/Header';
import LoadingDots from '@/components/LoadingDots';
import Head from 'next/head';
import { useRef, useState } from 'react';
import { Toaster } from 'react-hot-toast';
import ReactMarkdown from 'react-markdown';

type Props = {};
type Response = {
  body: ReadableStream<Uint8Array> | null;
};

const Home = (props: Props) => {
  const [loading, setLoading] = useState(false);
  const [prompt, setPrompt] = useState('');
  const [llmResponse, setLlmResponse] = useState<string>('Hi your chat will appear here');
  const answerRef = useRef<null | HTMLButtonElement>(null);

  const scrollToEnd = () => {
    if (answerRef.current !== null) {
      answerRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  };

  const resetAndScroll = () => {
    setPrompt('');
    setLlmResponse('');
    window.scrollTo(0, 0);
  };

  const streamResponse = async (response: Response) => {
    const reader = response.body?.getReader();
    if (!reader) return;
    while (true) {
      const { done, value } = await reader.read();
      if (done) {
        break;
      }
      const text = new TextDecoder('utf-8').decode(value);
      const lines = text.split('\n').filter(line => line).map(line => JSON.parse(line.trim()));
      for (const line of lines) {
        const { choices } = line;
        const { delta } = choices[0];
        const { content } = delta;
        if (content) {
          setLlmResponse((prev) => prev + content);
          scrollToEnd();
        }
      }
    }
  };

  const generateResponse = async (e: any) => {
    e.preventDefault();
    setLlmResponse('');
    setLoading(true);

    try {
      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ prompt }),
      });

      if (!response.ok) {
        throw new Error(response.statusText);
      }

      streamResponse(response);

    } catch (error) {
      console.error('Error fetching response:', error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex max-w-7xl mx-auto flex-col items-center justify-center py-2 min-h-screen">
      <Head>
        <title>Stapey Chat</title>
        <link rel="icon" href="/favicon.ico" />
      </Head>

      <Header />
      <main className="flex flex-1 w-full flex-col items-center justify-center text-center px-4 mt-12 sm:mt-20 max-w-2xl">
        <h1 className="sm:text-6xl text-4xl max-w-[708px] font-bold text-slate-900">
          Ask anything.
        </h1>
        <p className="text-slate-500 font-medium my-4">
          Powered by open source LLMs and Pinecone
        </p>
        <form className="w-full">
          <textarea
            value={prompt}
            onChange={(e) => setPrompt(e.target.value)}
            rows={4}
            className="w-full rounded-md border-gray-300 shadow-sm focus:border-black focus:ring-black my-5"
            placeholder={
              'e.g. Tell me about some cool family friendly activities.'
            }
            onKeyDown={(e) => {
              if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                generateResponse(e);
              }
            }}
          />
          {!loading && (
            <button
              className="bg-black rounded-xl text-white font-medium px-4 py-2 sm:mt-3 mt-5 hover:bg-black/80 w-full"
              onClick={(e) => generateResponse(e)}
            >
              Get your answer &rarr;
            </button>
          )}
          {loading && (
            <button
              className="bg-black rounded-xl text-white font-medium px-4 py-2 sm:mt-3 mt-5 hover:bg-black/80 w-full"
              disabled
            >
              <LoadingDots color="white" style="large" />
            </button>
          )}
        </form>
        <Toaster
          position="top-center"
          reverseOrder={false}
          toastOptions={{ duration: 2000 }}
        />
        <hr className="h-px bg-gray-700 border-1 dark:bg-gray-700" />
        <div className="space-y-10 my-10 max-w-7xl">
          {llmResponse && (
            <>
              <div className="text-left">
                <ReactMarkdown className="prose">{llmResponse}</ReactMarkdown>
              </div>
              <button
                className="bg-black rounded-xl text-white font-medium px-4 py-2 sm:mt-3 mt-5 hover:bg-black/80 w-full"
                onClick={resetAndScroll}
                ref={answerRef}
              >
                Ask another question
              </button>
            </>
          )}
        </div>
      </main>
      <Footer />
    </div>
  );
};

export default Home;
