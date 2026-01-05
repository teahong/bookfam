import React, { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { Book, Type, ArrowLeft, Medal, Trophy } from 'lucide-react';

interface ChallengePageProps {
    onBack: () => void;
}

const ChallengePage: React.FC<ChallengePageProps> = ({ onBack }) => {
    const [stats, setStats] = useState<any[]>([]);
    const [viewType, setViewType] = useState<'count' | 'words'>('count');
    const [animate, setAnimate] = useState(false);

    // Color mapping for family members
    const memberColors: { [key: string]: string } = {
        '아빠': '#4a90e2', // Blue
        '엄마': '#e91e63', // Pink
        '찬민': '#2ecc71', // Green
        '재민': '#f39c12'  // Orange
    };

    useEffect(() => {
        fetchStats();
        // Trigger animation after mount
        const timer = setTimeout(() => setAnimate(true), 100);
        return () => clearTimeout(timer);
    }, []);

    const fetchStats = async () => {
        const { data: books } = await supabase.from('books').select('user_id, review_word_count');

        if (books) {
            const family = ['아빠', '엄마', '찬민', '재민'];
            const aggregated = family.map(member => {
                const memberBooks = books.filter(b => b.user_id === member);
                return {
                    name: member,
                    count: memberBooks.length,
                    words: memberBooks.reduce((sum, b) => sum + (b.review_word_count || 0), 0)
                };
            });
            setStats(aggregated);
        }
    };

    const getRank = (name: string) => {
        const sorted = [...stats].sort((a, b) =>
            viewType === 'count' ? b.count - a.count : b.words - a.words
        );
        return sorted.findIndex(s => s.name === name);
    };

    const maxValue = Math.max(...stats.map(s => viewType === 'count' ? s.count : s.words), 1);

    const handleViewChange = (type: 'count' | 'words') => {
        setViewType(type);
        setAnimate(false);
        setTimeout(() => setAnimate(true), 50);
    };

    return (
        <div className="challenge-container">
            <div style={{ display: 'flex', alignItems: 'center', marginBottom: '30px' }}>
                <button className="btn" onClick={onBack} style={{ display: 'flex', alignItems: 'center' }}>
                    <ArrowLeft size={18} style={{ marginRight: '8px' }} />
                    뒤로가기
                </button>
                <h1 className="title" style={{ flex: 1, margin: 0 }}>독서 챌린지</h1>
            </div>

            <div className="glass-card" style={{ padding: '40px 20px', minHeight: '600px', display: 'flex', flexDirection: 'column' }}>
                {/* Toggle Buttons */}
                <div style={{ display: 'flex', justifyContent: 'center', gap: '15px', marginBottom: '60px' }}>
                    <button
                        className={`btn ${viewType === 'count' ? 'btn-primary' : ''}`}
                        onClick={() => handleViewChange('count')}
                        style={{ borderRadius: '20px', padding: '10px 25px', fontSize: '1rem' }}
                    >
                        <Book size={20} style={{ marginRight: '8px', verticalAlign: 'middle' }} />
                        등록된 책 수
                    </button>
                    <button
                        className={`btn ${viewType === 'words' ? 'btn-primary' : ''}`}
                        onClick={() => handleViewChange('words')}
                        style={{ borderRadius: '20px', padding: '10px 25px', fontSize: '1rem' }}
                    >
                        <Type size={20} style={{ marginRight: '8px', verticalAlign: 'middle' }} />
                        독서감상문 글자 수
                    </button>
                </div>

                {/* Graph Area */}
                <div style={{
                    display: 'flex',
                    alignItems: 'flex-end',
                    justifyContent: 'space-around',
                    height: '400px',
                    paddingBottom: '20px',
                    borderBottom: '2px solid #f0f0f0',
                    margin: '0 20px'
                }}>
                    {stats.map((user) => {
                        const val = viewType === 'count' ? user.count : user.words;
                        // Use 75% as max height to leave plenty of room for medals/labels
                        const heightPercent = (val / maxValue) * 75;
                        const rank = getRank(user.name);
                        const isWinner = rank === 0 && val > 0;

                        return (
                            <div key={user.name} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', width: '20%', height: '100%', justifyContent: 'flex-end' }}>
                                {/* Medal & Value Wrapper */}
                                <div style={{
                                    marginBottom: '15px',
                                    textAlign: 'center',
                                    opacity: animate ? 1 : 0,
                                    transform: animate ? 'translateY(0)' : 'translateY(10px)',
                                    transition: 'all 0.5s ease 0.5s',
                                    position: 'relative'
                                }}>
                                    {rank === 0 && val > 0 && (
                                        <div style={{ marginBottom: '5px', position: 'relative' }}>
                                            <div className="glow-gold" style={{ position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%, -50%)', width: '50px', height: '50px', borderRadius: '50%', background: 'rgba(255, 215, 0, 0.4)', filter: 'blur(15px)', zIndex: 0 }}></div>
                                            <Trophy size={48} color="#FFD700" fill="#FFD700" style={{ position: 'relative', zIndex: 1, filter: 'drop-shadow(0 4px 8px rgba(0,0,0,0.2))', animation: 'bounce 2s infinite' }} />
                                        </div>
                                    )}
                                    {rank === 1 && val > 0 && (
                                        <div style={{ marginBottom: '5px', position: 'relative' }}>
                                            <div style={{ position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%, -50%)', width: '40px', height: '40px', borderRadius: '50%', background: 'rgba(192, 192, 192, 0.3)', filter: 'blur(12px)', zIndex: 0 }}></div>
                                            <Medal size={38} color="#C0C0C0" fill="#C0C0C0" style={{ position: 'relative', zIndex: 1, filter: 'drop-shadow(0 2px 4px rgba(0,0,0,0.1))' }} />
                                        </div>
                                    )}
                                    {rank === 2 && val > 0 && (
                                        <div style={{ marginBottom: '5px', position: 'relative' }}>
                                            <div style={{ position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%, -50%)', width: '35px', height: '35px', borderRadius: '50%', background: 'rgba(205, 127, 50, 0.2)', filter: 'blur(10px)', zIndex: 0 }}></div>
                                            <Medal size={34} color="#CD7F32" fill="#CD7F32" style={{ position: 'relative', zIndex: 1, filter: 'drop-shadow(0 2px 4px rgba(0,0,0,0.1))' }} />
                                        </div>
                                    )}

                                    <div style={{ fontWeight: 'bold', color: '#555', fontSize: '1.2rem', marginTop: rank === 0 ? '5px' : '10px' }}>
                                        {viewType === 'count' ? `${val}권` : `${val.toLocaleString()}자`}
                                    </div>
                                </div>

                                {/* Bar */}
                                <div style={{
                                    width: '60px',
                                    height: animate ? `${Math.max(heightPercent, 2)}%` : '0%', // Min 2% visibility
                                    backgroundColor: memberColors[user.name] || '#ccc',
                                    borderRadius: '15px 15px 0 0',
                                    transition: 'height 1s cubic-bezier(0.34, 1.56, 0.64, 1)',
                                    boxShadow: isWinner ? '0 0 30px rgba(255, 215, 0, 0.4)' : '0 4px 12px rgba(0,0,0,0.08)',
                                    position: 'relative',
                                    overflow: 'hidden'
                                }}>
                                    {/* Shine effect for winner */}
                                    {isWinner && (
                                        <div style={{
                                            position: 'absolute', top: 0, left: '-100%', width: '100%', height: '100%',
                                            background: 'linear-gradient(90deg, transparent, rgba(255,255,255,0.4), transparent)',
                                            transform: 'skewX(-20deg)',
                                            animation: 'shine 2.5s infinite'
                                        }}></div>
                                    )}
                                </div>

                                {/* Name Label */}
                                <div style={{ marginTop: '20px', fontWeight: 'bold', fontSize: '1.2rem', color: '#333' }}>
                                    {user.name}
                                </div>
                            </div>
                        );
                    })}
                </div>
            </div>
            <style>{`
                @keyframes bounce {
                    0%, 100% {transform: translateY(0) scale(1);}
                    50% {transform: translateY(-12px) scale(1.05);}
                }
                @keyframes shine {
                    0% {left: -150%;}
                    30% {left: 150%;}
                    100% {left: 150%;}
                }
                .glow-gold {
                    animation: pulse-glow 2s infinite;
                }
                @keyframes pulse-glow {
                    0%, 100% {opacity: 0.5; transform: translate(-50%, -50%) scale(1);}
                    50% {opacity: 0.8; transform: translate(-50%, -50%) scale(1.2);}
                }
            `}</style>
        </div>
    );
};

export default ChallengePage;
