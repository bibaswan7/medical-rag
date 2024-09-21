import { updateVectorDB } from "@/utils";
import { Pinecone } from "@pinecone-database/pinecone";
import { DirectoryLoader } from "langchain/document_loaders/fs/directory";
import { PDFLoader } from "@langchain/community/document_loaders/fs/pdf";
import { TextLoader } from "langchain/document_loaders/fs/text";
import path from "path";

export async function POST(req: Request) {
    try {
        const { indexname, namespace } = await req.json(); 
        return await handleUpload(indexname, namespace);
    } catch (error) {
        return new Response(JSON.stringify({ error: "Invalid request" }), {
            status: 400,
        });
    }
}

async function handleUpload(indexname: string, namespace: string) {
    const documentsPath = path.join(process.cwd(), "documents");

    const loader = new DirectoryLoader(documentsPath, {
        ".pdf": (path: string) =>
            new PDFLoader(path, {
                splitPages: false,
            }),
        ".txt": (path: string) => new TextLoader(path),
    });
    let responseText = ""; // To hold streaming response text
    try {
        const docs = await loader.load();
        console.log("Loader called", docs);
        const client = new Pinecone({
            apiKey: process.env.PINECONE_API_KEY as string,
        });


        await updateVectorDB(
            client,
            indexname,
            namespace,
            docs,
            (filename, totalChunks, chunksUpserted, isComplete) => {
                const chunkStatus = JSON.stringify({
                    filename,
                    totalChunks,
                    chunksUpserted,
                    isComplete,
                });

                if (!isComplete) {
                    responseText += chunkStatus;
                }
            }
        );
    } catch (err) {
        console.log("Loader error", err);
    }

    return new Response(responseText, {
        status: 200,
        headers: { "Content-Type": "application/json" },
    });
}
