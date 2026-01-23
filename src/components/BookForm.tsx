import React from 'react';
import { Star, AlertCircle, BookOpen, Trash2, UserPlus } from 'lucide-react';

interface BookFormProps {
    isEditing: boolean;
    book: any;
    setBook: (book: any) => void;
    users: any[];
    isAutoFilling: boolean;
    aiError: string | null;
    onCancel: () => void;
    onSubmit: (e: React.FormEvent) => void;
    onAutoFill: () => void;
    onSearchCover: () => void;
}

/**
 * 도서 등록 및 수정 폼 컴포넌트
 * MainDashboard에서 비대해진 폼 로직을 별도 컴포넌트로 분리했습니다.
 */
const BookForm: React.FC<BookFormProps> = ({
    isEditing,
    book,
    setBook,
    users,
    isAutoFilling,
    aiError,
    onCancel,
    onSubmit,
    onAutoFill,
    onSearchCover
}) => {
    return (
        <div className="glass-card" style={{ marginBottom: '30px' }}>
            {/* 헤더 섹션: 수정인지 신규 등록인지 표시 */}
            <h3 style={{ fontSize: '1.5rem', marginBottom: '20px', color: 'var(--primary)' }}>
                {isEditing ? '📖 책 정보 수정하기' : '✨ 새로운 책 등록하기'}
            </h3>

            <form onSubmit={onSubmit}>
                {/* 1단계: 자동 완성 섹션 (링크로 정보 가져오기) */}
                <div style={{ marginBottom: '20px', padding: '15px', background: 'rgba(99, 102, 241, 0.05)', borderRadius: '12px' }}>
                    <label style={{ fontWeight: '600', display: 'block', marginBottom: '8px' }}>자동 완성 (선택)</label>
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '10px' }}>
                        <div style={{ flex: 1, minWidth: '200px' }}>
                            <input
                                type="text"
                                className="input-field"
                                placeholder="도서 링크 입력 (예: 예스24, 알라딘 URL)"
                                value={book.link}
                                onChange={e => setBook({ ...book, link: e.target.value })}
                            />
                        </div>
                        <button
                            type="button"
                            className="btn btn-primary"
                            onClick={onAutoFill}
                            disabled={isAutoFilling || !book.link}
                        >
                            {isAutoFilling ? '분석 중...' : 'AI로 정보 추출'}
                        </button>
                    </div>
                    <p style={{ fontSize: '0.8rem', color: '#666', marginTop: '8px' }}>
                        * 도서 상세 페이지 링크를 입력하면 제목, 저자, 출판사, 표지를 AI가 자동으로 채워줍니다.
                    </p>
                </div>

                {/* 에러 메시지 표시 */}
                {aiError && (
                    <div style={{ marginBottom: '15px', padding: '12px', background: '#fff5f5', color: '#e53e3e', borderRadius: '8px', fontSize: '0.9rem', display: 'flex', alignItems: 'center', gap: '8px', border: '1px solid #fed7d7' }}>
                        <AlertCircle size={18} /> {aiError}
                    </div>
                )}

                {/* 2단계: 필수 도서 정보 입력 */}
                <div className="form-row" style={{ display: 'flex', gap: '20px', flexWrap: 'wrap-reverse' }}>
                    <div style={{ flex: 1, minWidth: '300px' }}>
                        {/* 제목 및 검색 버튼 */}
                        <div style={{ marginBottom: '15px' }}>
                            <label style={{ fontWeight: '600', display: 'block', marginBottom: '5px' }}>도서 제목 *</label>
                            <div style={{ display: 'flex', gap: '10px' }}>
                                <input
                                    type="text"
                                    className="input-field"
                                    placeholder="책 제목을 입력하세요"
                                    value={book.title}
                                    onChange={(e) => setBook({ ...book, title: e.target.value })}
                                    onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); onSearchCover(); } }}
                                    required
                                    style={{ flex: 1 }}
                                />
                                <button type="button" className="btn btn-secondary" onClick={onSearchCover} disabled={isAutoFilling || !book.title}>
                                    검색
                                </button>
                            </div>
                        </div>

                        {/* 작가 및 출판사 */}
                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '15px', marginBottom: '15px' }}>
                            <div>
                                <label style={{ fontWeight: '600', display: 'block', marginBottom: '5px' }}>작가</label>
                                <input
                                    type="text"
                                    className="input-field"
                                    placeholder="작가 이름"
                                    value={book.author}
                                    onChange={(e) => setBook({ ...book, author: e.target.value })}
                                />
                            </div>
                            <div>
                                <label style={{ fontWeight: '600', display: 'block', marginBottom: '5px' }}>출판사</label>
                                <input
                                    type="text"
                                    className="input-field"
                                    placeholder="출판사 명"
                                    value={book.publisher}
                                    onChange={(e) => setBook({ ...book, publisher: e.target.value })}
                                />
                            </div>
                        </div>

                        {/* 날짜 및 평점 */}
                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '15px' }}>
                            <div>
                                <label style={{ fontWeight: '600', display: 'block', marginBottom: '5px' }}>읽은 날짜</label>
                                <input
                                    type="date"
                                    className="input-field"
                                    value={book.read_date}
                                    onChange={e => setBook({ ...book, read_date: e.target.value })}
                                    required
                                />
                            </div>
                            <div>
                                <label style={{ fontWeight: '600', display: 'block', marginBottom: '5px' }}>나의 평점</label>
                                <div style={{ display: 'flex', gap: '5px', marginTop: '8px' }}>
                                    {[1, 2, 3, 4, 5].map(s => (
                                        <Star
                                            key={s}
                                            size={28}
                                            fill={s <= book.rating ? "#FFD700" : "none"}
                                            stroke="#FFD700"
                                            onClick={() => setBook({ ...book, rating: s })}
                                            style={{ cursor: 'pointer', transition: 'transform 0.1s' }}
                                            className="star-icon"
                                        />
                                    ))}
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* 표지 미리보기 섹션 */}
                    <div className="cover-preview-container" style={{ width: '180px', flexShrink: 0, margin: '0 auto' }}>
                        <label style={{ fontWeight: '600', display: 'block', marginBottom: '5px', textAlign: 'center' }}>도서 표지</label>
                        <div
                            style={{
                                width: '100%',
                                aspectRatio: '1 / 1.4',
                                backgroundColor: '#fdfdfd',
                                borderRadius: '12px',
                                border: '2px dashed #e2e8f0',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                overflow: 'hidden',
                                color: '#94a3b8',
                                flexDirection: 'column',
                                textAlign: 'center',
                                fontSize: '0.85rem',
                                position: 'relative',
                                cursor: 'pointer',
                                transition: 'all 0.2s'
                            }}
                            onClick={() => {
                                if (!book.cover_url) {
                                    const url = prompt("이미지 주소(URL)를 입력하세요:");
                                    if (url) setBook({ ...book, cover_url: url });
                                }
                            }}
                        >
                            {book.cover_url ? (
                                <>
                                    <img src={book.cover_url} alt="표지 미리보기" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                                    <div
                                        style={{ position: 'absolute', top: 8, right: 8, background: 'rgba(255,255,255,0.9)', padding: '6px', borderRadius: '50%', boxShadow: '0 2px 4px rgba(0,0,0,0.1)' }}
                                        onClick={(e) => { e.stopPropagation(); setBook({ ...book, cover_url: '' }); }}
                                    >
                                        <Trash2 size={16} color="#e53e3e" />
                                    </div>
                                </>
                            ) : (
                                <>
                                    <BookOpen size={40} style={{ marginBottom: '10px', opacity: 0.3 }} />
                                    <span>이미지 링크를<br />입력해주세요</span>
                                </>
                            )}
                        </div>
                    </div>
                </div>

                {/* 3단계: 감상문 작성 */}
                <div style={{ marginTop: '25px', marginBottom: '20px' }}>
                    <label style={{ fontWeight: '600', display: 'block', marginBottom: '8px' }}>나의 감상 (독서록) *</label>
                    <textarea
                        className="input-field"
                        style={{ height: '150px', marginTop: '5px', resize: 'none', lineHeight: '1.6', padding: '15px' }}
                        value={book.review_content}
                        onChange={(e) => setBook({ ...book, review_content: e.target.value })}
                        placeholder="이 책을 읽고 어떤 생각을 했나요? 느낀 점을 자유롭게 적어보세요. (글이 길수록 AI 분석이 정확해져요!)"
                        required
                    ></textarea>
                    <div style={{ textAlign: 'right', fontSize: '0.85rem', color: '#94a3b8', marginTop: '8px' }}>
                        현재 <strong>{book.review_content.length}</strong>자 작성 중
                    </div>
                </div>

                {/* 4단계: 추천하기 */}
                <div style={{ marginBottom: '30px' }}>
                    <label style={{ fontWeight: '600', display: 'block', marginBottom: '12px' }}>누구에게 추천하고 싶나요? (중복 선택 가능)</label>
                    <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
                        {users.map(u => {
                            const isSelected = book.recommend_to.split(',').map((s: string) => s.trim()).includes(u.name);
                            return (
                                <button
                                    key={u.id}
                                    type="button"
                                    onClick={() => {
                                        const current = book.recommend_to ? book.recommend_to.split(',').map((s: string) => s.trim()).filter(Boolean) : [];
                                        let next;
                                        if (isSelected) {
                                            next = current.filter((n: string) => n !== u.name);
                                        } else {
                                            next = [...current, u.name];
                                        }
                                        setBook({ ...book, recommend_to: next.join(', ') });
                                    }}
                                    style={{
                                        padding: '10px 18px',
                                        borderRadius: '25px',
                                        border: isSelected ? '2px solid var(--primary)' : '2px solid #edeff2',
                                        background: isSelected ? 'rgba(99, 102, 241, 0.1)' : 'white',
                                        color: isSelected ? 'var(--primary)' : '#64748b',
                                        cursor: 'pointer',
                                        transition: 'all 0.2s',
                                        fontWeight: '600',
                                        display: 'flex',
                                        alignItems: 'center',
                                        gap: '6px'
                                    }}
                                >
                                    {isSelected ? <UserPlus size={16} /> : <div style={{ width: 16 }} />}
                                    {u.name}
                                </button>
                            );
                        })}
                    </div>
                </div>

                {/* 하단 버튼 섹션 */}
                <div style={{ display: 'flex', gap: '12px', borderTop: '1px solid #edf2f7', paddingTop: '25px' }}>
                    <button
                        type="button"
                        className="btn"
                        onClick={onCancel}
                        style={{ flex: 1, padding: '14px', borderRadius: '12px', fontWeight: 'bold', background: '#f7fafc', color: '#4a5568' }}
                    >
                        취소하기
                    </button>
                    <button
                        type="submit"
                        className="btn btn-primary"
                        style={{ flex: 2, padding: '14px', borderRadius: '12px', fontWeight: 'bold', fontSize: '1.1rem', boxShadow: '0 4px 6px rgba(99, 102, 241, 0.2)' }}
                    >
                        {isEditing ? '수정 내용 저장' : '독서 기록 저장하기'}
                    </button>
                </div>
            </form>
        </div>
    );
};

export default BookForm;
