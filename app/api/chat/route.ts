import { queryPineconeVectorStore } from "@/utils";
import { MixedbreadAIClient } from "@mixedbread-ai/sdk";
import { Pinecone } from "@pinecone-database/pinecone";
import { NextResponse } from "next/server";
import Together from "together-ai";

export const runtime = "edge";

const together = new Together({
    apiKey: process.env.TOGETHER_API_KEY,
});

const client = new Pinecone({
    apiKey: process.env.PINECONE_API_KEY as string,
});

// const mxbai = new MixedbreadAIClient({
//     apiKey: process.env.MXBAI_API_KEY as string,
// });

const index = client.index("stacey-burke").namespace("nobu");

export async function POST(request: Request) {
    try {
        const [{ prompt }] = await Promise.all([request.json()]);

        // const embedding = await mxbai.embeddings({
        //     model: "mixedbread-ai/mxbai-embed-large-v1",
        //     input: [prompt],
        //     normalized: true,
        // });
        // console.log("Embedding: ", embedding);
        // const queryEmbedding = embedding.data[0].embedding as number[];

        // const pineconeResults = await index.query({
        //     vector: queryEmbedding,
        //     topK: 12,
        //     includeMetadata: true,
        // });

        // const context = pineconeResults.matches
        //     .map((match) => match?.metadata?.chunk)
        //     .join(" ");

        const retrievals = await queryPineconeVectorStore(client, 'stacey-burke', "nobu", prompt);

        const stream = await together.chat.completions.create({
            model: "mistralai/Mistral-7B-Instruct-v0.3",
            messages: [
                {
                    role: "system",
                    content: `Use the following pieces of context to answer the question at the end.
                    If you don't know the answer, just say you don't know. DO NOT try to make up an answer.
                    If the question is not related to the context, politely respond that you are tuned to only answer questions that are related to the context.

                    <context>
                    ${retrievals}
                    </context>

                    Please return your answer in markdown with clear headings and lists.`,
                },
                {
                    role: "user",
                    content: `
                    Question: ${prompt}`,
                },
            ],
            stream: true,
        });

        return new Response(stream.toReadableStream() as ReadableStream, {
            headers: new Headers({
                "Cache-Control": "no-cache",
            }),
        });
    } catch (error) {
        console.error("Error during POST request:", error);
        return new Response("Error processing the request", { status: 500 });
    }
}
