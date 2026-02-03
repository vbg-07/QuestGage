import React, { useEffect, useState, useMemo, useCallback } from 'react';
import { dynamoDB, tableName, timingTableName } from '../utils/aws-config';
import { Bar } from 'react-chartjs-2';
import {
    Chart as ChartJS,
    CategoryScale,
    LinearScale,
    PointElement,
    LineElement,
    BarElement,
    Title,
    Tooltip,
    Legend,
} from 'chart.js';
import { AlertTriangle, User, Clock, RefreshCw, Timer, Users, TrendingUp, Lock } from 'lucide-react';
import { RateLimiter } from '../utils/rateLimit';

ChartJS.register(
    CategoryScale,
    LinearScale,
    PointElement,
    LineElement,
    BarElement,
    Title,
    Tooltip,
    Legend
);

const Dashboard = () => {
    const [data, setData] = useState([]);
    const [timingData, setTimingData] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [isAuthenticated, setIsAuthenticated] = useState(false);
    const [password, setPassword] = useState('');
    const [loginAttempts, setLoginAttempts] = useState(0);
    const [loginLocked, setLoginLocked] = useState(false);
    const [refreshCooldown, setRefreshCooldown] = useState(0);

    // Rate limiters
    const refreshLimiter = useMemo(() => new RateLimiter(5, 60000), []); // 5 refreshes per minute

    // Cooldown effect for refresh button
    useEffect(() => {
        if (refreshCooldown > 0) {
            const timer = setTimeout(() => setRefreshCooldown(c => c - 1), 1000);
            return () => clearTimeout(timer);
        }
    }, [refreshCooldown]);

    // Login lockout effect
    useEffect(() => {
        if (loginLocked) {
            const timer = setTimeout(() => {
                setLoginLocked(false);
                setLoginAttempts(0);
            }, 30000); // 30 second lockout
            return () => clearTimeout(timer);
        }
    }, [loginLocked]);

    const handleLogin = useCallback((e) => {
        e.preventDefault();

        if (loginLocked) {
            return;
        }

        if (password === 'admin123') {
            setIsAuthenticated(true);
            setLoginAttempts(0);
            fetchData();
        } else {
            const newAttempts = loginAttempts + 1;
            setLoginAttempts(newAttempts);

            if (newAttempts >= 3) {
                setLoginLocked(true);
            } else {
                alert(`Invalid password. ${3 - newAttempts} attempts remaining.`);
            }
        }
    }, [password, loginAttempts, loginLocked]);

    const fetchData = useCallback(() => {
        setLoading(true);
        setError(null);

        const emotionParams = { TableName: tableName };
        const timingParams = { TableName: timingTableName };

        Promise.all([
            new Promise((resolve, reject) => {
                dynamoDB.scan(emotionParams, (err, result) => {
                    if (err) reject(err);
                    else resolve(result.Items || []);
                });
            }),
            new Promise((resolve, reject) => {
                dynamoDB.scan(timingParams, (err, result) => {
                    if (err) {
                        console.warn("Timing table not found or empty:", err.message);
                        resolve([]);
                    } else {
                        resolve(result.Items || []);
                    }
                });
            })
        ]).then(([emotionItems, timingItems]) => {
            const sortedEmotionItems = emotionItems.sort((a, b) => {
                const timeA = a.Timestamp > 10000000000 ? a.Timestamp : a.Timestamp * 1000;
                const timeB = b.Timestamp > 10000000000 ? b.Timestamp : b.Timestamp * 1000;
                return timeA - timeB;
            });

            setData(sortedEmotionItems);
            setTimingData(timingItems);
            setLoading(false);
        }).catch(err => {
            console.error("DynamoDB Error:", err);
            setError(err.message);
            setLoading(false);
        });
    }, []);

    // Rate-limited refresh handler
    const handleRefresh = useCallback(() => {
        if (!refreshLimiter.isAllowed()) {
            const waitTime = refreshLimiter.getWaitTime();
            setRefreshCooldown(waitTime);
            return;
        }
        fetchData();
    }, [fetchData, refreshLimiter]);

    // Extract Concept from 'SnapshotID'
    const extractConcept = (snapshotId) => {
        if (!snapshotId) return "General";
        const parts = snapshotId.split('-');
        if (parts.length >= 4) {
            return parts[3].replace('.jpg', '');
        } else if (parts.length >= 3) {
            return parts[2].replace('.jpg', '');
        }
        return "General";
    };

    // ============ SIMPLE STATS ============
    const totalStudents = timingData.length;
    const avgExamTime = totalStudents > 0
        ? Math.round(timingData.reduce((sum, t) => sum + (t.TotalExamTime || 0), 0) / totalStudents)
        : 0;
    const confusionEvents = data.filter(d => d.Emotion === 'CONFUSED').length;
    const avgConfusion = confusionEvents > 0
        ? Math.round(data.filter(d => d.Emotion === 'CONFUSED').reduce((sum, d) => sum + parseFloat(d.Confidence), 0) / confusionEvents)
        : 0;

    // ============ TIME PER QUESTION ============
    const questionTimeData = () => {
        const questionTotals = {};
        const questionCounts = {};

        timingData.forEach(session => {
            if (session.QuestionTimes) {
                Object.entries(session.QuestionTimes).forEach(([qId, time]) => {
                    questionTotals[qId] = (questionTotals[qId] || 0) + time;
                    questionCounts[qId] = (questionCounts[qId] || 0) + 1;
                });
            }
        });

        const sortedKeys = Object.keys(questionTotals).sort((a, b) => a - b);
        const labels = sortedKeys.map(q => `Q${q}`);
        const avgTimes = sortedKeys.map(q => Math.round(questionTotals[q] / questionCounts[q]));

        return {
            labels,
            datasets: [{
                label: 'Avg Time (seconds)',
                data: avgTimes,
                backgroundColor: avgTimes.map(t =>
                    t > 90 ? 'rgba(239, 68, 68, 0.8)' :
                        t > 60 ? 'rgba(251, 146, 60, 0.8)' :
                            'rgba(34, 197, 94, 0.8)'
                ),
                borderColor: avgTimes.map(t =>
                    t > 90 ? '#dc2626' :
                        t > 60 ? '#ea580c' :
                            '#16a34a'
                ),
                borderWidth: 2,
                borderRadius: 8,
                borderSkipped: false,
            }]
        };
    };

    // ============ CONFUSION BY TOPIC ============
    const conceptData = {};
    data.forEach(d => {
        const concept = extractConcept(d.SnapshotID);
        if (!conceptData[concept]) {
            conceptData[concept] = { confused: 0, total: 0 };
        }
        conceptData[concept].total += 1;
        if (d.Emotion === 'CONFUSED') {
            conceptData[concept].confused += 1;
        }
    });

    const concepts = Object.keys(conceptData).filter(c => c !== 'General');
    const confusionChartData = {
        labels: concepts,
        datasets: [{
            label: 'Confusion Rate (%)',
            data: concepts.map(c => Math.round((conceptData[c].confused / conceptData[c].total) * 100)),
            backgroundColor: concepts.map((_, i) => {
                const colors = [
                    'rgba(99, 102, 241, 0.8)',   // indigo
                    'rgba(139, 92, 246, 0.8)',   // purple
                    'rgba(236, 72, 153, 0.8)',   // pink
                    'rgba(244, 63, 94, 0.8)',    // rose
                    'rgba(251, 146, 60, 0.8)',   // orange
                    'rgba(234, 179, 8, 0.8)',    // yellow
                    'rgba(34, 197, 94, 0.8)',    // green
                ];
                return colors[i % colors.length];
            }),
            borderColor: concepts.map((_, i) => {
                const colors = ['#4f46e5', '#7c3aed', '#db2777', '#e11d48', '#ea580c', '#ca8a04', '#16a34a'];
                return colors[i % colors.length];
            }),
            borderWidth: 2,
            borderRadius: 8,
            borderSkipped: false,
        }]
    };

    // Chart options with better styling
    const timeChartOptions = {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
            legend: { display: false },
            tooltip: {
                backgroundColor: 'rgba(15, 23, 42, 0.95)',
                titleColor: '#f8fafc',
                bodyColor: '#cbd5e1',
                borderColor: 'rgba(255,255,255,0.1)',
                borderWidth: 1,
                padding: 12,
                cornerRadius: 8,
                displayColors: false,
                callbacks: {
                    label: (context) => `${context.parsed.y} seconds`
                }
            }
        },
        scales: {
            y: {
                beginAtZero: true,
                ticks: {
                    color: '#94a3b8',
                    font: { size: 12, weight: '500' },
                    padding: 8
                },
                grid: {
                    color: 'rgba(255,255,255,0.06)',
                    drawBorder: false
                },
                border: { display: false }
            },
            x: {
                ticks: {
                    color: '#94a3b8',
                    font: { size: 12, weight: '600' },
                    padding: 8
                },
                grid: { display: false },
                border: { display: false }
            }
        }
    };

    const confusionChartOptions = {
        ...timeChartOptions,
        indexAxis: 'y',
        plugins: {
            ...timeChartOptions.plugins,
            tooltip: {
                ...timeChartOptions.plugins.tooltip,
                callbacks: {
                    label: (context) => `${context.parsed.x}% confusion rate`
                }
            }
        },
        scales: {
            x: {
                beginAtZero: true,
                max: 100,
                ticks: {
                    color: '#94a3b8',
                    font: { size: 12 },
                    callback: (value) => `${value}%`
                },
                grid: {
                    color: 'rgba(255,255,255,0.06)',
                    drawBorder: false
                },
                border: { display: false }
            },
            y: {
                ticks: {
                    color: '#e2e8f0',
                    font: { size: 12, weight: '500' },
                    padding: 12
                },
                grid: { display: false },
                border: { display: false }
            }
        }
    };

    // Student Timing Summary
    const studentTimingSummary = timingData.map(session => ({
        studentId: session.StudentID,
        totalTime: session.TotalExamTime,
        timestamp: session.Timestamp,
        questionTimes: session.QuestionTimes
    })).sort((a, b) => (b.timestamp || 0) - (a.timestamp || 0));

    // Alerts
    const alerts = data.reduce((acc, d) => {
        const timestamp = d.Timestamp > 10000000000 ? new Date(d.Timestamp) : new Date(d.Timestamp * 1000);

        if (d.FacesFound !== 1) {
            acc.push({ type: 'ANOMALY', message: `${d.FacesFound} faces detected`, timestamp });
        }

        if (d.Emotion === 'CONFUSED' && parseFloat(d.Confidence) > 60) {
            acc.push({ type: 'CONFUSION', message: `Confused on ${extractConcept(d.SnapshotID)}`, timestamp });
        }

        return acc;
    }, []).sort((a, b) => b.timestamp - a.timestamp).slice(0, 8);

    // Format time
    const formatTime = (seconds) => {
        if (!seconds) return '0:00';
        const mins = Math.floor(seconds / 60);
        const secs = seconds % 60;
        return `${mins}:${secs < 10 ? '0' : ''}${secs}`;
    };

    // Stat Card Component
    const StatCard = ({ icon: Icon, value, label, color, bgColor }) => (
        <div className="glass-panel" style={{
            padding: '1.5rem',
            textAlign: 'center',
            background: `linear-gradient(135deg, ${bgColor} 0%, rgba(15, 23, 42, 0.8) 100%)`,
            borderTop: `3px solid ${color}`
        }}>
            <Icon size={28} color={color} style={{ marginBottom: '0.75rem' }} />
            <div style={{
                fontSize: '2.25rem',
                fontWeight: '700',
                color: '#f8fafc',
                lineHeight: 1.1,
                marginBottom: '0.25rem'
            }}>
                {value}
            </div>
            <div style={{
                fontSize: '0.9rem',
                color: '#94a3b8',
                fontWeight: '500'
            }}>
                {label}
            </div>
        </div>
    );

    if (!isAuthenticated) {
        return (
            <div className="full-screen-center animate-fade-in">
                <div className="glass-panel" style={{ width: '100%', maxWidth: '420px', padding: '2.5rem' }}>
                    <h2 className="text-gradient" style={{ textAlign: 'center', marginBottom: '0.5rem' }}>Teacher Dashboard</h2>
                    <p style={{ textAlign: 'center', marginBottom: '2rem', color: 'var(--text-secondary)' }}>Enter your credentials to continue</p>

                    {loginLocked && (
                        <div style={{
                            background: 'rgba(239, 68, 68, 0.1)',
                            border: '1px solid rgba(239, 68, 68, 0.3)',
                            borderRadius: '8px',
                            padding: '1rem',
                            marginBottom: '1.5rem',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '0.75rem'
                        }}>
                            <Lock size={20} color="#ef4444" />
                            <span style={{ color: '#ef4444', fontSize: '0.9rem' }}>
                                Too many attempts. Please wait 30 seconds.
                            </span>
                        </div>
                    )}

                    <form onSubmit={handleLogin} className="flex-column">
                        <input
                            type="password"
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            placeholder="Enter Password"
                            style={{ marginBottom: '1rem' }}
                            disabled={loginLocked}
                        />
                        <button
                            type="submit"
                            className="btn-primary"
                            style={{
                                width: '100%',
                                padding: '0.9rem',
                                opacity: loginLocked ? 0.5 : 1,
                                cursor: loginLocked ? 'not-allowed' : 'pointer'
                            }}
                            disabled={loginLocked}
                        >
                            {loginLocked ? 'Locked - Please Wait' : 'Access Dashboard'}
                        </button>
                    </form>
                </div>
            </div>
        );
    }

    return (
        <div className="container animate-slide-up" style={{ maxWidth: '1400px', margin: '0 auto' }}>
            {/* Header */}
            <div className="glass-panel flex-between mb-4" style={{ padding: '1.25rem 1.75rem' }}>
                <div>
                    <h2 style={{ margin: 0, fontSize: '1.5rem', fontWeight: '600' }}>Exam Analytics</h2>
                    <p style={{ margin: '0.25rem 0 0', fontSize: '0.9rem', color: 'var(--text-secondary)' }}>
                        Real-time student performance insights
                    </p>
                </div>
                <button
                    onClick={handleRefresh}
                    className="btn-secondary"
                    disabled={loading || refreshCooldown > 0}
                    style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '0.5rem',
                        padding: '0.6rem 1.25rem',
                        opacity: (loading || refreshCooldown > 0) ? 0.6 : 1,
                        cursor: (loading || refreshCooldown > 0) ? 'not-allowed' : 'pointer'
                    }}
                >
                    <RefreshCw size={16} className={loading ? 'animate-spin' : ''} />
                    {refreshCooldown > 0 ? `Wait ${refreshCooldown}s` : loading ? 'Loading...' : 'Refresh'}
                </button>
            </div>

            {loading && (
                <div className="glass-panel" style={{ textAlign: 'center', padding: '5rem' }}>
                    <div className="animate-pulse" style={{ fontSize: '1.1rem' }}>Loading analytics...</div>
                </div>
            )}

            {error && <div className="glass-panel"><p style={{ color: 'var(--danger)' }}>Error: {error}</p></div>}

            {!loading && !error && data.length === 0 && timingData.length === 0 && (
                <div className="glass-panel" style={{ textAlign: 'center', padding: '4rem' }}>
                    <Users size={48} color="var(--text-secondary)" style={{ marginBottom: '1rem', opacity: 0.5 }} />
                    <p style={{ fontSize: '1.1rem', color: 'var(--text-secondary)' }}>
                        No exam data yet. Waiting for students to complete exams.
                    </p>
                </div>
            )}

            {!loading && !error && (data.length > 0 || timingData.length > 0) && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>

                    {/* Stats Cards */}
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '1.25rem' }}>
                        <StatCard
                            icon={Users}
                            value={totalStudents}
                            label="Total Students"
                            color="#3b82f6"
                            bgColor="rgba(59, 130, 246, 0.1)"
                        />
                        <StatCard
                            icon={Clock}
                            value={formatTime(avgExamTime)}
                            label="Avg Exam Time"
                            color="#8b5cf6"
                            bgColor="rgba(139, 92, 246, 0.1)"
                        />
                        <StatCard
                            icon={TrendingUp}
                            value={confusionEvents}
                            label="Confusion Events"
                            color="#f59e0b"
                            bgColor="rgba(245, 158, 11, 0.1)"
                        />
                        <StatCard
                            icon={AlertTriangle}
                            value={`${avgConfusion}%`}
                            label="Avg Confusion"
                            color={avgConfusion > 50 ? '#ef4444' : '#22c55e'}
                            bgColor={avgConfusion > 50 ? 'rgba(239, 68, 68, 0.1)' : 'rgba(34, 197, 94, 0.1)'}
                        />
                    </div>

                    {/* Charts */}
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.5rem' }}>
                        {/* Time per Question */}
                        {timingData.length > 0 && (
                            <div className="glass-panel" style={{ padding: '1.5rem' }}>
                                <div style={{ marginBottom: '1.25rem' }}>
                                    <h3 style={{ margin: 0, display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '1.1rem' }}>
                                        <Timer size={20} color="#3b82f6" />
                                        Time per Question
                                    </h3>
                                    <div style={{ display: 'flex', gap: '1rem', marginTop: '0.75rem', fontSize: '0.8rem' }}>
                                        <span style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                                            <span style={{ width: 10, height: 10, borderRadius: 3, background: '#22c55e' }}></span>
                                            <span style={{ color: '#94a3b8' }}>Under 1 min</span>
                                        </span>
                                        <span style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                                            <span style={{ width: 10, height: 10, borderRadius: 3, background: '#f97316' }}></span>
                                            <span style={{ color: '#94a3b8' }}>1-1.5 min</span>
                                        </span>
                                        <span style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                                            <span style={{ width: 10, height: 10, borderRadius: 3, background: '#ef4444' }}></span>
                                            <span style={{ color: '#94a3b8' }}>Over 1.5 min</span>
                                        </span>
                                    </div>
                                </div>
                                <div style={{ height: '240px' }}>
                                    <Bar data={questionTimeData()} options={timeChartOptions} />
                                </div>
                            </div>
                        )}

                        {/* Confusion by Topic */}
                        {concepts.length > 0 && (
                            <div className="glass-panel" style={{ padding: '1.5rem' }}>
                                <div style={{ marginBottom: '1.25rem' }}>
                                    <h3 style={{ margin: 0, display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '1.1rem' }}>
                                        <AlertTriangle size={20} color="#f59e0b" />
                                        Confusion by Topic
                                    </h3>
                                    <p style={{ margin: '0.5rem 0 0', fontSize: '0.8rem', color: '#94a3b8' }}>
                                        Higher percentage indicates more student confusion
                                    </p>
                                </div>
                                <div style={{ height: '240px' }}>
                                    <Bar data={confusionChartData} options={confusionChartOptions} />
                                </div>
                            </div>
                        )}
                    </div>

                    {/* Bottom Section */}
                    <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: '1.5rem' }}>
                        {/* Student Time Table */}
                        {studentTimingSummary.length > 0 && (
                            <div className="glass-panel" style={{ padding: '1.5rem' }}>
                                <h3 style={{ margin: '0 0 1rem', display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '1.1rem' }}>
                                    <User size={20} color="#3b82f6" />
                                    Student Performance
                                </h3>
                                <div style={{ overflowX: 'auto' }}>
                                    <table style={{ width: '100%', borderCollapse: 'separate', borderSpacing: '0 4px' }}>
                                        <thead>
                                            <tr>
                                                <th style={{ textAlign: 'left', padding: '0.75rem 1rem', color: '#64748b', fontSize: '0.8rem', fontWeight: '600', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Student</th>
                                                <th style={{ textAlign: 'center', padding: '0.75rem 0.5rem', color: '#64748b', fontSize: '0.8rem', fontWeight: '600', textTransform: 'uppercase' }}>Total</th>
                                                {[1, 2, 3, 4, 5, 6, 7].map(q => (
                                                    <th key={q} style={{ textAlign: 'center', padding: '0.75rem 0.5rem', color: '#64748b', fontSize: '0.8rem', fontWeight: '600' }}>Q{q}</th>
                                                ))}
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {studentTimingSummary.slice(0, 6).map((student, idx) => (
                                                <tr key={idx} style={{ background: 'rgba(255,255,255,0.02)', borderRadius: '8px' }}>
                                                    <td style={{ padding: '0.85rem 1rem', fontWeight: '600', color: '#e2e8f0', borderRadius: '8px 0 0 8px' }}>
                                                        {student.studentId}
                                                    </td>
                                                    <td style={{ textAlign: 'center', padding: '0.85rem 0.5rem', color: '#3b82f6', fontFamily: 'monospace', fontWeight: '600', fontSize: '0.95rem' }}>
                                                        {formatTime(student.totalTime)}
                                                    </td>
                                                    {[1, 2, 3, 4, 5, 6, 7].map(q => {
                                                        const time = student.questionTimes?.[q] || 0;
                                                        const isLong = time > 90;
                                                        const isMedium = time > 60 && time <= 90;
                                                        return (
                                                            <td key={q} style={{
                                                                textAlign: 'center',
                                                                padding: '0.85rem 0.5rem',
                                                                fontFamily: 'monospace',
                                                                fontSize: '0.9rem',
                                                                fontWeight: '500',
                                                                color: isLong ? '#ef4444' : isMedium ? '#f97316' : '#94a3b8',
                                                                borderRadius: q === 7 ? '0 8px 8px 0' : '0'
                                                            }}>
                                                                {formatTime(time)}
                                                            </td>
                                                        );
                                                    })}
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>
                            </div>
                        )}

                        {/* Alerts */}
                        <div className="glass-panel" style={{ padding: '1.5rem', display: 'flex', flexDirection: 'column' }}>
                            <h3 style={{ margin: '0 0 1rem', display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '1.1rem' }}>
                                <AlertTriangle size={20} color="#f59e0b" />
                                Recent Alerts
                            </h3>
                            {alerts.length === 0 ? (
                                <div style={{
                                    flex: 1,
                                    display: 'flex',
                                    flexDirection: 'column',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    background: 'rgba(34, 197, 94, 0.08)',
                                    borderRadius: '12px',
                                    padding: '2rem'
                                }}>
                                    <div style={{
                                        width: 48,
                                        height: 48,
                                        borderRadius: '50%',
                                        background: 'rgba(34, 197, 94, 0.15)',
                                        display: 'flex',
                                        alignItems: 'center',
                                        justifyContent: 'center',
                                        marginBottom: '0.75rem'
                                    }}>
                                        <span style={{ fontSize: '1.5rem' }}>✓</span>
                                    </div>
                                    <p style={{ color: '#22c55e', fontWeight: '500', margin: 0 }}>All sessions normal</p>
                                </div>
                            ) : (
                                <div style={{ flex: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                                    {alerts.map((alert, idx) => (
                                        <div key={idx} style={{
                                            padding: '0.85rem 1rem',
                                            background: alert.type === 'ANOMALY' ? 'rgba(239, 68, 68, 0.08)' : 'rgba(251, 146, 60, 0.08)',
                                            borderRadius: '10px',
                                            borderLeft: `4px solid ${alert.type === 'ANOMALY' ? '#ef4444' : '#f97316'}`,
                                        }}>
                                            <div style={{ color: '#64748b', fontSize: '0.75rem', marginBottom: '0.3rem', fontWeight: '500' }}>
                                                {alert.timestamp.toLocaleTimeString()}
                                            </div>
                                            <div style={{ color: '#e2e8f0', fontSize: '0.9rem', fontWeight: '500' }}>
                                                {alert.message}
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default Dashboard;
