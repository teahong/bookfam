import React, { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { Glasses, Sun, Rocket, Sprout, Trophy } from 'lucide-react';

interface LoginPageProps {
    onLogin: (userName: string) => void;
    onShowChallenge: () => void;
}

const LoginPage: React.FC<LoginPageProps> = ({ onLogin, onShowChallenge }) => {
    // ... (state remains same)
    const [users, setUsers] = useState<any[]>([]);
    const [selectedUser, setSelectedUser] = useState<any>(null);
    const [pin, setPin] = useState(['', '', '', '']);
    const [isSettingPin, setIsSettingPin] = useState(false);
    const [error, setError] = useState('');

    useEffect(() => {
        fetchUsers();
    }, []);

    const fetchUsers = async () => {
        const { data } = await supabase.from('users').select('*');
        if (data) setUsers(data);
    };

    const handleUserSelect = (user: any) => {
        setSelectedUser(user);
        setIsSettingPin(!user.pin);
        setPin(['', '', '', '']);
        setError('');
    };

    const handlePinChange = (index: number, value: string) => {
        if (!/^\d*$/.test(value)) return;
        const newPin = [...pin];
        newPin[index] = value.slice(-1);
        setPin(newPin);

        if (value && index < 3) {
            const nextInput = document.getElementById(`pin-${index + 1}`);
            nextInput?.focus();
        }
    };

    const handleLoginSubmit = async () => {
        const fullPin = pin.join('');
        if (fullPin.length < 4) {
            setError('4자리 비밀번호를 입력해주세요.');
            return;
        }

        if (isSettingPin) {
            const { error: updateError } = await supabase
                .from('users')
                .update({ pin: fullPin })
                .eq('id', selectedUser.id);

            if (updateError) {
                setError('비밀번호 저장 중 오류가 발생했습니다.');
            } else {
                onLogin(selectedUser.name);
            }
        } else {
            if (selectedUser.pin === fullPin) {
                onLogin(selectedUser.name);
            } else {
                setError('비밀번호가 일치하지 않습니다.');
                setPin(['', '', '', '']);
            }
        }
    };

    const getAvatar = (name: string) => {
        const iconSize = 40;
        const iconStyle = { color: 'white' };

        switch (name) {
            case '아빠': return <Glasses size={iconSize} style={iconStyle} />;
            case '엄마': return <Sun size={iconSize} style={iconStyle} />;
            case '찬민': return <Rocket size={iconSize} style={iconStyle} />;
            case '재민': return <Sprout size={iconSize} style={iconStyle} />;
            default: return <Glasses size={iconSize} style={iconStyle} />;
        }
    };

    const getAvatarColor = (name: string) => {
        switch (name) {
            case '아빠': return '#5D4037'; // Warm Dark Brown (Dad/Wisdom)
            case '엄마': return '#FFB74D'; // Soft Orange (Mom/Warmth)
            case '찬민': return '#4DB6AC'; // Teal (Adventure)
            case '재민': return '#81C784'; // Soft Green (Growth)
            default: return '#ccc';
        }
    };

    return (
        <div className="login-container">
            <h1 className="title">책과 함께 하는 우리 가족</h1>

            <div className="glass-card" style={{ maxWidth: '800px', margin: '0 auto' }}>
                <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: '20px' }}>
                    <button className="btn btn-primary" onClick={onShowChallenge}>
                        <Trophy size={18} style={{ marginRight: '8px', verticalAlign: 'middle' }} />
                        독서챌린지 보러가기
                    </button>
                </div>

                <h2 style={{ textAlign: 'center', marginBottom: '40px', fontSize: '1.5rem', fontWeight: 'bold', color: '#333' }}>누가 접속하시나요?</h2>

                <div className="grid-family" style={{
                    display: 'grid',
                    gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))',
                    gap: '30px'
                }}>
                    {[...users].sort((a, b) => {
                        const order = ['아빠', '엄마', '찬민', '재민'];
                        return order.indexOf(a.name) - order.indexOf(b.name);
                    }).map(user => (
                        <div
                            key={user.id}
                            className={`avatar-card glass-card ${selectedUser?.id === user.id ? 'active' : ''}`}
                            onClick={() => handleUserSelect(user)}
                            style={{
                                border: selectedUser?.id === user.id ? `3px solid ${getAvatarColor(user.name)}` : '2px solid transparent',
                                transform: selectedUser?.id === user.id ? 'scale(1.05)' : 'scale(1)',
                                transition: 'all 0.3s ease',
                                display: 'flex',
                                flexDirection: 'column',
                                alignItems: 'center',
                                padding: '30px 20px',
                                cursor: 'pointer'
                            }}
                        >
                            <div className="avatar-circle" style={{
                                width: '80px',
                                height: '80px',
                                borderRadius: '50%',
                                backgroundColor: getAvatarColor(user.name),
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                marginBottom: '15px',
                                boxShadow: '0 4px 10px rgba(0,0,0,0.2)'
                            }}>
                                {getAvatar(user.name)}
                            </div>
                            <h3 style={{ fontSize: '1.3rem', margin: 0, color: '#333' }}>{user.name}</h3>
                        </div>
                    ))}
                </div>
            </div>

            {selectedUser && (
                <div className="pin-modal">
                    <div className="glass-card pin-container">
                        <div style={{
                            width: '60px', height: '60px', borderRadius: '50%', margin: '0 auto 20px',
                            backgroundColor: getAvatarColor(selectedUser.name), display: 'flex', alignItems: 'center', justifyContent: 'center'
                        }}>
                            {getAvatar(selectedUser.name)}
                        </div>
                        <h3>{selectedUser.name}님</h3>
                        <p>{isSettingPin ? '첫 방문이시네요! 비밀번호 4자리를 등록해주세요.' : '비밀번호를 입력해주세요.'}</p>

                        <div className="pin-inputs">
                            {pin.map((digit, i) => (
                                <input
                                    key={i}
                                    id={`pin-${i}`}
                                    type="password"
                                    inputMode="numeric"
                                    pattern="[0-9]*"
                                    className="pin-input"
                                    maxLength={1}
                                    value={digit}
                                    onChange={(e) => handlePinChange(i, e.target.value)}
                                    autoFocus={i === 0}
                                />
                            ))}
                        </div>

                        {error && <p style={{ color: 'red', fontSize: '0.9rem', marginBottom: '10px' }}>{error}</p>}

                        <div style={{ display: 'flex', gap: '10px', justifyContent: 'center', marginTop: '20px' }}>
                            <button className="btn" onClick={() => setSelectedUser(null)}>취소</button>
                            <button className="btn btn-primary" onClick={handleLoginSubmit}>확인</button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default LoginPage;
