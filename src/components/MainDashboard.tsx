import React, { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { Plus, BookOpen, Star, UserPlus, LogOut, Trash2, UploadCloud, AlertCircle } from 'lucide-react';
import KnowledgeGraph from './KnowledgeGraph';

interface MainDashboardProps {
    userName: string;
    onLogout: () => void;
}

const MainDashboard: React.FC<MainDashboardProps> = ({ userName, onLogout }) => {
    const [books, setBooks] = useState<any[]>([]);
    const [showAddCard, setShowAddCard] = useState(false);
    const [newBook, setNewBook] = useState({
        id: '', // Added for edit mode
        title: '', author: '', publisher: '', cover_url: '',
        rating: 5, review_content: '', recommend_to: '', link: '',
        read_date: new Date().toISOString().split('T')[0]
    });
    const [isEditing, setIsEditing] = useState(false); // New state for edit mode
    const [isAutoFilling, setIsAutoFilling] = useState(false);
    const [aiError, setAiError] = useState<string | null>(null);
    const [users, setUsers] = useState<any[]>([]);

    useEffect(() => {
        fetchMyBooks();
        fetchUsers();
    }, []);

    const fetchUsers = async () => {
        const { data } = await supabase.from('users').select('id, name');
        if (data) setUsers(data);
    };

    const fetchMyBooks = async () => {
        const { data } = await supabase
            .from('books')
            .select('*')
            .eq('user_id', userName)
            .order('created_at', { ascending: false });
        if (data) setBooks(data);
    };

    const handleAutoFill = async () => {
        if (!newBook.link) return;
        setIsAutoFilling(true);
        setAiError(null);

        try {
            const { data, error } = await supabase.functions.invoke('process-book', {
                body: { type: 'link', content: newBook.link }
            });

            if (data && data.error) {
                throw new Error(data.error);
            }

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
            console.error("AI Error:", err);
            const msg = err.message || (typeof err === 'object' ? JSON.stringify(err) : String(err));
            setAiError('도서 정보를 가져오는데 실패했습니다: ' + msg);
        } finally {
            setIsAutoFilling(false);
        }
    };

    const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        setIsAutoFilling(true);
        setAiError(null);

        // Convert to base64
        const reader = new FileReader();
        reader.onloadend = async () => {
            const base64 = reader.result?.toString().split(',')[1];

            try {
                const { data, error } = await supabase.functions.invoke('process-book', {
                    body: { type: 'image', content: base64 }
                });

                if (data && data.error) {
                    throw new Error(data.error);
                }

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
                console.error("AI Error:", err);
                const msg = err.message || (typeof err === 'object' ? JSON.stringify(err) : String(err));
                setAiError('도서 정보를 가져오는데 실패했습니다: ' + msg);
            } finally {
                setIsAutoFilling(false);
            }
        };
        reader.readAsDataURL(file);
    };

    const handleSearchCover = async () => {
        if (!newBook.title) {
            setAiError("제목을 입력해주세요.");
            return;
        }
        setIsAutoFilling(true);
        setAiError(null);
        try {
            // Direct Google Books API call for client-side search (Restricted to Korean)
            const response = await fetch(`https://www.googleapis.com/books/v1/volumes?q=${encodeURIComponent(newBook.title)}&langRestrict=ko&printType=books`);
            const data = await response.json();

            if (data.items && data.items.length > 0) {
                const book = data.items[0].volumeInfo;
                setNewBook(prev => ({
                    ...prev,
                    title: book.title || prev.title,
                    author: book.authors ? book.authors[0] : prev.author,
                    publisher: book.publisher || prev.publisher,
                    cover_url: book.imageLinks ? (book.imageLinks.thumbnail || book.imageLinks.smallThumbnail).replace('http:', 'https:') : prev.cover_url
                }));
            } else {
                setAiError("책을 찾을 수 없습니다.");
            }
        } catch (e: any) {
            console.error("Cover auto-fetch failed", e);
            setAiError(e.message || "표지 검색 실패");
        } finally {
            setIsAutoFilling(false);
        }
    };

    const handleTitleBlur = () => {
        if (newBook.title && !newBook.cover_url) {
            handleSearchCover();
        }
    };

    import { extractKeywords } from '../lib/gemini';

    // ... (existing imports)

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        const wordCount = newBook.review_content.trim().length;

        // Extract keywords using AI if review content is sufficient
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
            keywords: keywords // Save extracted keywords
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

    const handleEditBook = (book: any) => {
        setNewBook({
            id: book.id,
            title: book.title || '',
            author: book.author || '',
            publisher: book.publisher || '',
            cover_url: book.cover_url || '',
            rating: book.rating || 5,
            review_content: book.review_content || '',
            recommend_to: book.recommend_to || '',
            link: book.link || '',
            read_date: book.read_date || new Date().toISOString().split('T')[0]
        });
        setIsEditing(true);
        setShowAddCard(true);
        window.scrollTo({ top: 0, behavior: 'smooth' });
    };

    const deleteBook = async (id: string) => {
        const { error } = await supabase.from('books').delete().eq('id', id);
        if (!error) fetchMyBooks();
    };

    return (
        <div className="dashboard-container">
            <header style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '40px' }}>
                <div>
                    <h1 style={{ fontSize: '2rem' }}>안녕하세요, <span style={{ color: 'var(--primary)' }}>{userName}</span>님!</h1>
                    <p>오늘의 지식을 기록해보세요.</p>
                </div>
                <button className="btn" onClick={onLogout} style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <LogOut size={18} /> 로그아웃
                </button>
            </header>

            {!showAddCard ? (
                <div
                    className="glass-card"
                    style={{ padding: '30px', textAlign: 'center', cursor: 'pointer', borderStyle: 'dashed', borderWidth: '2px' }}
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
                    <Plus size={40} color="var(--primary)" style={{ marginBottom: '10px' }} />
                    <h3>새로운 책 등록하기</h3>
                    <p>링크나 사진으로 간편하게 등록하세요.</p>
                </div>
            ) : (
                <div className="glass-card" style={{ marginBottom: '30px' }}>
                    <h3>{isEditing ? '책 정보 수정' : '새 책 등록'}</h3>
                    <form onSubmit={handleSubmit} style={{ marginTop: '20px' }}>
                        <div style={{ marginBottom: '15px' }}>
                            <label>도서 정보 가져오기</label>
                            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '10px', marginTop: '10px' }}>
                                <div style={{ flex: 1, minWidth: '200px' }}>
                                    <input
                                        type="text"
                                        className="input-field"
                                        placeholder="도서 링크 입력 (URL)"
                                        value={newBook.link}
                                        onChange={e => setNewBook({ ...newBook, link: e.target.value })}
                                    />
                                </div>
                                <button type="button" className="btn btn-primary" onClick={handleAutoFill} disabled={isAutoFilling && !newBook.link}>
                                    {isAutoFilling && !newBook.link ? '추출 중...' : '링크로 정보 추출'}
                                </button>

                                <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
                                    <input
                                        type="file"
                                        id="book-image"
                                        accept="image/*"
                                        style={{ display: 'none' }}
                                        onChange={handleImageUpload}
                                    />
                                    <label htmlFor="book-image" className="btn" style={{ background: '#eee', display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer' }}>
                                        <UploadCloud size={18} /> 표지 사진 업로드
                                    </label>
                                </div>
                            </div>
                            {aiError && (
                                <div style={{ marginTop: '10px', padding: '10px', background: '#ffebee', color: '#c62828', borderRadius: '8px', fontSize: '0.9rem', display: 'flex', alignItems: 'center', gap: '8px' }}>
                                    <AlertCircle size={16} /> {aiError}
                                </div>
                            )}
                        </div>

                        <div style={{ display: 'flex', gap: '20px', marginBottom: '15px' }}>
                            <div style={{ flex: 1 }}>
                                <div style={{ display: 'grid', gap: '15px', marginBottom: '15px' }}>
                                    <div style={{ display: 'flex', gap: '10px' }}>
                                        <input
                                            type="text"
                                            className="input-field"
                                            placeholder="제목"
                                            value={newBook.title}
                                            onChange={(e) => setNewBook({ ...newBook, title: e.target.value })}
                                            onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); handleSearchCover(); } }}
                                            required
                                            style={{ flex: 1 }}
                                        />
                                        <button type="button" className="btn btn-primary" onClick={handleSearchCover} disabled={isAutoFilling}>
                                            검색
                                        </button>
                                        <button type="button" className="btn btn-secondary" onClick={() => setNewBook({ ...newBook, title: '', author: '', publisher: '', cover_url: '' })}>
                                            직접 입력
                                        </button>
                                    </div>
                                </div>

                                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '15px', marginBottom: '15px' }}>
                                    <input
                                        type="text"
                                        className="input-field"
                                        placeholder="작가"
                                        value={newBook.author}
                                        onChange={(e) => setNewBook({ ...newBook, author: e.target.value })}
                                    />
                                    <input
                                        type="text"
                                        className="input-field"
                                        placeholder="출판사"
                                        value={newBook.publisher}
                                        onChange={(e) => setNewBook({ ...newBook, publisher: e.target.value })}
                                    />
                                </div>

                                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '15px' }}>
                                    <div>
                                        <label style={{ fontSize: '0.9rem', color: '#666', marginBottom: '5px', display: 'block' }}>읽은 날짜</label>
                                        <input
                                            type="date" className="input-field"
                                            value={newBook.read_date} onChange={e => setNewBook({ ...newBook, read_date: e.target.value })} required
                                        />
                                    </div>
                                    <div style={{ display: 'flex', flexDirection: 'column', justifyContent: 'flex-end' }}>
                                        <label style={{ fontSize: '0.9rem', color: '#666' }}>평점</label>
                                        <div style={{ display: 'flex', gap: '5px', marginTop: '10px' }}>
                                            {[1, 2, 3, 4, 5].map(s => (
                                                <Star
                                                    key={s} size={24} fill={s <= newBook.rating ? "gold" : "none"} stroke="gold"
                                                    onClick={() => setNewBook({ ...newBook, rating: s })} style={{ cursor: 'pointer' }}
                                                />
                                            ))}
                                        </div>
                                    </div>
                                </div>
                            </div>

                            {/* Cover Preview Section */}
                            <div style={{ width: '200px', flexShrink: 0 }}>
                                <div
                                    style={{
                                        width: '100%',
                                        aspectRatio: '1 / 1.5',
                                        backgroundColor: '#f8f9fa',
                                        borderRadius: '12px',
                                        border: '2px dashed #ced4da',
                                        display: 'flex',
                                        alignItems: 'center',
                                        justifyContent: 'center',
                                        overflow: 'hidden',
                                        color: '#adb5bd',
                                        flexDirection: 'column',
                                        textAlign: 'center',
                                        fontSize: '0.9rem',
                                        boxShadow: 'inset 0 0 20px rgba(0,0,0,0.05)',
                                        cursor: 'pointer',
                                        position: 'relative'
                                    }}
                                    onClick={() => {
                                        if (!newBook.cover_url) {
                                            const url = prompt("이미지 주소를 입력하세요 (URL):");
                                            if (url) setNewBook({ ...newBook, cover_url: url });
                                        }
                                    }}
                                >
                                    {newBook.cover_url ? (
                                        <>
                                            <img src={newBook.cover_url} alt="표지" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                                            <div
                                                style={{ position: 'absolute', top: 5, right: 5, background: 'rgba(0,0,0,0.5)', padding: '5px', borderRadius: '50%' }}
                                                onClick={(e) => { e.stopPropagation(); setNewBook({ ...newBook, cover_url: '' }); }}
                                            >
                                                <Trash2 size={14} color="white" />
                                            </div>
                                        </>
                                    ) : (
                                        <>
                                            <BookOpen size={32} style={{ marginBottom: '10px', opacity: 0.5 }} />
                                            <span>클릭하여<br />이미지 링크 입력</span>
                                        </>
                                    )}
                                </div>
                            </div>
                        </div>

                        <div style={{ marginBottom: '15px' }}>
                            <label>독서 감상문</label>
                            <textarea
                                className="input-field"
                                style={{ height: '120px', marginTop: '5px', resize: 'none' }}
                                value={newBook.review_content}
                                onChange={(e) => setNewBook({ ...newBook, review_content: e.target.value })}
                                placeholder="책을 읽고 느낀 점을 적어주세요."
                                required
                            ></textarea>
                            <div style={{ textAlign: 'right', fontSize: '0.8rem', color: '#666', marginTop: '5px' }}>
                                {newBook.review_content.length}자
                            </div>
                        </div>

                        <div style={{ marginBottom: '20px' }}>
                            <label style={{ display: 'block', marginBottom: '10px' }}>누구에게 추천하고 싶나요?</label>
                            <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
                                {users.map(u => {
                                    const isSelected = newBook.recommend_to.includes(u.name);
                                    return (
                                        <button
                                            key={u.id}
                                            type="button"
                                            onClick={() => {
                                                const current = newBook.recommend_to ? newBook.recommend_to.split(',').map((s: string) => s.trim()).filter(Boolean) : [];
                                                let next;
                                                if (isSelected) {
                                                    next = current.filter((n: string) => n !== u.name);
                                                } else {
                                                    next = [...current, u.name];
                                                }
                                                setNewBook({ ...newBook, recommend_to: next.join(', ') });
                                            }}
                                            style={{
                                                padding: '8px 16px',
                                                borderRadius: '20px',
                                                border: 'none',
                                                background: isSelected ? 'var(--primary)' : '#e0e0e0',
                                                color: isSelected ? 'white' : '#333',
                                                cursor: 'pointer',
                                                transition: 'all 0.2s',
                                                fontWeight: isSelected ? '600' : 'normal',
                                                display: 'flex',
                                                alignItems: 'center',
                                                gap: '5px'
                                            }}
                                        >
                                            {isSelected && <UserPlus size={14} />}
                                            {u.name}
                                        </button>
                                    );
                                })}
                            </div>
                        </div>
                        <div style={{ display: 'flex', gap: '10px', marginTop: '20px' }}>
                            <button type="button" className="btn" onClick={() => setShowAddCard(false)} style={{ flex: 1 }}>취소</button>
                            <button type="submit" className="btn btn-primary" style={{ flex: 2 }}>기록 저장하기</button>
                        </div>
                    </form>
                </div>
            )}

            <div style={{ marginTop: '40px' }}>
                <h3>내가 기록한 책들</h3>
                <div className="grid-family" style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))' }}>
                    {books.map(book => (
                        <div
                            key={book.id}
                            className="glass-card book-card"
                            style={{ padding: '20px', position: 'relative', cursor: 'pointer', display: 'flex', gap: '15px' }}
                            onClick={() => handleEditBook(book)}
                        >
                            <button
                                onClick={(e) => { e.stopPropagation(); deleteBook(book.id); }}
                                style={{ position: 'absolute', top: '10px', right: '10px', background: 'none', border: 'none', cursor: 'pointer', color: '#ff7675', zIndex: 10 }}
                            >
                                <Trash2 size={18} />
                            </button>

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
                                <h4 style={{ color: 'var(--primary)', marginBottom: '5px', fontSize: '1.1rem', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', paddingRight: '20px' }}>
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
        </div>
    );
};

export default MainDashboard;
