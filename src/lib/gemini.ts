
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
