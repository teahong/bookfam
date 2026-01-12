import React, { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { ArrowLeft, BookOpen, Lock, Activity, Sparkles, TrendingUp, BarChart2 } from 'lucide-react';
import { analyzeReadingPatterns } from '../lib/gemini';

interface AdminPageProps {
    onBack: () => void;
}

const AdminPage: React.FC<AdminPageProps> = ({ onBack }) => {
    const [books, setBooks] = useState<any[]>([]);
    const [users, setUsers] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);

    // AI Analysis State
    const [selectedUser, setSelectedUser] = useState<string>('');
    const [analysisResult, setAnalysisResult] = useState<any>(null);
    const [isAnalyzing, setIsAnalyzing] = useState(false);
    const [statsType, setStatsType] = useState<'count' | 'length'>('count');

    useEffect(() => {
        fetchData();
    }, []);

    const fetchData = async () => {
        setLoading(true);
        // Fetch all books
        const { data: booksData } = await supabase.from('books').select('*');
        if (booksData) setBooks(booksData);

        // Fetch users
        const { data: usersData } = await supabase.from('users').select('id, name');
        if (usersData) {
            setUsers(usersData);
            if (usersData.length > 0) setSelectedUser(usersData[0].name);
        }
        setLoading(false);
    };

    // Derived Statistics
    // Derived Statistics
    const totalBooks = books.length;
    const totalLength = books.reduce((acc, book) => acc + (book.review_content ? book.review_content.length : 0), 0);

    const booksByUser = users.map(u => {
        const userBooks = books.filter(b => b.user_id === u.name);
        return {
            name: u.name,
            count: userBooks.length,
            length: userBooks.reduce((acc, b) => acc + (b.review_content ? b.review_content.length : 0), 0)
        };
    }).sort((a, b) => statsType === 'count' ? b.count - a.count : b.length - a.length);

    const readingKing = booksByUser.length > 0 ? booksByUser[0] : null;

    const handleAnalyze = async () => {
        if (!selectedUser) return;
        setIsAnalyzing(true);
        setAnalysisResult(null);

        // 1. Fetch user's reviews
        const userBooks = books.filter(b => b.user_id === selectedUser && b.review_content && b.review_content.length > 10);
        const reviews = userBooks.map(b => b.review_content);

        if (reviews.length === 0) {
            setAnalysisResult({ error: '분석할 독서록 데이터가 충분하지 않습니다.' });
            setIsAnalyzing(false);
            return;
        }

        // 2. Call Gemini
        const result = await analyzeReadingPatterns(selectedUser, reviews);
        if (result) {
            setAnalysisResult(result);
        } else {
            setAnalysisResult({ error: 'AI 분석 중 오류가 발생했습니다.' });
        }
        setIsAnalyzing(false);
    };

    return (
        <div className="dashboard-container" style={{ animation: 'fadeIn 0.5s' }}>
            {/* Header */}
            <header style={{ display: 'flex', alignItems: 'center', marginBottom: '40px', gap: '20px' }}>
                <button onClick={onBack} className="btn-icon" style={{ background: 'white', padding: '10px', borderRadius: '50%', border: '1px solid #eee', cursor: 'pointer', boxShadow: '0 2px 5px rgba(0,0,0,0.05)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <ArrowLeft size={24} color="#333" />
                </button>
                <div>
                    <h1 style={{ fontSize: '2rem', display: 'flex', alignItems: 'center', gap: '10px' }}>
                        <Lock color="var(--primary)" size={32} />
                        관리자 페이지
                    </h1>
                    <p>우리 가족의 독서 현황을 한눈에 확인하세요.</p>
                </div>
            </header>

            {loading ? <div style={{ textAlign: 'center', padding: '50px' }}>로딩 중...</div> : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '40px' }}>

                    {/* 1. Statistics Section */}
                    <section>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
                            <h2 style={{ fontSize: '1.5rem', display: 'flex', alignItems: 'center', gap: '10px' }}>
                                <BarChart2 /> 독서 통계
                            </h2>
                            {/* Toggle Switch */}
                            <div style={{ background: '#eee', padding: '5px', borderRadius: '20px', display: 'flex', gap: '5px' }}>
                                <button
                                    onClick={() => setStatsType('count')}
                                    style={{
                                        padding: '5px 15px', borderRadius: '15px', border: 'none', cursor: 'pointer',
                                        background: statsType === 'count' ? 'white' : 'transparent',
                                        boxShadow: statsType === 'count' ? '0 2px 5px rgba(0,0,0,0.1)' : 'none',
                                        fontWeight: statsType === 'count' ? 'bold' : 'normal'
                                    }}
                                >
                                    권수
                                </button>
                                <button
                                    onClick={() => setStatsType('length')}
                                    style={{
                                        padding: '5px 15px', borderRadius: '15px', border: 'none', cursor: 'pointer',
                                        background: statsType === 'length' ? 'white' : 'transparent',
                                        boxShadow: statsType === 'length' ? '0 2px 5px rgba(0,0,0,0.1)' : 'none',
                                        fontWeight: statsType === 'length' ? 'bold' : 'normal'
                                    }}
                                >
                                    글자 수
                                </button>
                            </div>
                        </div>

                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '20px' }}>
                            <div className="glass-card" style={{ textAlign: 'center', padding: '30px' }}>
                                <div style={{ fontSize: '0.9rem', color: '#666', marginBottom: '10px' }}>
                                    {statsType === 'count' ? '총 누적 독서량' : '총 누적 글자 수'}
                                </div>
                                <div style={{ fontSize: '3rem', fontWeight: 'bold', color: 'var(--primary)' }}>
                                    {statsType === 'count' ? `${totalBooks}권` : `${totalLength.toLocaleString()}자`}
                                </div>
                            </div>
                            <div className="glass-card" style={{ textAlign: 'center', padding: '30px' }}>
                                <div style={{ fontSize: '0.9rem', color: '#666', marginBottom: '10px' }}>이달의 독서왕</div>
                                <div style={{ fontSize: '2rem', fontWeight: 'bold', color: '#e67e22' }}>
                                    {readingKing ? readingKing.name : '-'}
                                    <span style={{ fontSize: '1rem', color: '#888', marginLeft: '5px' }}>
                                        ({statsType === 'count' ? `${readingKing?.count}권` : `${readingKing?.length.toLocaleString()}자`})
                                    </span>
                                </div>
                            </div>
                        </div>

                        {/* Chart / Bar Graph */}
                        <div className="glass-card" style={{ marginTop: '20px', padding: '30px' }}>
                            <h3 style={{ marginBottom: '20px' }}>가족별 독서 현황 ({statsType === 'count' ? '권수' : '글자 수'})</h3>
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
                                {booksByUser.map(user => {

                                    const val = statsType === 'count' ? user.count : user.length;


                                    // Better viz: relative to max individual value
                                    const maxIndividual = Math.max(...booksByUser.map(u => statsType === 'count' ? u.count : u.length));
                                    const barPercent = maxIndividual > 0 ? (val / maxIndividual) * 100 : 0;

                                    return (
                                        <div key={user.name} style={{ display: 'flex', alignItems: 'center', gap: '15px' }}>
                                            <div style={{ width: '60px', fontWeight: 'bold' }}>{user.name}</div>
                                            <div style={{ flex: 1, background: '#f0f0f0', borderRadius: '10px', height: '20px', overflow: 'hidden' }}>
                                                <div style={{
                                                    width: `${barPercent}%`,
                                                    background: 'var(--primary)',
                                                    height: '100%',
                                                    transition: 'width 1s ease-in-out',
                                                    minWidth: val > 0 ? '5px' : '0'
                                                }}></div>
                                            </div>
                                            <div style={{ width: '80px', textAlign: 'right' }}>
                                                {statsType === 'count' ? `${val}권` : `${val.toLocaleString()}자`}
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        </div>
                    </section>

                    {/* 2. AI Analysis Section */}
                    <section>
                        <h2 style={{ fontSize: '1.5rem', marginBottom: '20px', display: 'flex', alignItems: 'center', gap: '10px' }}>
                            <Sparkles color="#9b59b6" /> AI 독서 분석
                        </h2>

                        <div className="glass-card" style={{ padding: '30px' }}>
                            <div style={{ display: 'flex', gap: '10px', marginBottom: '30px', flexWrap: 'wrap' }}>
                                {users.map(u => (
                                    <button
                                        key={u.id}
                                        onClick={() => setSelectedUser(u.name)}
                                        className="btn"
                                        style={{
                                            background: selectedUser === u.name ? 'var(--primary)' : 'white',
                                            color: selectedUser === u.name ? 'white' : '#333',
                                            border: selectedUser === u.name ? 'none' : '1px solid #ddd'
                                        }}
                                    >
                                        {u.name}
                                    </button>
                                ))}
                            </div>

                            <button className="btn btn-primary" onClick={handleAnalyze} disabled={isAnalyzing} style={{ width: '100%', marginBottom: '30px' }}>
                                {isAnalyzing ? 'Gemini가 분석 중입니다...' : `${selectedUser}님의 독서 패턴 분석하기`}
                            </button>

                            {analysisResult && (
                                <div style={{ display: 'grid', gap: '20px', animation: 'fadeIn 0.5s' }}>
                                    {analysisResult.error ? (
                                        <div style={{ padding: '20px', background: '#ffebee', color: '#c62828', borderRadius: '10px' }}>
                                            {analysisResult.error}
                                        </div>
                                    ) : (
                                        <>
                                            <div style={{ background: '#e3f2fd', padding: '20px', borderRadius: '15px', borderLeft: '5px solid #2196f3' }}>
                                                <h4 style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '10px', color: '#1565c0' }}>
                                                    <Activity size={20} /> 글쓰기 수준
                                                </h4>
                                                <p style={{ fontSize: '1.1rem', margin: 0 }}>{analysisResult.level}</p>
                                            </div>

                                            <div style={{ background: '#f3e5f5', padding: '20px', borderRadius: '15px', borderLeft: '5px solid #9c27b0' }}>
                                                <h4 style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '10px', color: '#7b1fa2' }}>
                                                    <TrendingUp size={20} /> 관심 분야
                                                </h4>
                                                <p style={{ fontSize: '1.1rem', margin: 0 }}>{analysisResult.interest}</p>
                                            </div>

                                            <div style={{ background: '#e8f5e9', padding: '20px', borderRadius: '15px', borderLeft: '5px solid #4caf50' }}>
                                                <h4 style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '10px', color: '#2e7d32' }}>
                                                    <BookOpen size={20} /> 맞춤 도서 추천
                                                </h4>
                                                <p style={{ fontSize: '1.1rem', margin: 0 }}>{analysisResult.recommendation}</p>
                                            </div>
                                        </>
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
