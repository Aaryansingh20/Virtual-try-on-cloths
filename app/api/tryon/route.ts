import { NextRequest, NextResponse } from "next/server";
import { GoogleGenAI } from "@google/genai";

// Helper function to convert ArrayBuffer to Base64
function arrayBufferToBase64(buffer: ArrayBuffer): string {
  let binary = "";
  const bytes = new Uint8Array(buffer);
  const len = bytes.byteLength;
  for (let i = 0; i < len; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary);
}

// Initialize the Google Gen AI client with your API key
const GEMINI_API_KEY = process.env.GEMINI_API_KEY || "";
if (!GEMINI_API_KEY) {
  console.error("Missing GEMINI_API_KEY environment variable.");
}
const ai = new GoogleGenAI({ apiKey: GEMINI_API_KEY });

// Define the model ID for Gemini 2.0 Flash experimental
const MODEL_ID = "gemini-2.0-flash-exp-image-generation";

export async function POST(req: NextRequest) {
  let formData;
  try {
    formData = await req.formData();
  } catch (formError) {
    console.error("Error parsing FormData request body:", formError);
    return NextResponse.json(
      {
        error: "Invalid request body: Failed to parse FormData.",
        details: formError instanceof Error ? formError.message : String(formError),
      },
      { status: 400 }
    );
  }

  try {
    const userImageFile = formData.get("userImage") as File | null;
    const clothingImageFile = formData.get("clothingImage") as File | null;

    if (!userImageFile || !clothingImageFile) {
      return NextResponse.json(
        { error: "Both userImage and clothingImage files are required" },
        { status: 400 }
      );
    }

    // Improved and more focused prompt for better face preservation
    const improvedPrompt = `VIRTUAL TRY-ON TASK:

INPUT IMAGES:
1. PERSON IMAGE: Contains the target person whose identity must be PERFECTLY preserved
2. CLOTHING IMAGE: Contains the clothing item to be virtually worn

CRITICAL REQUIREMENTS (NON-NEGOTIABLE):

🔒 FACE IDENTITY LOCK (ABSOLUTE PRIORITY):
- The person's face, facial features, skin tone, and expression MUST remain 100% identical to the input person image
- DO NOT change, modify, or reinterpret ANY facial characteristics
- DO NOT blend or mix features from the clothing image model
- Preserve the exact eye color, nose shape, lip shape, jawline, and all unique facial features
- If the person has distinctive features (freckles, moles, scars), keep them exactly as they are

👤 BODY & POSE PRESERVATION:
- Keep the exact same body pose and positioning as the input person image
- Maintain the same body proportions and build
- Preserve hair style and color exactly as shown in the person image
- Keep any visible accessories (jewelry, watches, etc.) from the person image

👔 CLOTHING INTEGRATION:
- Extract ONLY the clothing item from the clothing image (ignore the model wearing it)
- Apply the exact colors, patterns, textures, and style of the clothing
- Ensure proper fitting and realistic draping on the person's body
- Handle occlusion naturally where clothing covers the person

🖼️ BACKGROUND HANDLING:
- Create a clean, neutral background (studio-like or simple environment)
- Ensure proper lighting that matches both the person and clothing naturally
- Remove the original backgrounds from both input images

OUTPUT SPECIFICATION:
Generate a single photorealistic image showing the EXACT same person from the input image wearing the clothing item, with perfect facial identity preservation and realistic clothing integration.

WHAT NOT TO DO:
❌ Do not alter the person's face in any way
❌ Do not use facial features from the clothing image model
❌ Do not change the person's hair, skin tone, or body structure
❌ Do not modify the clothing colors or patterns
❌ Do not create unrealistic proportions or poses`;

    // Convert Files to Base64
    const userImageBuffer = await userImageFile.arrayBuffer();
    const userImageBase64 = arrayBufferToBase64(userImageBuffer);
    const userImageMimeType = userImageFile.type || "image/jpeg";

    const clothingImageBuffer = await clothingImageFile.arrayBuffer();
    const clothingImageBase64 = arrayBufferToBase64(clothingImageBuffer);
    const clothingImageMimeType = clothingImageFile.type || "image/png";

    console.log(`User Image: ${userImageMimeType}, size: ${userImageBase64.length}`);
    console.log(`Clothing Image: ${clothingImageMimeType}, size: ${clothingImageBase64.length}`);

    let response;

    try {
      // Prepare Contents for Gemini API with clearer structure
      const contents = [
        {
          role: "user",
          parts: [
            { text: "PERSON IMAGE (preserve this person's identity exactly):" },
            {
              inlineData: {
                mimeType: userImageMimeType,
                data: userImageBase64,
              },
            },
            { text: "CLOTHING IMAGE (extract only the clothing item):" },
            {
              inlineData: {
                mimeType: clothingImageMimeType,
                data: clothingImageBase64,
              },
            },
            { text: improvedPrompt },
          ],
        },
      ];

      // Generate the content with optimized settings
      response = await ai.models.generateContent({
        model: MODEL_ID,
        contents: contents,
        config: {
          temperature: 0.1, // Very low temperature for more consistent results
          topP: 0.8, // Lower for more focused outputs
          topK: 20, // Lower for more deterministic results
          responseModalities: ["Text", "Image"],
        },
      });

      console.log("Full Gemini API Response:", JSON.stringify(response, null, 2));

    } catch (error) {
      console.error("Error in Gemini API call (generateContent):", error);
      if (error instanceof Error) {
        throw new Error(`Failed during API call: ${error.message}`);
      }
      throw new Error("An unknown error occurred during the API call");
    }

    let textResponse = null;
    let imageData = null;
    let imageMimeType = "image/png";

    // Process the response
    if (response.candidates && response.candidates.length > 0) {
      const parts = response.candidates[0]?.content?.parts;
      if (parts) {
        console.log("Number of parts in response:", parts.length);

        for (const part of parts) {
          if ("inlineData" in part && part.inlineData) {
            imageData = part.inlineData.data;
            imageMimeType = part.inlineData.mimeType || "image/png";
            if (imageData) {
              console.log("Image data received, length:", imageData.length, "MIME type:", imageMimeType);
            }
          } else if ("text" in part && part.text) {
            textResponse = part.text;
            console.log("Text response received:", textResponse.substring(0, 100) + (textResponse.length > 100 ? "..." : ""));
          }
        }
      } else {
        console.log("No parts found in the response candidate.");
      }
    } else {
      console.log("No candidates found in the API response.");
      const safetyFeedback = response?.promptFeedback?.blockReason;
      if (safetyFeedback) {
        console.error("Content generation blocked:", safetyFeedback);
        throw new Error(`Content generation failed due to safety settings: ${safetyFeedback}`);
      }
      const responseText = JSON.stringify(response, null, 2);
      console.error("Unexpected API response structure:", responseText);
      throw new Error("Received an unexpected or empty response from the API.");
    }

    return NextResponse.json({
      image: imageData ? `data:${imageMimeType};base64,${imageData}` : null,
      description: textResponse || "AI description not available.",
    });

  } catch (error) {
    console.error("Error processing virtual try-on request:", error);
    return NextResponse.json(
      {
        error: "Failed to process virtual try-on request",
        details: error instanceof Error ? error.message : String(error),
      },
      { status: 500 }
    );
  }
}