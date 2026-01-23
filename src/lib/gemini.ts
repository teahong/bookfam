
import { GoogleGenerativeAI } from "@google/generative-ai";
import { searchAladinBooks, type AladinBook } from './aladin';

// Initialize Gemini API
const API_KEY = import.meta.env.VITE_GEMINI_API_KEY;

export const extractKeywords = async (text: string): Promise<string[]> => {
    if (!text || text.length < 10) return [];

    try {
        const genAI = new GoogleGenerativeAI(API_KEY);
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
        const genAI = new GoogleGenerativeAI(API_KEY);
        // Use gemini-2.0-flash-exp which is verified working in this environment
        const model = genAI.getGenerativeModel({
            model: "gemini-2.0-flash-exp",
            generationConfig: {
                responseMimeType: "application/json",
            }
        });

        const combinedReviews = reviews.map((r, i) => `Review ${i + 1}: ${r}`).join('\n');

        // --- Step 0: Determine Age Context ---
        const ageConfig = getAgeConfig(age);

        // --- Step A: Learning Profile Analysis & Keyword Extraction ---
        const analysisPrompt = `
      You are ${ageConfig.persona} who provides warm and detailed feedback.
      Analyze the following reading log to summarize the reader's vocabulary level, sentence complexity, and preferred themes.
      Also, extract 3-4 effective search keywords (in Korean) to find similar books from a bookstore API.

      User Information:
      - Name: ${userName}
      - Age: ${age ? `${age} years old` : 'Unknown'}

      Reading Log:
      ${combinedReviews}

      **CRITICAL INSTRUCTION:**
      - If the reading log is insufficient, **ESTIMATE** based on Age (${age}).
      - Provide a "warm and professional" analysis text (at least 3-4 sentences each for level and interest).
      - Keywords should be specific genres, topics, or themes (e.g., '우주', '성장 소설', '공룡', '판타지').

      Output Requirements:
      - Return a JSON object with keys: 
        - "level_analysis" (string: warm, detailed feedback on reading level), 
        - "interests" (string: warm, detailed feedback on interests), 
        - "estimated_grade" (string),
        - "search_keywords" (array of strings: 3-5 keywords for API search)
      - Language: Korean
    `;

        const analysisResult = await model.generateContent(analysisPrompt);
        const analysisResponse = await analysisResult.response;
        const analysisText = cleanJson(analysisResponse.text());

        let learnerProfile;
        try {
            learnerProfile = JSON.parse(analysisText);
        } catch (e) {
            console.error("Step A Analysis Error", e);
            learnerProfile = {
                level_analysis: age ? `${age}세 또래의 평균적인 독서 수준입니다. 앞으로 다양한 책을 접하면 더 성장할 거예요.` : "기본 독서 수준",
                interests: "다양한 주제에 관심을 보이고 있네요.",
                estimated_grade: age ? (age >= 8 && age <= 19 ? `학년 수준 (추정)` : "연령 맞춤") : "정보 없음",
                search_keywords: ["베스트셀러", "추천도서"]
            };
        }

        // --- Step B: API Data Collection (RAG) ---
        let allCandidates: AladinBook[] = [];
        const keywords = learnerProfile.search_keywords || ["권장도서"];

        const searchPromises = keywords.map((k: string) => searchAladinBooks(k, 15));
        const searchResults = await Promise.all(searchPromises);

        const seenIsbn = new Set();
        searchResults.flat().forEach(book => {
            if (book.isbn && !seenIsbn.has(book.isbn)) {
                seenIsbn.add(book.isbn);
                allCandidates.push(book);
            }
        });

        const contextBooks = allCandidates.slice(0, 50);

        // --- Step C: Final Selection & Verification (Gemini) ---
        const selectionPrompt = `
      You are ${ageConfig.persona}.
      From the provided list of ACTUAL books (fetched from Aladin API), select the **TOP 10** most appropriate books for the learner.

      Learner Profile:
      - Name: ${userName}
      - Age: ${age ? `${age} years old` : 'Unknown'}
      - Reading Level: ${learnerProfile.level_analysis}
      - Interests: ${learnerProfile.interests}

      **Candidate Book List (from API):**
      ${JSON.stringify(contextBooks.map((b, i) => ({
            id: i,
            title: b.title,
            author: b.author,
            category: b.categoryName,
            rank: b.customerReviewRank,
            desc: b.description.substring(0, 100) + "..."
        })))}

      **Selection Criteria:**
      ${ageConfig.verification}
      
      **Instructions:**
      1. Strictly EXCLUDE books that are inappropriate for the age (e.g., adult books for kids, or toddler books for teens).
      2. Prioritize books with high customer ratings (customerReviewRank).
      3. Recommend exactly 10 books.
      4. Provide a warm, personalized recommendation reason for each book.

      Output Requirements:
      - Final Output Format (JSON):
      {
        "recommendations": [
          { "title": "Exact title from list", "author": "Author from list", "reason": "Reason..." }
        ]
      }
      - Language: Korean
    `;

        const finalResultReq = await model.generateContent(selectionPrompt);
        const finalResponse = await finalResultReq.response;
        const finalText = cleanJson(finalResponse.text());

        try {
            const finalResult = JSON.parse(finalText);
            const enrichedRecommendations = (finalResult.recommendations || []).map((rec: any) => {
                const original = contextBooks.find(b => b.title === rec.title) || contextBooks.find(b => b.title.includes(rec.title)) || {};
                return {
                    ...rec,
                    cover_url: (original as AladinBook).cover,
                    link: (original as AladinBook).link
                };
            });

            return {
                level: learnerProfile.level_analysis,
                interest: learnerProfile.interests,
                recommendations: enrichedRecommendations
            };
        } catch (parseError) {
            console.error("Step C Selection Error", parseError);
            return {
                level: learnerProfile.level_analysis,
                interest: learnerProfile.interests,
                recommendations: []
            }
        }
    } catch (error) {
        console.error("Gemini AI Error:", error);
        return null;
    }
}

function cleanJson(text: string) {
    return text.replace(/```json/g, '').replace(/```/g, '').trim();
}

function getAgeConfig(age?: number) {
    if (!age) {
        return {
            persona: "a professional librarian (전문 사서)",
            constraints: "Recommend books suitable for general readers.",
            verification: "Ensure books are popular and well-regarded."
        };
    }

    if (age <= 6) {
        return {
            persona: "an expert in child development and picture books (유아 발달 및 그림책 전문가)",
            constraints: "Focus on picture books, daily life, emotions.",
            verification: "Verify if the book is suitable for a toddler/preschooler."
        };
    } else if (age <= 12) {
        return {
            persona: "an elementary reading education expert (초등 독서 교육 전문가)",
            constraints: "Challenging level (+10%), exclude adult vocabulary.",
            verification: "Re-verify if appropriate for an elementary student."
        };
    } else if (age <= 18) {
        return {
            persona: "a Young Adult (YA) literature mentor (청소년 문학 멘토)",
            constraints: "YA literature, self-identity, career.",
            verification: "Verify if the book resonates with a teenager."
        };
    } else {
        return {
            persona: "a professional book critic and curator (전문 서평가 및 북 큐레이터)",
            constraints: "NO RESTRICTIONS. Deep insights, artistic value.",
            verification: "Ensure high literary or informational value."
        };
    }
}
