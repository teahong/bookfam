import axios from 'axios';

const ALADIN_API_KEY = import.meta.env.VITE_ALADIN_API_KEY;
const PROXY_BASE_URL = '/api/aladin/ttb/api/ItemSearch.aspx';

export interface AladinBook {
    title: string;
    author: string;
    pubDate: string;
    description: string;
    isbn: string;
    cover: string;
    categoryName: string;
    customerReviewRank: number; // 10점 만점
    priceStandard: number;
    link: string;
}

export const searchAladinBooks = async (query: string, maxResults: number = 20): Promise<AladinBook[]> => {
    if (!ALADIN_API_KEY) {
        console.error("Aladin API Key is missing");
        return [];
    }

    try {
        const response = await axios.get(PROXY_BASE_URL, {
            params: {
                ttbkey: ALADIN_API_KEY,
                Query: query,
                QueryType: 'Keyword',
                MaxResults: maxResults,
                start: 1,
                SearchTarget: 'Book',
                output: 'js',
                Version: '20131101'
            }
        });

        if (response.data && response.data.item) {
            return response.data.item.map((item: any) => ({
                title: item.title,
                author: item.author,
                pubDate: item.pubDate,
                description: item.description || "",
                isbn: item.isbn13 || item.isbn,
                cover: item.cover,
                categoryName: item.categoryName,
                customerReviewRank: item.customerReviewRank,
                priceStandard: item.priceStandard,
                link: item.link
            }));
        }

        return [];
    } catch (error) {
        console.error("Aladin API Search Error:", error);
        return [];
    }
};
