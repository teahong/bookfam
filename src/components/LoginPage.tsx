import React, { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { Glasses, Sun, Rocket, Sprout, Trophy, UserCog, Lock } from 'lucide-react';

interface LoginPageProps {
    onLogin: (userName: string) => void;
    onShowChallenge: () => void;
    onShowAdmin: () => void;
}

const LoginPage: React.FC<LoginPageProps> = ({ onLogin, onShowChallenge, onShowAdmin }) => {
    // ... (state remains same)
    const [users, setUsers] = useState<any[]>([]);
    const [selectedUser, setSelectedUser] = useState<any>(null);
    const [pin, setPin] = useState('');
    const [isSettingPin, setIsSettingPin] = useState(false);
    const [error, setError] = useState('');

    const [loading, setLoading] = useState(false);

    // Admin PIN State
    const [isAdminPinOpen, setIsAdminPinOpen] = useState(false);
    const [adminPin, setAdminPin] = useState('');
    const [adminError, setAdminError] = useState('');

    useEffect(() => {
        fetchUsers();
    }, []);

    const fetchUsers = async () => {
        // 보안을 위해 RPC 호출로 변경 (PIN 노출 방지)
        const { data, error } = await supabase.rpc('get_users_safe');
        if (error) console.error('Error fetching users:', error);
        if (data) setUsers(data);
    };

    const handleUserSelect = (user: any) => {
        if (loading) return; // 로딩 중 선택 방지
        setSelectedUser(user);
        setIsSettingPin(!user.has_pin);
        setPin('');
        setError('');
    };

    const handlePinChange = (value: string) => {
        if (loading) return;
        if (!/^\d*$/.test(value)) return;
        setPin(value.slice(0, 4));
    };

    const handleLoginSubmit = async () => {
        const fullPin = pin;
        if (fullPin.length < 4) {
            setError('4자리 비밀번호를 입력해주세요.');
            return;
        }

        setLoading(true);
        setError('');

        try {
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
                // 서버 측에서 안전하게 PIN 검증
                const { data: isValid, error: verifyError } = await supabase
                    .rpc('verify_pin', { user_id: selectedUser.id, input_pin: fullPin });

                if (verifyError) {
                    console.error('PIN verification error:', verifyError);
                    setError('로그인 중 오류가 발생했습니다.');
                } else if (isValid) {
                    onLogin(selectedUser.name);
                } else {
                    setError('비밀번호가 일치하지 않습니다.');
                    setPin('');
                }
            }
        } catch (e) {
            setError('예상치 못한 오류가 발생했습니다.');
        } finally {
            setLoading(false);
        }
    };

    // Admin PIN Handler
    const handleAdminSubmit = async () => {
        setLoading(true);
        // 1. Fetch Admin PIN from DB
        const { data: settings, error: fetchError } = await supabase
            .from('app_settings')
            .select('value')
            .eq('key', 'admin_pin')
            .single();

        if (fetchError && fetchError.code !== 'PGRST116') { // PGRST116 is "Row not found"
            setAdminError('설정 확인 중 오류가 발생했습니다.');
            setLoading(false);
            return;
        }

        const dbPin = settings?.value;

        if (!dbPin) {
            // Case 1: First time setup -> Save new PIN
            if (adminPin.length !== 4) {
                setAdminError('4자리 비밀번호를 설정해주세요.');
                setLoading(false);
                return;
            }

            const { error: insertError } = await supabase
                .from('app_settings')
                .insert([{ key: 'admin_pin', value: adminPin }]);

            if (insertError) {
                setAdminError('비밀번호 설정 중 오류가 발생했습니다.');
            } else {
                alert('관리자 비밀번호가 설정되었습니다: ' + adminPin);
                onShowAdmin();
                setIsAdminPinOpen(false);
                setAdminPin('');
            }
        } else {
            // Case 2: Verify existing PIN
            if (adminPin === dbPin) {
                onShowAdmin();
                setIsAdminPinOpen(false);
                setAdminPin('');
            } else {
                setAdminError('비밀번호가 올바르지 않습니다.');
            }
        }
        setLoading(false);
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
        <div className="login-container" style={{ position: 'relative' }}>

            <h1 className="title">책과 함께 하는 우리 가족</h1>

            <div className="glass-card" style={{ maxWidth: '800px', margin: '0 auto' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
                    {/* Admin Button */}
                    <button
                        onClick={() => setIsAdminPinOpen(true)}
                        className="btn"
                        style={{
                            background: '#546e7a', // Blue Grey
                            color: 'white',
                            padding: '8px 15px',
                            borderRadius: '8px',
                            cursor: 'pointer',
                            boxShadow: '0 2px 5px rgba(0,0,0,0.1)',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '6px',
                            border: 'none',
                            fontSize: '0.9rem'
                        }}
                    >
                        <UserCog size={22} />
                        관리자
                    </button>

                    {/* Challenge Button */}
                    <button className="btn btn-primary" onClick={onShowChallenge} disabled={loading}>
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
                                cursor: loading ? 'wait' : 'pointer',
                                opacity: loading && selectedUser?.id !== user.id ? 0.5 : 1
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

            {/* Login User PIN Modal */}
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

                        <input
                            type="tel"
                            inputMode="numeric"
                            pattern="[0-9]*"
                            className="input-field"
                            maxLength={4}
                            placeholder="PIN 4자리"
                            value={pin}
                            style={{
                                textAlign: 'center',
                                letterSpacing: '10px',
                                fontSize: '1.8rem',
                                marginBottom: '10px',
                                WebkitTextSecurity: 'disc',
                                height: '60px',
                                border: '2px solid #e0e0e0',
                                borderRadius: '12px',
                                background: 'white'
                            } as any}
                            onChange={(e) => handlePinChange(e.target.value)}
                            onKeyDown={(e) => {
                                if (e.key === 'Enter') handleLoginSubmit();
                            }}
                            autoFocus
                            disabled={loading}
                        />

                        {error && <p style={{ color: 'red', fontSize: '0.9rem', marginBottom: '10px' }}>{error}</p>}

                        <div style={{ display: 'flex', gap: '10px', justifyContent: 'center', marginTop: '20px' }}>
                            <button className="btn" style={{ flex: 1, padding: '12px' }} onClick={() => setSelectedUser(null)} disabled={loading}>취소</button>
                            <button className="btn btn-primary" style={{ flex: 1, padding: '12px' }} onClick={handleLoginSubmit} disabled={loading}>
                                {loading ? '확인 중...' : '확인'}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Admin PIN Modal */}
            {isAdminPinOpen && (
                <div className="pin-modal">
                    <div className="glass-card" style={{ padding: '40px', width: '320px', textAlign: 'center' }}>
                        <div style={{
                            width: '50px', height: '50px', borderRadius: '50%', margin: '0 auto 20px',
                            backgroundColor: '#333', display: 'flex', alignItems: 'center', justifyContent: 'center'
                        }}>
                            <Lock size={24} color="white" />
                        </div>
                        <h3 style={{ marginBottom: '10px' }}>관리자 접속</h3>
                        <p style={{ fontSize: '0.9rem', color: '#666', marginBottom: '20px' }}>
                            관리자 비밀번호를 입력해주세요.<br />
                            <span style={{ fontSize: '0.7rem', color: '#aaa' }}>(최초 접속 시 입력한 번호로 설정됩니다)</span>
                        </p>

                        <input
                            type="tel"
                            inputMode="numeric"
                            pattern="[0-9]*"
                            className="input-field"
                            maxLength={4}
                            placeholder="PIN 4자리"
                            value={adminPin}
                            onChange={(e) => {
                                if (/^\d*$/.test(e.target.value)) {
                                    setAdminPin(e.target.value.slice(0, 4));
                                    setAdminError('');
                                }
                            }}
                            onKeyDown={(e) => e.key === 'Enter' && handleAdminSubmit()}
                            style={{
                                width: '100%',
                                textAlign: 'center',
                                letterSpacing: '10px',
                                fontSize: '1.8rem',
                                marginBottom: '10px',
                                WebkitTextSecurity: 'disc',
                                height: '60px',
                                border: '2px solid #e0e0e0',
                                borderRadius: '12px',
                                background: 'white'
                            } as any}
                            autoFocus
                        />
                        {adminError && <p style={{ color: 'red', fontSize: '0.8rem', marginBottom: '15px' }}>{adminError}</p>}

                        <div style={{ display: 'flex', gap: '10px', justifyContent: 'center' }}>
                            <button className="btn" onClick={() => {
                                setIsAdminPinOpen(false);
                                setAdminPin('');
                                setAdminError('');
                            }}>취소</button>
                            <button className="btn btn-primary" onClick={handleAdminSubmit}>
                                확인
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default LoginPage;
