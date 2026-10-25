import { GoogleGenAI } from "@google/genai";
import { NextRequest, NextResponse } from "next/server";
import { INITIAL_BLOG_POSTS, AUTHORS } from "@/lib/blog-data";

export async function POST(req: NextRequest) {
  try {
    const { query } = await req.json();

    if (!query || typeof query !== "string") {
      return NextResponse.json(
        { error: "Query is required" },
        { status: 400 }
      );
    }

    // Context from blog corpus
    const corpusSummary = INITIAL_BLOG_POSTS.map((post) => {
      const artifactInfo = post.reviewedArtifact
        ? `Reviewed Artifact: [${post.reviewedArtifact.type.toUpperCase()}] ${post.reviewedArtifact.title} (${post.reviewedArtifact.identifier}) - ${post.reviewedArtifact.meta}`
        : "Format: Original Essay / Field Notes";

      return `[ARTICLE ID: ${post.id}] "${post.title}"
By: ${post.author.name} (${post.author.role})
Category: ${post.category} | Format: ${post.format} | Published: ${post.publishedAt}
${artifactInfo}
Summary: ${post.summary}
Key Takeaways:
${post.keyTakeaways.map((t) => `- ${t}`).join("\n")}
Main Excerpt:
${post.content.slice(0, 3).join("\n\n")}`;
    }).join("\n\n---\n\n");

    const systemPrompt = `You are the ResearchWithMe Editorial AI Synthesizer and Literary Assistant.
You have access to the full blog and review publication archive where domain experts write deep dives across:
- Research Article Reviews (DeepSeek reasoning, GLP-1 cardiovascular trials, CRISPR miniaturization)
- GitHub Repo Teardowns (vLLM & PagedAttention, Nomad vs K8s)
- STEM & High-Throughput Technology
- Health, Medicine & Longevity
- Sociology, Platform Governance & Remote Work Cultures
- Data Journalism & Open Science Economics

Here is the current published blog catalog:
${corpusSummary}

Instructions:
1. Ground your analysis strictly on the expert articles above.
2. Explicitly cite the article title, author name, and reviewed GitHub repo or published research paper where applicable.
3. Keep the tone intellectual, editorial, sharp, accessible, and balanced. Avoid AI clichés.
4. Structure your response with clear subheadings and bullet points.`;

    const apiKey = process.env.GEMINI_API_KEY;

    if (!apiKey) {
      // Fallback response matching blog content
      const matchingPosts = INITIAL_BLOG_POSTS.filter((p) =>
        p.title.toLowerCase().includes(query.toLowerCase()) ||
        p.summary.toLowerCase().includes(query.toLowerCase()) ||
        p.category.toLowerCase().includes(query.toLowerCase()) ||
        p.tags.some((t) => t.toLowerCase().includes(query.toLowerCase())) ||
        (p.reviewedArtifact && p.reviewedArtifact.identifier.toLowerCase().includes(query.toLowerCase()))
      );

      const answer = matchingPosts.length > 0
        ? `### Editorial Synthesis for: "${query}"\n\n` +
          `Based on the articles published on ResearchWithMe, **${matchingPosts.length} article(s)** directly address this topic:\n\n` +
          matchingPosts.map((p) => 
            `#### [${p.title}](https://researchwith.me/post/${p.slug})\n` +
            `*Written by:* **${p.author.name}** (${p.author.role}) · *Category:* ${p.category}\n` +
            (p.reviewedArtifact ? `*Reviewed Artifact:* \`${p.reviewedArtifact.identifier}\` (${p.reviewedArtifact.meta})\n\n` : '\n') +
            `**Core Insights:**\n` +
            p.keyTakeaways.map(t => `- ${t}`).join("\n") + "\n\n" +
            `**Author's Argument:** ${p.summary}`
          ).join("\n\n---\n\n")
        : `### Editorial Synthesis across the Catalog\n\n` +
          `Across our domain-expert articles, our authors regularly investigate the friction points between technological promises and empirical realities:\n\n` +
          `- **GitHub Repo Reviews:** Maya Lin breaks down why virtual memory paging algorithms in **vLLM** (\`vllm-project/vllm\`) solved GPU KV-cache fragmentation for high-throughput model serving.\n` +
          `- **Research Reviews:** Prof. Marcus Vance deconstructs **DeepSeek-R1**'s emergent reasoning without human SFT demonstrations, while Dr. Sarah Chen evaluates the cardiovascular and neuroprotective clinical trial readouts for **GLP-1 receptor agonists**.\n` +
          `- **Sociology & Labor:** Julian Ross critiques the 24/7 Slack distraction masquerading as "async-first" remote work and explores decentralized social graph architecture in the **AT Protocol**.\n\n` +
          `Select any article above to read the full breakdown!`;

      return NextResponse.json({
        answer,
        citations: matchingPosts.map((p) => ({
          id: p.id,
          title: p.title,
          author: p.author.name,
          category: p.category,
        })),
      });
    }

    const ai = new GoogleGenAI({ apiKey });
    let answer = "";
    try {
      const response = await ai.models.generateContent({
        model: "gemini-3.8-flash",
        contents: [
          {
            role: "user",
            parts: [
              { text: `${systemPrompt}\n\nReader Inquiry:\n"${query}"` },
            ],
          },
        ],
      });
      answer = response.text || "";
    } catch (apiErr) {
      console.warn("Gemini API call fallback:", apiErr);
      const matchingPosts = INITIAL_BLOG_POSTS.filter((p) =>
        p.title.toLowerCase().includes(query.toLowerCase()) ||
        p.summary.toLowerCase().includes(query.toLowerCase()) ||
        p.category.toLowerCase().includes(query.toLowerCase()) ||
        p.tags.some((t) => t.toLowerCase().includes(query.toLowerCase()))
      );

      answer = matchingPosts.length > 0
        ? `### Editorial Synthesis for: "${query}"\n\n` +
          `Here are the relevant deep dives from our authors:\n\n` +
          matchingPosts.map((p) => 
            `#### [${p.title}](https://researchwith.me/post/${p.slug})\n` +
            `*By:* **${p.author.name}** · ${p.category}\n\n` +
            `**Key Takeaways:**\n` +
            p.keyTakeaways.map(t => `- ${t}`).join("\n")
          ).join("\n\n---\n\n")
        : `Our blog features in-depth reviews of published papers, GitHub repositories, and systemic essays across STEM, health, sociology, and open technology. Feel free to browse by category or search specific topics.`;
    }

    return NextResponse.json({
      answer,
      citations: INITIAL_BLOG_POSTS.slice(0, 3).map((p) => ({
        id: p.id,
        title: p.title,
        author: p.author.name,
        category: p.category,
      })),
    });
  } catch (error: unknown) {
    console.error("API error:", error);
    const errorMessage = error instanceof Error ? error.message : "Internal error occurred";
    return NextResponse.json(
      { error: errorMessage },
      { status: 500 }
    );
  }
}
