import { NextRequest, NextResponse } from "next/server";
import { Client } from "@gradio/client";

export async function GET() {
  const spaceName = process.env.HF_SPACE_NAME || "";
  const hasToken = Boolean(process.env.HF_TOKEN);

  return NextResponse.json({
    configured: Boolean(spaceName),
    spaceName: spaceName ? spaceName.trim() : null,
    hasToken,
  });
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const {
      prompt,
      negative_prompt = "",
      width = 1024,
      height = 576, // 16:9 standard for article covers
      steps = 25,
      quality = 80,
      guidance_scale = 3.5,
      seed = 0,
      randomize_seed = true,
      customSpaceName,
      customToken,
    } = body;

    if (!prompt || typeof prompt !== "string" || !prompt.trim()) {
      return NextResponse.json({ error: "Describe the cover before generating." }, { status: 400 });
    }

    const hfToken = (customToken && typeof customToken === "string" && customToken.trim()) 
      ? customToken.trim() 
      : (process.env.HF_TOKEN ? process.env.HF_TOKEN.trim() : undefined);

    const spaceName = (customSpaceName && typeof customSpaceName === "string" && customSpaceName.trim())
      ? customSpaceName.trim()
      : (process.env.HF_SPACE_NAME ? process.env.HF_SPACE_NAME.trim() : "");

    if (!spaceName) {
      return NextResponse.json(
        {
          error: "No Space name yet. Set HF_SPACE_NAME, or enter the Space name as username/space below.",
          needsConfig: true,
        },
        { status: 400 }
      );
    }

    const client = await Client.connect(spaceName, {
      hf_token: hfToken ? (hfToken as `hf_${string}`) : undefined,
    });

    const result = await client.predict("/generate_avif", {
      prompt: prompt.trim(),
      negative_prompt: typeof negative_prompt === "string" ? negative_prompt : "",
      seed: Number(seed) || 0,
      randomize_seed: Boolean(randomize_seed),
      width: Number(width) || 1024,
      height: Number(height) || 576,
      guidance_scale: Number(guidance_scale) || 3.5,
      num_inference_steps: Number(steps) || 25,
      quality: Number(quality) || 80,
    });

    // Result array contains: [file_path, base64_data_uri, seed]
    const dataArray = Array.isArray(result?.data) ? result.data : [];
    const avifDataUri =
      (typeof dataArray[1] === "string" && dataArray[1].startsWith("data:") ? (dataArray[1] as string) : null) ||
      (typeof dataArray[0] === "string" && dataArray[0].startsWith("data:") ? (dataArray[0] as string) : null);
    const usedSeed = (typeof dataArray[2] === "number" ? dataArray[2] : null) ?? 
      (typeof dataArray[1] === "number" ? dataArray[1] : 0);

    if (!avifDataUri) {
      // If Space returned a file reference instead of data URI
      if (
        typeof dataArray[0] === "string" ||
        (dataArray[0] && typeof dataArray[0] === "object" && "url" in dataArray[0] && typeof (dataArray[0] as { url: unknown }).url === "string")
      ) {
        const urlOrPath = typeof dataArray[0] === "string" 
          ? dataArray[0] 
          : String((dataArray[0] as { url: string }).url);
        return NextResponse.json({
          success: true,
          imageUri: urlOrPath,
          seed: usedSeed,
          format: "avif",
          space: spaceName,
        });
      }
      throw new Error("The Space returned no image. Check that it is running, then try again.");
    }

    return NextResponse.json({
      success: true,
      imageUri: avifDataUri,
      seed: usedSeed,
      format: "avif",
      space: spaceName,
    });
  } catch (error: unknown) {
    console.error("HF Space Generation Error:", error);
    const message = error instanceof Error ? error.message : "The cover was not generated. Try again.";
    return NextResponse.json(
      { error: message },
      { status: 500 }
    );
  }
}
