
import { GoogleGenerativeAI } from "@google/generative-ai";

// Initialize Gemini API
// Use environment variable for API key to prevent exposure
const API_KEY = import.meta.env.VITE_GEMINI_API_KEY;
const genAI = new GoogleGenerativeAI(API_KEY);

export const extractKeywords = async (text: string): Promise<string[]> => {
    if (!text || text.length < 10) return [];

    try {
        const model = genAI.getGenerativeModel({ model: "gemini-2.0-flash-exp" });

        const prompt = `
      Analyze the following book review and extract exactly 5 core keywords that represent the themes, emotions, or topics.
      Return ONLY the keywords separated by commas, no other text.
      IMPORTANT: All keywords MUST be in Korean (Hangul).
      
      Review: "${text}"
    `;

        const result = await model.generateContent(prompt);
        const response = await result.response;
        const textData = response.text();

        // Clean and parse
        const keywords = textData.split(',')
            .map(k => k.trim())
            .filter(k => k.length > 0)
            .slice(0, 5);

        return keywords;
    } catch (error) {
        console.error("Gemini Keyword Extraction Error:", error);
        return [];
    }
};
// Reading Pattern Analysis
export async function analyzeReadingPatterns(userName: string, reviews: string[], age?: number) {
    if (!reviews || reviews.length === 0) return null;

    try {
        const genAI = new GoogleGenerativeAI(import.meta.env.VITE_GEMINI_API_KEY);
        // Use gemini-2.0-flash-exp which is verified working in this environment
        const model = genAI.getGenerativeModel({
            model: "gemini-2.0-flash-exp",
            generationConfig: {
                responseMimeType: "application/json",
            }
        });

        const combinedReviews = reviews.map((r, i) => `Review ${i + 1}: ${r}`).join('\n');

        const prompt = `
      You are an expert reading educational consultant and psychologist.
      Analyze the user's reading history based on their age and review content.
      
      User Information:
      - Name: ${userName}
      - Age: ${age ? `${age} years old` : 'Unknown'}
      
      Reviews:
      ${combinedReviews}

      Strictly analyze the provided reviews and provide a professional output in JSON format with the following keys:
      - "level": string [Detailed Description of writing level. Assess vocabulary, sentence structure, and depth of thought compared to the typical ${age ? `${age}-year-old` : 'reading level'}.]
      - "interest": string [Detailed Description of primary interests, themes, and emotional resonance found in the reading history.]
      - "recommendations": array of objects [{ "title": string, "author": string, "reason": string }] [Exactly 5 targeted book recommendations that are appropriate for a ${age ? `${age}-year-old` : 'reader'} and match their interests, with specific pedagogical/psychological reasons for each.]
      
      Requirements:
      - Response MUST be in Korean.
      - Tone: Professional, warm, and encouraging.
      - Use age-appropriate benchmarks if age is provided.
      - If reviews are limited, provide a best-effort analysis based on the available text.
      - Output MUST be a single JSON object with the keys "level", "interest", and "recommendations".
    `;

        const result = await model.generateContent(prompt);
        const response = await result.response;//test
        const text = response.text();

        try {
            const parsed = JSON.parse(text);
            // Ensure all keys exist and are not empty
            return {
                level: parsed.level || `${userName}님의 독서 습관을 분석하여 곧 결과를 알려드릴게요.`,
                interest: parsed.interest || "아직 충분한 독서 감상문이 쌓이지 않았습니다.",
                recommendations: Array.isArray(parsed.recommendations) ? parsed.recommendations : [
                    { title: "추천 도서 준비 중", author: "-", reason: "더 많은 감상문을 적으면 정확한 추천이 시작됩니다!" }
                ]
            };
        } catch (parseError) {
            console.error("JSON Parse Error:", parseError, "Raw Text:", text);
            return null;
        }
    } catch (error) {
        console.error("Gemini AI Error:", error);
        return null;
    }
}
