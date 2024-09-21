import { getEmbedModel } from "@/utils";
import { Pinecone } from "@pinecone-database/pinecone";
import { NextResponse } from "next/server";
import ollama from "ollama";

export const runtime = "edge"

// Initialize Pinecone client once
const client = new Pinecone({
    apiKey: process.env.PINECONE_API_KEY as string,
});
const index = client.index("stacey-burke").namespace("nobu");

export async function POST(request: Request) {
    try {
        // Extract embedding model and request body concurrently
        const [embedModel, { prompt }] = await Promise.all([
            getEmbedModel(),
            request.json(),
        ]);

        // Generate embeddings for the user's query
        const queryEmbedding = await embedModel(prompt, { pooling: "cls" });

        // Query Pinecone for relevant data
        const pineconeResults = await index.query({
            vector: queryEmbedding.tolist(),
            topK: 12,
            includeMetadata: true,
        });

        // Concatenate the relevant metadata from Pinecone results
        const context = pineconeResults.matches
            .map((match) => match?.metadata?.chunk)
            .join(" ");

        // Update the prompt to emphasize the model must stick to the context strictly
        const ollamaResponse = await ollama.chat({
            model: "mistral:latest",
            messages: [
                {
                    role: "user",
                    content: `Use the following pieces of context to answer the question at the end.
                    If you don't know the answer, just say you don't know. DO NOT try to make up an answer.
                    If the question is not related to the context, politely respond that you are tuned to only answer questions that are related to the context.

                    <context>
                    ${context}
                    </context>

                    Please return your answer in markdown with clear headings and lists.
                    Question: ${prompt}`,
                },
            ],
        });

        // Properly returning a JSON response
        return NextResponse.json({ msg: ollamaResponse.message.content });
    } catch (error) {
        console.error("Error during POST request:", error);
        return new Response("Error processing the request", { status: 500 });
    }
}

