import React, { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { Plus, BookOpen, Star, UserPlus, LogOut, Trash2, X, ExternalLink, Pencil, Lock, Gift, Mail } from 'lucide-react';
import KnowledgeGraph from './KnowledgeGraph';
import { extractKeywords, generateBookLetter } from '../lib/gemini';
import { searchAladinBooks } from '../lib/aladin';

import BookForm from './BookForm';

interface MainDashboardProps {
    userName: string;
    onLogout: () => void;
    onShowRecommended: () => void;
}

/**
 * 메인 대시보드 컴포넌트
 * 사용자의 독서 목록을 보여주고, 새로운 책을 기록하거나 지식 그래프를 확인할 수 있습니다.
 */
const MainDashboard: React.FC<MainDashboardProps> = ({ userName, onLogout, onShowRecommended }) => {
    // --- 상태 관리 ---
    const [books, setBooks] = useState<any[]>([]);          // 도서 목록
    const [showAddCard, setShowAddCard] = useState(false);  // 등록 폼 표시 여부
    const [newBook, setNewBook] = useState({                // 작성 중인 도서 정보
        id: '',
        title: '', author: '', publisher: '', cover_url: '',
        rating: 5, review_content: '', recommend_to: '', link: '',
        read_date: new Date().toISOString().split('T')[0]
    });
    const [isEditing, setIsEditing] = useState(false);     // 수정 모드 활성화 여부
    const [isAutoFilling, setIsAutoFilling] = useState(false); // AI 로딩 상태
    const [aiError, setAiError] = useState<string | null>(null); // AI 에러 메시지
    const [users, setUsers] = useState<any[]>([]);          // 추천 대상 유저 목록

    // 상세 보기 및 삭제 보안을 위한 상태
    const [selectedBook, setSelectedBook] = useState<any>(null);
    const [isDetailOpen, setIsDetailOpen] = useState(false);
    const [isPinModalOpen, setIsPinModalOpen] = useState(false);
    const [pinInput, setPinInput] = useState('');
    const [pinError, setPinError] = useState('');
    const [currentUserPin, setCurrentUserPin] = useState<string | null>(null);

    // 책의 편지 관련 상태
    const [bookLetter, setBookLetter] = useState<string | null>(null);
    const [isGeneratingLetter, setIsGeneratingLetter] = useState(false);

    // 컴포넌트 마운트 시 데이터 초기화
    useEffect(() => {
        fetchMyBooks();
        fetchUsers();
    }, []);

    /**
     * 유저 목록과 현재 유저의 PIN 정보를 가져옵니다.
     */
    const fetchUsers = async () => {
        const { data } = await supabase.from('users').select('id, name, pin');
        if (data) {
            setUsers(data);
            const currentUser = data.find(u => u.name === userName);
            if (currentUser) setCurrentUserPin(currentUser.pin);
        }
    };

    /**
     * 현재 로그인한 사용자의 독서 기록을 가져옵니다.
     */
    const fetchMyBooks = async () => {
        const { data } = await supabase
            .from('books')
            .select('*')
            .eq('user_id', userName)
            .order('created_at', { ascending: false });
        if (data) setBooks(data);
    };

    /**
     * 외부 링크(예: 예스24)를 통해 도서 정보를 AI로 추출합니다. (Supabase Edge Function 사용)
     */
    const handleAutoFill = async () => {
        if (!newBook.link) return;
        setIsAutoFilling(true);
        setAiError(null);

        try {
            const { data, error } = await supabase.functions.invoke('process-book', {
                body: { type: 'link', content: newBook.link }
            });

            if (data && data.error) throw new Error(data.error);

            if (data) {
                setNewBook(prev => ({
                    ...prev,
                    title: data.title || prev.title,
                    author: data.author || prev.author,
                    publisher: data.publisher || prev.publisher,
                    cover_url: data.cover_url || prev.cover_url
                }));
            }
            if (error) throw error;
        } catch (err: any) {
            console.error("AI 정보 추출 실패:", err);
            setAiError('도서 정보를 가져오는데 실패했습니다. 직접 입력해 주세요.');
        } finally {
            setIsAutoFilling(false);
        }
    };

    /**
     * 알라딘 API를 사용하여 도서 제목으로 상세 정보 및 표지를 검색합니다.
     */
    const handleSearchCover = async () => {
        if (!newBook.title) {
            setAiError("제목을 먼저 입력해주세요.");
            return;
        }
        setIsAutoFilling(true);
        setAiError(null);
        try {
            const results = await searchAladinBooks(newBook.title, 5);
            if (results && results.length > 0) {
                const book = results[0];
                setNewBook(prev => ({
                    ...prev,
                    title: book.title || prev.title,
                    author: book.author || prev.author,
                    publisher: book.categoryName.split('>')[0] || prev.publisher,
                    cover_url: book.cover || prev.cover_url
                }));
            } else {
                setAiError("알라딘에서 검색 결과를 찾을 수 없습니다.");
            }
        } catch (e: any) {
            console.error("Aladin 검색 실패:", e);
            setAiError("도서 검색 중 오류가 발생했습니다.");
        } finally {
            setIsAutoFilling(false);
        }
    };

    /**
     * 작성된 도서 정보를 데이터베이스에 저장(또는 수정)합니다.
     */
    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        const wordCount = newBook.review_content.trim().length;

        // 감상문 내용이 충분히 길면 AI 키워드 추출 시도
        let keywords: string[] = [];
        if (newBook.review_content.length > 20) {
            keywords = await extractKeywords(newBook.review_content);
        }

        const bookData = {
            title: newBook.title,
            author: newBook.author,
            publisher: newBook.publisher,
            cover_url: newBook.cover_url,
            rating: newBook.rating,
            review_content: newBook.review_content,
            review_word_count: wordCount,
            recommend_to: newBook.recommend_to,
            read_date: newBook.read_date,
            link: newBook.link,
            user_id: userName,
            keywords: keywords
        };

        const { error } = isEditing && newBook.id
            ? await supabase.from('books').update(bookData).eq('id', newBook.id)
            : await supabase.from('books').insert(bookData);

        if (!error) {
            setShowAddCard(false);
            setIsEditing(false);
            setNewBook({
                id: '',
                title: '', author: '', publisher: '', cover_url: '',
                rating: 5, review_content: '', recommend_to: '', link: '',
                read_date: new Date().toISOString().split('T')[0]
            });
            fetchMyBooks();
        }
    };

    /**
     * 특정 도서 카드를 클릭했을 때 상세 모달을 엽니다.
     */
    const handleBookClick = (book: any) => {
        setSelectedBook(book);
        setBookLetter(null); // 모달 열 때 편지 내용 초기화 (숨김 상태)
        setIsDetailOpen(true);
    };

    /**
     * 상세 보기 모달 내에서 수정 버튼을 눌렀을 때의 동작
     */
    const handleEditFromDetail = () => {
        setIsDetailOpen(false);
        setNewBook({
            id: selectedBook.id,
            title: selectedBook.title || '',
            author: selectedBook.author || '',
            publisher: selectedBook.publisher || '',
            cover_url: selectedBook.cover_url || '',
            rating: selectedBook.rating || 5,
            review_content: selectedBook.review_content || '',
            recommend_to: selectedBook.recommend_to || '',
            link: selectedBook.link || '',
            read_date: selectedBook.read_date || new Date().toISOString().split('T')[0]
        });
        setIsEditing(true);
        setShowAddCard(true);
        window.scrollTo({ top: 0, behavior: 'smooth' });
    };

    /**
     * 삭제 요청 시 PIN(비밀번호) 확인 모달을 띄웁니다.
     */
    const handleDeleteRequest = () => {
        setIsPinModalOpen(true);
        setPinInput('');
        setPinError('');
    };

    /**
     * PIN 확인 후 실제 삭제를 진행합니다.
     */
    const confirmDelete = async () => {
        if (pinInput !== currentUserPin) {
            setPinError('비밀번호가 일치하지 않습니다.');
            return;
        }

        const { error } = await supabase.from('books').delete().eq('id', selectedBook.id);
        if (!error) {
            fetchMyBooks();
            setIsPinModalOpen(false);
            setIsDetailOpen(false);
            setSelectedBook(null);
        } else {
            setPinError('삭제 중 오류가 발생했습니다.');
        }
    };

    return (
        <div className="dashboard-container">
            {/* 상단 헤더 섹션 */}
            <header style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '40px' }}>
                <div>
                    <h1 style={{ fontSize: '2.5rem', marginBottom: '8px' }}>안녕하세요, <span style={{ color: 'var(--primary)', fontWeight: 'bold' }}>{userName}</span>님!</h1>
                    <p style={{ fontSize: '1.1rem', color: '#666' }}>오늘 당신의 마음을 두드린 책은 무엇인가요? 📖</p>
                </div>
                <button className="btn" onClick={onLogout} style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '10px 20px', borderRadius: '12px' }}>
                    <LogOut size={18} /> 로그아웃
                </button>
            </header>

            {/* 도서 등록 섹션 (신규 등록 버튼 또는 입력 폼) */}
            {!showAddCard ? (
                <div
                    className="glass-card add-book-trigger"
                    style={{ padding: '40px', textAlign: 'center', cursor: 'pointer', border: '2px dashed var(--primary)', background: 'rgba(99, 102, 241, 0.02)' }}
                    onClick={() => {
                        setIsEditing(false);
                        setNewBook({
                            id: '',
                            title: '', author: '', publisher: '', cover_url: '',
                            rating: 5, review_content: '', recommend_to: '', link: '',
                            read_date: new Date().toISOString().split('T')[0]
                        });
                        setShowAddCard(true);
                    }}
                >
                    <div style={{ width: '60px', height: '60px', background: 'var(--primary)', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 15px', color: 'white' }}>
                        <Plus size={36} />
                    </div>
                    <h3 style={{ fontSize: '1.4rem', color: 'var(--primary)' }}>새로운 책 기록하기</h3>
                    <p style={{ color: '#666' }}>AI 검색과 링크 자동 완성으로 쉽고 편리하게 기록하세요.</p>
                </div>
            ) : (
                <BookForm
                    isEditing={isEditing}
                    book={newBook}
                    setBook={setNewBook}
                    users={users}
                    isAutoFilling={isAutoFilling}
                    aiError={aiError}
                    onCancel={() => setShowAddCard(false)}
                    onSubmit={handleSubmit}
                    onAutoFill={handleAutoFill}
                    onSearchCover={handleSearchCover}
                />
            )}


            <div style={{ marginTop: '40px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '15px', marginBottom: '15px' }}>
                    <h3 style={{ margin: 0 }}>내가 기록한 책들</h3>
                    <button
                        onClick={onShowRecommended}
                        className="btn-icon"
                        style={{
                            background: 'rgba(99, 102, 241, 0.1)', // Indigo-500 light
                            color: '#4f46e5', // INDIGO-600
                            border: '1px solid rgba(99, 102, 241, 0.2)',
                            borderRadius: '20px',
                            padding: '6px 14px',
                            fontSize: '0.85rem',
                            cursor: 'pointer',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '6px',
                            fontWeight: '600',
                            transition: 'all 0.2s ease',
                            boxShadow: '0 2px 5px rgba(0,0,0,0.03)'
                        }}
                    >
                        <Gift size={15} /> 추천 받은 책들
                    </button>
                </div>
                <div className="grid-family" style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))' }}>
                    {books.map(book => (
                        <div
                            key={book.id}
                            className="glass-card book-card"
                            style={{ padding: '20px', position: 'relative', cursor: 'pointer', display: 'flex', gap: '15px' }}
                            onClick={() => handleBookClick(book)}
                        >
                            {/* Card Cover Image */}
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
                                    border: '1px solid #e9ecef'
                                }}>
                                    {book.cover_url ? (
                                        <img src={book.cover_url} alt={book.title} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                                    ) : (
                                        <BookOpen size={20} color="#adb5bd" />
                                    )}
                                </div>
                            </div>

                            <div style={{ flex: 1, minWidth: 0 }}>
                                <h4 style={{ color: 'var(--primary)', marginBottom: '5px', fontSize: '1.2rem', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', paddingRight: '10px' }}>
                                    {book.title}
                                </h4>
                                <p style={{ fontSize: '0.85rem', color: '#666', marginBottom: '8px' }}>
                                    {book.author} {book.publisher && `| ${book.publisher}`}
                                </p>
                                <div style={{ marginBottom: '10px' }}>
                                    {[...Array(5)].map((_, i) => (
                                        <Star key={i} size={14} fill={i < book.rating ? "gold" : "none"} stroke="gold" />
                                    ))}
                                </div>
                                <p style={{ fontSize: '0.9rem', fontStyle: 'italic', color: '#444', marginBottom: '10px', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>
                                    "{book.review_content}"
                                </p>
                                {book.recommend_to && (
                                    <div style={{ fontSize: '0.8rem', background: '#e1f5fe', padding: '4px 8px', borderRadius: '4px', display: 'inline-flex', alignItems: 'center' }}>
                                        <UserPlus size={12} style={{ marginRight: '5px' }} /> {book.recommend_to}님께 추천
                                    </div>
                                )}
                            </div>
                        </div>
                    ))}
                </div>
            </div>

            <KnowledgeGraph books={books} />

            {/* Detail Modal */}
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
                            <button onClick={handleEditFromDetail} className="btn-icon" title="수정" style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#333' }}>
                                <Pencil size={20} />
                            </button>
                            <button onClick={handleDeleteRequest} className="btn-icon" title="삭제" style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#ff7675' }}>
                                <Trash2 size={20} />
                            </button>
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
                                    {selectedBook.link && (
                                        <a href={selectedBook.link} target="_blank" rel="noopener noreferrer" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '5px', marginTop: '15px', color: 'var(--primary)', textDecoration: 'none', padding: '10px', background: '#f5f5f5', borderRadius: '8px', fontSize: '0.9rem' }}>
                                            <ExternalLink size={16} /> 원문 보기
                                        </a>
                                    )}
                                </div>

                                {/* Content */}
                                <div style={{ flex: 1, minWidth: '300px' }}>
                                    <div style={{ marginBottom: '5px', color: '#666', fontSize: '0.9rem' }}>
                                        {selectedBook.read_date} 읽음
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
                                        <h4 style={{ marginTop: 0, marginBottom: '10px', color: '#333' }}>📝 독서 감상문</h4>
                                        <p style={{ whiteSpace: 'pre-wrap', margin: 0 }}>
                                            {selectedBook.review_content}
                                        </p>
                                    </div>

                                    {selectedBook.recommend_to && (
                                        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', background: '#e3f2fd', padding: '15px', borderRadius: '12px', color: '#1565c0' }}>
                                            <UserPlus size={20} />
                                            <span style={{ fontWeight: 'bold' }}>{selectedBook.recommend_to}</span> 님에게 이 책을 추천해요!
                                        </div>
                                    )}
                                </div>

                                {/* 책의 편지 섹션 */}
                                <div style={{ marginTop: '30px' }}>
                                    {!bookLetter && !isGeneratingLetter && (
                                        <button
                                            onClick={async () => {
                                                // 1. 이미 저장된 편지가 있는지 확인
                                                if (selectedBook.book_letter) {
                                                    setBookLetter(selectedBook.book_letter);
                                                    return;
                                                }

                                                // 2. 없으면 새로 생성
                                                setIsGeneratingLetter(true);
                                                try {
                                                    const letter = await generateBookLetter(userName, selectedBook.title, selectedBook.review_content);

                                                    if (letter) {
                                                        // DB에 저장
                                                        const { error } = await supabase
                                                            .from('books')
                                                            .update({ book_letter: letter })
                                                            .eq('id', selectedBook.id);

                                                        if (!error) {
                                                            // 로컬 상태 업데이트
                                                            setBookLetter(letter);
                                                            // 전체 목록도 갱신하여 캐싱된 데이터 업데이트
                                                            setBooks(prevBooks => prevBooks.map(b =>
                                                                b.id === selectedBook.id ? { ...b, book_letter: letter } : b
                                                            ));
                                                            // 현재 선택된 책 정보도 업데이트 (다음 번 클릭 시 바로 뜨게)
                                                            setSelectedBook((prev: any) => ({ ...prev, book_letter: letter }));
                                                        } else {
                                                            console.error("편지 저장 실패:", error);
                                                            setBookLetter(letter); // 저장은 실패했어도 일단 보여줌
                                                        }
                                                    }
                                                } catch (err) {
                                                    console.error("편지 생성 중 오류:", err);
                                                } finally {
                                                    setIsGeneratingLetter(false);
                                                }
                                            }}
                                            className="btn-primary"
                                            style={{
                                                width: '100%',
                                                display: 'flex',
                                                alignItems: 'center',
                                                justifyContent: 'center',
                                                gap: '10px',
                                                padding: '15px',
                                                fontSize: '1.1rem',
                                                background: 'linear-gradient(135deg, #6366f1, #8b5cf6)',
                                                border: 'none',
                                                borderRadius: '12px',
                                                color: 'white',
                                                cursor: 'pointer',
                                                boxShadow: '0 4px 15px rgba(99, 102, 241, 0.3)'
                                            }}
                                        >
                                            <Mail size={20} /> 편지가 도착했어요
                                        </button>
                                    )}

                                    {isGeneratingLetter && (
                                        <div style={{ textAlign: 'center', padding: '20px', color: '#666' }}>
                                            <div className="loading-spinner" style={{ margin: '0 auto 10px' }}></div>
                                            <p>책의 영혼이 편지를 쓰고 있어요... ✨</p>
                                        </div>
                                    )}

                                    {bookLetter && (
                                        <div style={{
                                            background: '#fff9c4', // 따뜻한 편지지 색상
                                            backgroundImage: 'linear-gradient(#e1e1e1 1px, transparent 1px)', // 노트 줄무늬 효과
                                            backgroundSize: '100% 2em',
                                            padding: '30px',
                                            borderRadius: '10px',
                                            boxShadow: '5px 5px 15px rgba(0,0,0,0.1)',
                                            position: 'relative',
                                            fontFamily: '"Gaegu", "Nanum Pen Script", cursive', // 손글씨 느낌 폰트 권장 (없으면 기본)
                                            lineHeight: '2em',
                                            fontSize: '1.1rem',
                                            color: '#4a4a4a'
                                        }}>
                                            <div style={{ position: 'absolute', top: '-15px', left: '20px', fontSize: '2rem' }}>💌</div>
                                            <h4 style={{ margin: '0 0 15px 0', color: '#5d4037', fontSize: '1.3rem', display: 'flex', alignItems: 'center', gap: '8px' }}>
                                                To. {userName}
                                            </h4>
                                            <p style={{ whiteSpace: 'pre-wrap', margin: 0 }}>
                                                {bookLetter}
                                            </p>
                                        </div>
                                    )}
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* PIN Verification Modal */}
            {isPinModalOpen && (
                <div style={{
                    position: 'fixed', top: 0, left: 0, width: '100%', height: '100%',
                    background: 'rgba(0,0,0,0.5)', zIndex: 1100, display: 'flex', justifyContent: 'center', alignItems: 'center',
                    backdropFilter: 'blur(5px)'
                }} onClick={() => setIsPinModalOpen(false)}>
                    <div
                        className="glass-card"
                        style={{ width: '90%', maxWidth: '350px', padding: '30px', textAlign: 'center', animation: 'scaleIn 0.2s' }}
                        onClick={e => e.stopPropagation()}
                    >
                        <div style={{ width: '50px', height: '50px', background: '#ffebee', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 15px' }}>
                            <Lock color="#ef5350" size={24} />
                        </div>
                        <h3 style={{ margin: '0 0 10px 0' }}>비밀번호 확인</h3>
                        <p style={{ fontSize: '0.9rem', color: '#666', marginBottom: '20px' }}>
                            삭제하려면 4자리 비밀번호를 입력하세요.
                        </p>

                        <input
                            type="tel"
                            className="input-field"
                            maxLength={4}
                            pattern="[0-9]*"
                            inputMode="numeric"
                            placeholder="PIN 4자리"
                            style={{
                                textAlign: 'center',
                                letterSpacing: '10px',
                                fontSize: '1.8rem',
                                marginBottom: '15px',
                                WebkitTextSecurity: 'disc',
                                height: '60px',
                                border: '2px solid #e0e0e0',
                                borderRadius: '12px',
                                background: 'white',
                                width: '100%'
                            } as any}
                            value={pinInput}
                            onChange={e => setPinInput(e.target.value)}
                            onKeyDown={e => { if (e.key === 'Enter') confirmDelete(); }}
                            autoFocus
                        />

                        {pinError && <p style={{ color: 'red', fontSize: '0.8rem', marginBottom: '15px' }}>{pinError}</p>}

                        <div style={{ display: 'flex', gap: '10px' }}>
                            <button className="btn" style={{ flex: 1 }} onClick={() => setIsPinModalOpen(false)}>취소</button>
                            <button className="btn" style={{ flex: 1, background: '#ff7675', color: 'white', border: 'none' }} onClick={confirmDelete}>삭제</button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default MainDashboard;
