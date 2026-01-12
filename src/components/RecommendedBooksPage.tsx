import React, { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { ArrowLeft, BookOpen, Star, User, Gift, ExternalLink, X } from 'lucide-react';

interface RecommendedBooksPageProps {
    userName: string;
    onBack: () => void;
}

const RecommendedBooksPage: React.FC<RecommendedBooksPageProps> = ({ userName, onBack }) => {
    const [books, setBooks] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [selectedBook, setSelectedBook] = useState<any>(null);
    const [isDetailOpen, setIsDetailOpen] = useState(false);

    useEffect(() => {
        fetchRecommendedBooks();
    }, []);

    const fetchRecommendedBooks = async () => {
        try {
            // 모든 책을 가져온 후 클라이언트 측에서 필터링 (간단한 가족 앱 규모에 적합)
            const { data, error } = await supabase
                .from('books')
                .select('*')
                .not('recommend_to', 'is', null) // 추천이 있는 책만 조회
                .order('created_at', { ascending: false });

            if (error) throw error;

            if (data) {
                const myRecommendations = data.filter(book =>
                    book.recommend_to && book.recommend_to.split(',').map((s: string) => s.trim()).includes(userName)
                );
                setBooks(myRecommendations);
            }
        } catch (error) {
            console.error('추천 도서 불러오기 실패:', error);
        } finally {
            setLoading(false);
        }
    };

    // 사용자별 고유 색상 생성을 위한 헬퍼 함수 (파스텔 톤)
    const getUserColor = (name: string) => {
        // 가족 구성원별 고유 색상 지정 (사용자 요청)
        switch (name) {
            case '재민': // Yellow
                return { bg: '#FFF9C4', text: '#F57F17', icon: '#FBC02D' };
            case '아빠': // Blue
                return { bg: '#e3f2fd', text: '#1565c0', icon: '#1e88e5' };
            case '엄마': // Green
                return { bg: '#e8f5e9', text: '#2e7d32', icon: '#43a047' };
            case '찬민': // Purple
                return { bg: '#f3e5f5', text: '#7b1fa2', icon: '#8e24aa' };
        }

        // 그 외 사용자 (손님 등)를 위한 기본값 (Grey)
        return { bg: '#f5f5f5', text: '#616161', icon: '#9e9e9e' };
    };

    const handleBookClick = (book: any) => {
        setSelectedBook(book);
        setIsDetailOpen(true);
    };

    return (
        <div className="dashboard-container" style={{ animation: 'fadeIn 0.5s' }}>
            <header style={{ display: 'flex', alignItems: 'center', marginBottom: '40px', gap: '20px' }}>
                <button
                    onClick={onBack}
                    className="btn-icon"
                    style={{ background: 'white', padding: '10px', borderRadius: '50%', border: '1px solid #eee', cursor: 'pointer', boxShadow: '0 2px 5px rgba(0,0,0,0.05)' }}
                >
                    <ArrowLeft size={24} color="#333" />
                </button>
                <div>
                    <h1 style={{ fontSize: '2rem', display: 'flex', alignItems: 'center', gap: '10px' }}>
                        <Gift color="var(--primary)" size={32} />
                        <span style={{ color: 'var(--primary)' }}>{userName}</span>님을 위한 추천 도서
                    </h1>
                    <p>가족들이 회원님에게 추천한 책들을 모아봤어요.</p>
                </div>
            </header>

            {loading ? (
                <div style={{ textAlign: 'center', padding: '50px', color: '#666' }}>
                    불러오는 중...
                </div>
            ) : books.length === 0 ? (
                <div className="glass-card" style={{ textAlign: 'center', padding: '50px', color: '#888' }}>
                    <BookOpen size={48} style={{ marginBottom: '15px', opacity: 0.3 }} />
                    <p>아직 추천 받은 책이 없어요.</p>
                    <p style={{ fontSize: '0.9rem', marginTop: '5px' }}>가족들에게 책을 추천해달라고 해보세요!</p>
                </div>
            ) : (
                <div className="grid-family" style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))' }}>
                    {books.map(book => {
                        const userColor = getUserColor(book.user_id);
                        return (
                            <div
                                key={book.id}
                                className="glass-card book-card"
                                style={{
                                    padding: '20px', display: 'flex', flexDirection: 'column', gap: '15px',
                                    cursor: 'pointer' // 클릭 가능 표시
                                }}
                                onClick={() => handleBookClick(book)}
                            >
                                <div style={{ display: 'flex', gap: '15px' }}>
                                    {/* 표지 이미지 */}
                                    <div style={{ width: '80px', flexShrink: 0 }}>
                                        <div style={{
                                            width: '100%',
                                            aspectRatio: '1 / 1.5',
                                            backgroundColor: '#f1f3f5',
                                            borderRadius: '6px',
                                            overflow: 'hidden',
                                            display: 'flex',
                                            alignItems: 'center',
                                            justifyContent: 'center',
                                            border: '1px solid #e9ecef',
                                            position: 'relative'
                                        }}>
                                            {book.cover_url ? (
                                                <img src={book.cover_url} alt={book.title} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                                            ) : (
                                                <BookOpen size={20} color="#adb5bd" />
                                            )}
                                        </div>
                                    </div>

                                    <div style={{ flex: 1, minWidth: 0 }}>
                                        <div style={{
                                            display: 'inline-flex', alignItems: 'center', gap: '5px',
                                            padding: '4px 10px', background: userColor.bg, borderRadius: '15px',
                                            color: userColor.text, fontSize: '0.8rem', fontWeight: 'bold', marginBottom: '8px'
                                        }}>
                                            <User size={12} color={userColor.icon} />
                                            {book.user_id}님의 추천
                                        </div>
                                        <h4 style={{
                                            fontSize: '1.1rem', marginBottom: '5px', lineHeight: 1.3,
                                            whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis'
                                        }}>
                                            {book.title}
                                        </h4>
                                        <p style={{ fontSize: '0.85rem', color: '#666', marginBottom: '8px' }}>
                                            {book.author}
                                        </p>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                                            <div style={{ display: 'flex', alignItems: 'center' }}>
                                                <Star size={14} fill="gold" stroke="gold" />
                                                <span style={{ marginLeft: '4px', fontSize: '0.9rem', fontWeight: 'bold', color: '#444' }}>{book.rating}</span>
                                            </div>
                                            {/* 리스트에는 링크 아이콘 작게 유지 (모달 유도를 위해 제거할 수도 있지만, 빠른 접근을 위해 유지) */}
                                            {book.link && (
                                                <ExternalLink size={14} color="#aaa" />
                                            )}
                                        </div>
                                    </div>
                                </div>

                                <div style={{ background: '#f9f9f9', padding: '15px', borderRadius: '8px', fontSize: '0.9rem', color: '#555', fontStyle: 'italic', flex: 1, display: '-webkit-box', WebkitLineClamp: 3, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>
                                    "{book.review_content}"
                                </div>
                            </div>
                        );
                    })}
                </div>
            )}

            {/* 상세 보기 모달 (Read-Only) */}
            {isDetailOpen && selectedBook && (
                <div style={{
                    position: 'fixed', top: 0, left: 0, width: '100%', height: '100%',
                    background: 'rgba(0,0,0,0.5)', zIndex: 1000, display: 'flex', justifyContent: 'center', alignItems: 'center',
                    backdropFilter: 'blur(5px)'
                }} onClick={() => setIsDetailOpen(false)}>
                    <div
                        className="glass-card"
                        style={{ width: '90%', maxWidth: '800px', maxHeight: '90vh', overflowY: 'auto', position: 'relative', animation: 'fadeIn 0.3s' }}
                        onClick={e => e.stopPropagation()}
                    >
                        {/* Header Actions */}
                        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginBottom: '20px', borderBottom: '1px solid #eee', paddingBottom: '15px' }}>
                            <button onClick={() => setIsDetailOpen(false)} className="btn-icon" title="닫기" style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#999' }}>
                                <X size={24} />
                            </button>
                        </div>

                        <div style={{ display: 'flex', flexDirection: 'column', gap: '30px' }}>
                            <div style={{ display: 'flex', gap: '30px', flexWrap: 'wrap', justifyContent: 'center' }}>
                                {/* Big Cover */}
                                <div style={{ flex: '0 0 250px', maxWidth: '300px', margin: '0 auto' }}>
                                    <div style={{
                                        width: '100%', aspectRatio: '1/1.5', borderRadius: '12px', overflow: 'hidden', boxShadow: '0 10px 20px rgba(0,0,0,0.15)',
                                        background: '#f1f1f1', display: 'flex', alignItems: 'center', justifyContent: 'center'
                                    }}>
                                        {selectedBook.cover_url ? (
                                            <img src={selectedBook.cover_url} alt={selectedBook.title} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                                        ) : (
                                            <BookOpen size={60} color="#ccc" />
                                        )}
                                    </div>

                                    {/* 원문 보기 버튼 강조 */}
                                    {selectedBook.link && (
                                        <a href={selectedBook.link} target="_blank" rel="noopener noreferrer" style={{
                                            display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px',
                                            marginTop: '15px', color: 'white', textDecoration: 'none',
                                            padding: '12px', background: 'var(--primary)', borderRadius: '10px',
                                            fontSize: '1rem', fontWeight: 'bold', boxShadow: '0 4px 6px rgba(0,0,0,0.1)',
                                            transition: 'transform 0.2s',
                                        }}
                                            onMouseOver={e => e.currentTarget.style.transform = 'translateY(-2px)'}
                                            onMouseOut={e => e.currentTarget.style.transform = 'translateY(0)'}
                                        >
                                            <ExternalLink size={18} /> 원문 보기
                                        </a>
                                    )}
                                </div>

                                {/* Content */}
                                <div style={{ flex: 1, minWidth: '300px' }}>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '10px' }}>
                                        {(() => {
                                            const uColor = getUserColor(selectedBook.user_id);
                                            return (
                                                <div style={{
                                                    display: 'inline-flex', alignItems: 'center', gap: '6px',
                                                    padding: '6px 12px', background: uColor.bg, borderRadius: '20px',
                                                    color: uColor.text, fontSize: '0.9rem', fontWeight: 'bold'
                                                }}>
                                                    <User size={14} color={uColor.icon} />
                                                    {selectedBook.user_id}님의 추천
                                                </div>
                                            );
                                        })()}
                                        <div style={{ color: '#aaa', fontSize: '0.9rem' }}>|</div>
                                        <div style={{ color: '#666', fontSize: '0.9rem' }}>
                                            {selectedBook.read_date} 읽음
                                        </div>
                                    </div>

                                    <h2 style={{ fontSize: '2rem', marginBottom: '10px', color: '#333', lineHeight: 1.2 }}>{selectedBook.title}</h2>
                                    <div style={{ fontSize: '1.1rem', color: '#555', marginBottom: '15px' }}>
                                        {selectedBook.author} {selectedBook.publisher && `| ${selectedBook.publisher}`}
                                    </div>

                                    <div style={{ display: 'flex', alignItems: 'center', gap: '5px', marginBottom: '25px' }}>
                                        {[...Array(5)].map((_, i) => (
                                            <Star key={i} size={24} fill={i < selectedBook.rating ? "gold" : "none"} stroke="gold" />
                                        ))}
                                        <span style={{ marginLeft: '10px', fontSize: '1.2rem', fontWeight: 'bold', color: '#333' }}>{selectedBook.rating}.0</span>
                                    </div>

                                    <div style={{ background: '#f9f9f9', padding: '25px', borderRadius: '15px', marginBottom: '20px', lineHeight: 1.6, fontSize: '1.05rem', color: '#444' }}>
                                        <h4 style={{ marginTop: 0, marginBottom: '10px', color: '#333' }}>📝 추천 사유 (감상문)</h4>
                                        <p style={{ whiteSpace: 'pre-wrap', margin: 0 }}>
                                            {selectedBook.review_content}
                                        </p>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default RecommendedBooksPage;
