import React, { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { ArrowLeft, BookOpen, Lock, Activity, Sparkles, TrendingUp, BarChart2, ExternalLink, Share2 } from 'lucide-react';
import { analyzeReadingPatterns } from '../lib/gemini';

interface AdminPageProps {
    onBack: () => void;
}

/**
 * 관리자 페이지 컴포넌트
 * 가족 구성원 전체의 독서 통계를 확인하고, AI 분석을 통해 맞춤 리포트를 생성합니다.
 */
const AdminPage: React.FC<AdminPageProps> = ({ onBack }) => {
    const [books, setBooks] = useState<any[]>([]);          // 전체 도서 데이터
    const [users, setUsers] = useState<any[]>([]);          // 가족 유저 목록
    const [loading, setLoading] = useState(true);           // 초기 로딩 상태

    // AI 분석 관련 상태
    const [selectedUser, setSelectedUser] = useState<string>(''); // 분석 대상 유저 이름
    const [analysisResult, setAnalysisResult] = useState<any>(null); // 분석 결과 데이터
    const [isAnalyzing, setIsAnalyzing] = useState(false);        // AI 분석 중 로딩 상태
    const [statsType, setStatsType] = useState<'count' | 'length'>('count'); // 통계 기준 (권수 vs 글자수)

    // 컴포넌트 마운트 시 데이터 fetch
    useEffect(() => {
        fetchData();
    }, []);

    // 선택된 유저가 바뀔 때마다 기존에 저장된 AI 분석 결과가 있는지 가져옴
    useEffect(() => {
        if (selectedUser && users.length > 0) {
            fetchAIAnalysis();
        }
    }, [selectedUser, users]);

    /**
     * DB에서 전체 도서 정보와 유저 정보를 동시에 가져옵니다.
     */
    const fetchData = async () => {
        setLoading(true);
        // 전체 도서 목록 조회
        const { data: booksData } = await supabase.from('books').select('*');
        if (booksData) setBooks(booksData);

        // 연령 정보를 포함한 유저 목록 조회
        const { data: usersData } = await supabase.from('users').select('id, name, age');
        if (usersData) {
            setUsers(usersData);
            // 첫 번째 유저를 기본 선택값으로 설정
            if (usersData.length > 0) setSelectedUser(usersData[0].name);
        }
        setLoading(false);
    };

    /**
     * 특정 유저에 대해 과거에 수행한 AI 분석 결과가 있다면 가져옵니다.
     */
    const fetchAIAnalysis = async () => {
        const targetUser = users.find(u => u.name === selectedUser);
        if (!targetUser) return;

        const { data, error } = await supabase
            .from('ai_analysis')
            .select('*')
            .eq('user_id', targetUser.id)
            .single();

        if (data && !error) {
            setAnalysisResult({
                level: data.level,
                interest: data.interest,
                recommendations: data.recommendations
            });
        } else {
            setAnalysisResult(null); // 기록이 없으면 null 설정
        }
    };

    // --- 통계 계산 로직 ---
    const totalBooks = books.length;
    const totalLength = books.reduce((acc, book) => acc + (book.review_content ? book.review_content.length : 0), 0);

    // 가족별 독서 데이터 집계
    const booksByUser = users.map(u => {
        // 이름이나 ID로 매칭 (데이터 무결성 고려)
        const userBooks = books.filter(b =>
            (b.user_id?.trim() === u.name?.trim()) || (b.user_id?.trim() === u.id?.trim())
        );
        return {
            name: u.name,
            id: u.id,
            count: userBooks.length,
            length: userBooks.reduce((acc, b) => acc + (b.review_content ? b.review_content.length : 0), 0)
        };
    }).sort((a, b) => statsType === 'count' ? b.count - a.count : b.length - a.length);

    // 독서량 1위 유저 (독서왕)
    const readingKing = booksByUser.length > 0 ? booksByUser[0] : null;

    /**
     * 관리자 페이지에서 유저의 연령 정보를 직접 수정합니다.
     */
    const updateAge = async (userId: string, age: string) => {
        const val = parseInt(age);
        if (isNaN(val)) return;

        const { error } = await supabase
            .from('users')
            .update({ age: val })
            .eq('id', userId);

        if (!error) {
            setUsers(users.map(u => u.id === userId ? { ...u, age: val } : u));
        }
    };

    /**
     * Gemini AI를 호출하여 선택된 유저의 독서 패턴을 심층 분석합니다.
     */
    const handleAnalyze = async () => {
        if (!selectedUser) return;
        setIsAnalyzing(true);

        const targetUser = users.find(u => u.name === selectedUser);
        if (!targetUser) return;

        // 10글자 이상의 유효한 독서 감상문만 추출하여 분석에 사용
        const userBooks = books.filter(b =>
            ((b.user_id?.trim() === selectedUser?.trim()) || (b.user_id?.trim() === targetUser.id?.trim())) &&
            b.review_content && b.review_content.trim().length >= 10
        );

        const reviews = userBooks.map(b => b.review_content);

        // 분석할 데이터가 부족한 경우
        if (reviews.length === 0) {
            setAnalysisResult({ error: `${selectedUser}님의 독서록 중 10글자 이상의 유효한 데이터가 부족합니다.` });
            setIsAnalyzing(false);
            return;
        }

        // Gemini AI 호출 (lib/gemini.ts의 RAG 로직 실행)
        const result = await analyzeReadingPatterns(selectedUser, reviews, targetUser?.age);

        if (result && !(result as any).error) {
            setAnalysisResult(result);

            // 분석 결과를 DB에 저장(upsert)하여 나중에 바로 보여줄 수 있게 함
            await supabase
                .from('ai_analysis')
                .upsert({
                    user_id: targetUser.id,
                    level: (result as any).level,
                    interest: (result as any).interest,
                    recommendations: (result as any).recommendations,
                    updated_at: new Date().toISOString()
                }, { onConflict: 'user_id' });
        } else {
            setAnalysisResult({ error: 'AI 분석 수행 중 오류가 발생했습니다. 잠시 후 다시 시도해주세요.' });
        }
        setIsAnalyzing(false);
    };

    /**
     * 공유 페이지로 이동
     */
    const handleOpenSharePage = () => {
        if (!selectedUser) return;
        // StandaloneReportPage로 이동 (새 탭) 또는 현재 창 이동
        // 앱 내 라우팅을 위해 URL을 변경하고 리로딩 없이 App.tsx가 감지하게 하거나, 
        // 간단히 href 변경으로 처리. 여기서는 새 탭 열기로 '공유용 화면' 느낌을 줌.
        const shareUrl = `${window.location.origin}${window.location.pathname}?mode=report&user=${encodeURIComponent(selectedUser)}`;
        window.open(shareUrl, '_blank');
    };

    return (
        <div className="dashboard-container" style={{ animation: 'fadeIn 0.5s' }}>
            {/* 상단 헤더: 뒤로가기 및 제목 */}
            <header style={{ display: 'flex', alignItems: 'center', marginBottom: '40px', gap: '20px', flexWrap: 'wrap' }}>
                <button onClick={onBack} className="btn-icon no-print" style={{ background: 'white', padding: '10px', borderRadius: '50%', border: '1px solid #eee', cursor: 'pointer', boxShadow: '0 2px 5px rgba(0,0,0,0.05)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <ArrowLeft size={24} color="#333" />
                </button>
                <div>
                    <h1 style={{ fontSize: 'min(2rem, 6vw)', display: 'flex', alignItems: 'center', gap: '10px' }}>
                        <Lock color="var(--primary)" size={28} /> 관리자 리포트
                    </h1>
                    <p style={{ color: '#666' }}>우리 가족의 독서 성장을 한눈에 관리하세요.</p>
                </div>
            </header>

            {loading ? (
                <div style={{ textAlign: 'center', padding: '50px', fontSize: '1.2rem', color: 'var(--primary)' }}>가족 데이터를 불러오는 중...</div>
            ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '40px' }}>

                    {/* 1. 통계 요약 섹션 */}
                    <section>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
                            <h2 style={{ fontSize: '1.5rem', display: 'flex', alignItems: 'center', gap: '10px' }}>
                                <BarChart2 /> 독서 통계
                            </h2>
                            {/* 통계 기준 전환 (권수 / 글자수) */}
                            <div style={{ background: '#f1f5f9', padding: '4px', borderRadius: '25px', display: 'flex', gap: '4px' }}>
                                {(['count', 'length'] as const).map(type => (
                                    <button
                                        key={type}
                                        onClick={() => setStatsType(type)}
                                        style={{
                                            padding: '6px 16px', borderRadius: '20px', border: 'none', cursor: 'pointer',
                                            background: statsType === type ? 'white' : 'transparent',
                                            boxShadow: statsType === type ? '0 2px 4px rgba(0,0,0,0.1)' : 'none',
                                            fontWeight: '600', color: statsType === type ? 'var(--primary)' : '#64748b',
                                            transition: 'all 0.2s'
                                        }}
                                    >
                                        {type === 'count' ? '기록 권수' : '리뷰 글자수'}
                                    </button>
                                ))}
                            </div>
                        </div>

                        {/* 요약 카드 */}
                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '20px' }}>
                            <div className="glass-card" style={{ textAlign: 'center', padding: '25px' }}>
                                <div style={{ fontSize: '0.9rem', color: '#64748b', marginBottom: '10px' }}>전체 누적 기록</div>
                                <div style={{ fontSize: 'min(2.5rem, 8vw)', fontWeight: '800', color: 'var(--primary)', lineHeight: 1.2 }}>
                                    {statsType === 'count' ? `${totalBooks}권` : `${totalLength.toLocaleString()}자`}
                                </div>
                            </div>
                            <div className="glass-card" style={{ textAlign: 'center', padding: '25px', border: '1px solid #ffedd5' }}>
                                <div style={{ fontSize: '0.9rem', color: '#64748b', marginBottom: '10px' }}>🏅 최다 독서왕</div>
                                <div style={{ fontSize: 'min(2rem, 7vw)', fontWeight: '800', color: '#ea580c', lineHeight: 1.2 }}>
                                    {readingKing ? readingKing.name : '-'}
                                    <div style={{ fontSize: '1rem', color: '#94a3b8', fontWeight: '500', marginTop: '5px' }}>
                                        {statsType === 'count' ? `${readingKing?.count}권 완료` : `${readingKing?.length.toLocaleString()}자 작성`}
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* 그래프 영역 */}
                        <div className="glass-card" style={{ marginTop: '20px', padding: '30px' }}>
                            <h3 style={{ marginBottom: '25px', fontSize: '1.2rem', fontWeight: '700' }}>가족 구성원별 활동량</h3>
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
                                {booksByUser.map(user => {
                                    const val = statsType === 'count' ? user.count : user.length;
                                    const maxVal = Math.max(...booksByUser.map(u => statsType === 'count' ? u.count : u.length));
                                    const percent = maxVal > 0 ? (val / maxVal) * 100 : 0;
                                    return (
                                        <div key={user.name}>
                                            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px', fontSize: '0.95rem' }}>
                                                <span style={{ fontWeight: '600' }}>{user.name}</span>
                                                <span style={{ color: '#64748b' }}>{val.toLocaleString()}{statsType === 'count' ? '권' : '자'}</span>
                                            </div>
                                            <div style={{ height: '12px', background: '#f1f5f9', borderRadius: '6px', overflow: 'hidden' }}>
                                                <div style={{ width: `${percent}%`, height: '100%', background: 'var(--primary)', transition: 'width 0.8s ease-out' }}></div>
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        </div>
                    </section>

                    {/* 2. AI 독서 분석 섹션 */}
                    <section>
                        <h2 style={{ fontSize: '1.5rem', marginBottom: '20px', display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap', justifyContent: 'space-between' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                                <Sparkles color="#8b5cf6" /> AI 심층 독서 분석 리포트
                            </div>
                            {analysisResult && !(analysisResult as any).error && (
                                <div className="no-print" style={{ display: 'flex', gap: '8px' }}>
                                    <button onClick={handleOpenSharePage} className="btn-icon" title="공유 페이지 열기" style={{ background: 'var(--primary)', border: 'none', padding: '8px 16px', borderRadius: '8px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.95rem', color: 'white', fontWeight: 'bold', boxShadow: '0 2px 4px rgba(0,0,0,0.1)' }}>
                                        <Share2 size={16} /> <span>공유 / 인쇄</span>
                                    </button>
                                </div>
                            )}
                        </h2>

                        <div className="glass-card print-target" style={{ padding: '30px' }}>
                            <p style={{ marginBottom: '20px', color: '#64748b' }}>분석 대상 유저를 선택하고 AI 리포트를 생성하세요. (연령 정보를 입력하면 더 정확한 추천이 가능합니다.)</p>

                            {/* 유저 선택 및 연령 수정 UI (인쇄 시 숨김) */}
                            <div className="no-print" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(110px, 1fr))', gap: '15px', marginBottom: '30px' }}>
                                {users.map(u => (
                                    <div
                                        key={u.id}
                                        style={{
                                            padding: '20px', borderRadius: '15px', cursor: 'pointer', transition: 'all 0.2s',
                                            background: selectedUser === u.name ? 'rgba(99, 102, 241, 0.05)' : 'white',
                                            border: selectedUser === u.name ? '2px solid var(--primary)' : '1px solid #e2e8f0',
                                            boxShadow: selectedUser === u.name ? '0 4px 12px rgba(99, 102, 241, 0.1)' : 'none'
                                        }}
                                        onClick={() => setSelectedUser(u.name)}
                                    >
                                        <div style={{ fontWeight: '700', fontSize: '1.2rem', marginBottom: '8px', color: selectedUser === u.name ? 'var(--primary)' : '#1e293b' }}>{u.name}</div>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: '4px', fontSize: '0.9rem' }}>
                                            <span style={{ color: '#94a3b8' }}>연령:</span>
                                            <input
                                                type="number"
                                                defaultValue={u.age || ''}
                                                onBlur={(e) => updateAge(u.id, e.target.value)}
                                                style={{ width: '45px', border: 'none', borderBottom: '1px solid #cbd5e1', padding: '2px', textAlign: 'center', fontWeight: '600' }}
                                                onClick={(e) => e.stopPropagation()}
                                            />
                                            <span style={{ fontWeight: '600' }}>세</span>
                                        </div>
                                    </div>
                                ))}
                            </div>

                            <button className="btn btn-primary no-print" onClick={handleAnalyze} disabled={isAnalyzing} style={{ width: '100%', padding: '16px', fontSize: '1.1rem', fontWeight: 'bold' }}>
                                {isAnalyzing ? '✨ Gemini AI가 데이터를 분석하고 있습니다...' : `${selectedUser}님을 위한 AI 추천 리포트 생성`}
                            </button>

                            {/* 분석 결과 표시 */}
                            {analysisResult && (
                                <div style={{ marginTop: '30px', borderTop: '1px solid #f1f5f9', paddingTop: '30px', animation: 'fadeInUp 0.6s' }}>
                                    {(analysisResult as any).error ? (
                                        <div style={{ padding: '20px', background: '#fff5f5', color: '#c53030', borderRadius: '12px', border: '1px solid #fed7d7' }}>
                                            {(analysisResult as any).error}
                                        </div>
                                    ) : (
                                        <div style={{ display: 'grid', gap: '25px' }}>
                                            <div style={{ background: '#f0f9ff', padding: '20px', borderRadius: '15px', borderLeft: '5px solid #0ea5e9' }}>
                                                <h4 style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '12px', color: '#0369a1', fontWeight: '700' }}>
                                                    <Activity size={20} /> 읽기/쓰기 수준 진단
                                                </h4>
                                                <p style={{ margin: 0, lineHeight: '1.7', color: '#0c4a6e' }}>{analysisResult.level}</p>
                                            </div>

                                            <div style={{ background: '#fdf4ff', padding: '20px', borderRadius: '15px', borderLeft: '5px solid #d946ef' }}>
                                                <h4 style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '12px', color: '#a21caf', fontWeight: '700' }}>
                                                    <TrendingUp size={20} /> 관심 분야 및 독서 성향
                                                </h4>
                                                <p style={{ margin: 0, lineHeight: '1.7', color: '#701a75' }}>{analysisResult.interest}</p>
                                            </div>

                                            <div style={{ background: '#f0fdf4', padding: '20px', borderRadius: '15px', borderLeft: '5px solid #22c55e' }}>
                                                <h4 style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '20px', color: '#15803d', fontWeight: '700' }}>
                                                    <BookOpen size={20} /> 실시간 추천 도서 (TOP 10)
                                                </h4>
                                                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(270px, 1fr))', gap: '20px' }}>
                                                    {Array.isArray(analysisResult.recommendations) && analysisResult.recommendations.map((book: any, idx: number) => (
                                                        <div key={idx} className="glass-card" style={{ display: 'flex', gap: '15px', border: '1px solid #dcfce7', padding: '15px', transition: 'transform 0.2s' }}>
                                                            {book.cover_url && (
                                                                <div style={{ flexShrink: 0, width: '85px', height: '120px', borderRadius: '8px', overflow: 'hidden', boxShadow: '0 4px 6px rgba(0,0,0,0.1)' }}>
                                                                    <img src={book.cover_url} alt={book.title} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                                                                </div>
                                                            )}
                                                            <div style={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column' }}>
                                                                <div style={{ fontWeight: '700', fontSize: '1rem', color: '#166534', marginBottom: '4px', lineHeight: '1.3' }}>{book.title}</div>
                                                                <div style={{ fontSize: '0.85rem', color: '#64748b', marginBottom: '8px' }}>{book.author} ({book.rank}점)</div>
                                                                <p style={{ fontSize: '0.9rem', color: '#374151', margin: '0 0 10px 0', lineHeight: '1.5', flex: 1 }}>{book.reason}</p>

                                                                {book.link && (
                                                                    <a
                                                                        href={book.link}
                                                                        target="_blank"
                                                                        rel="noopener noreferrer"
                                                                        className="no-print"
                                                                        style={{
                                                                            display: 'inline-flex', alignItems: 'center', gap: '5px',
                                                                            background: '#ecfccb', color: '#4d7c0f',
                                                                            padding: '6px 12px', borderRadius: '8px',
                                                                            textDecoration: 'none', fontSize: '0.85rem', fontWeight: 'bold',
                                                                            alignSelf: 'flex-start', border: '1px solid #bef264',
                                                                            marginTop: 'auto'
                                                                        }}
                                                                    >
                                                                        <ExternalLink size={14} /> 알라딘에서 보기
                                                                    </a>
                                                                )}
                                                            </div>
                                                        </div>
                                                    ))}
                                                </div>
                                            </div>
                                        </div>
                                    )}
                                </div>
                            )}
                        </div>
                    </section>
                </div>
            )}
        </div>
    );
};

export default AdminPage;
