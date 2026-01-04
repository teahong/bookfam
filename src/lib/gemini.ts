
import { GoogleGenerativeAI } from "@google/generative-ai";

// Initialize Gemini API
// ERROR: Ideally this should be in an Edge Function or env var, but for this local prototype we use it directly.
const API_KEY = "AIzaSyDX6ZQkli5hj5X8eoDyzMKIBsMOyDNzO3c";
const genAI = new GoogleGenerativeAI(API_KEY);

export const extractKeywords = async (text: string): Promise<string[]> => {
    if (!text || text.length < 10) return [];

    try {
        const model = genAI.getGenerativeModel({ model: "gemini-2.0-flash-exp" });

        const prompt = `
      Analyze the following book review and extract exactly 3 core keywords that represent the themes, emotions, or topics.
      Return ONLY the keywords separated by commas, no other text.
      
      Review: "${text}"
    `;

        const result = await model.generateContent(prompt);
        const response = await result.response;
        const textData = response.text();

        // Clean and parse
        const keywords = textData.split(',')
            .map(k => k.trim())
            .filter(k => k.length > 0)
            .slice(0, 3);

        return keywords;
    } catch (error) {
        console.error("Gemini Keyword Extraction Error:", error);
        return [];
    }
};
