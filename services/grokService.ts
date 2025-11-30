import { generateText as grokGenerateText } from "@rork-ai/toolkit-sdk";

export async function generateText(prompt: string): Promise<string> {
  try {
    return await grokGenerateText({
      messages: [{ role: "user", content: prompt }],
    });
  } catch (error) {
    console.error("Grok API error:", error);
    throw error;
  }
}

export async function generateJSON(prompt: string): Promise<any> {
  try {
    const response = await grokGenerateText({
      messages: [
        { role: "user", content: prompt },
        { role: "assistant", content: "I'll respond with valid JSON only." }
      ],
    });
    
    const jsonMatch = response.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      return JSON.parse(jsonMatch[0]);
    }
    return {};
  } catch (error) {
    console.error("Grok API error:", error);
    throw error;
  }
}