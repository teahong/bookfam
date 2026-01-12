
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
export const analyzeReadingPatterns = async (userName: string, reviews: string[]): Promise<{ level: string, interest: string, recommendation: string } | null> => {
    if (!reviews || reviews.length === 0) return null;

    // Combine reviews for analysis (limit length to avoid token limits)
    const combinedReviews = reviews.slice(0, 10).join("\n\n");

    try {
        const model = genAI.getGenerativeModel({
            model: "gemini-2.0-flash-exp",
            generationConfig: { responseMimeType: "application/json" }
        });

        const prompt = `
      You are an expert reading educational consultant and psychologist analyzing a user's reading history.
      User Name: ${userName}
      Reviews:
      ${combinedReviews}

      Analyze the reviews deeply and provide a professional output in JSON format with the following keys:
      - "level": Analyze the user's writing level, considering vocabulary richness, sentence structure complexity, and logical flow. (e.g., "어휘력이 풍부하고 논리적인 14세 수준"). Format: "${userName}님의 글쓰기 수준은 [Detailed Description]입니다."
      - "interest": Identify the user's primary reading interests and any specific themes they focus on. Format: "현재 ${userName}님은 [Interest] 분야 도서에 관심이 많습니다."
      - "recommendation": Recommend a type of book the user should read next to broaden their horizon, specifically mentioning WHY based on their current habits (e.g., to improve critical thinking, to explore diverse cultures). Format: "현재 ${userName}님은 [Category]와 같은 책을 추가로 읽을 필요가 있습니다. 이유: [Reason]"
      
      Response MUST be in Korean and use a professional, encouraging tone.
    `;

        const result = await model.generateContent(prompt);
        const text = result.response.text();
        return JSON.parse(text);
    } catch (error) {
        console.error("Gemini Analysis Error:", error);
        return null;
    }
};
