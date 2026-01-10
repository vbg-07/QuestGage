import React, { useEffect, useState } from 'react';
import { dynamoDB, tableName } from '../utils/aws-config';
import { Line, Bar } from 'react-chartjs-2';
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
import { AlertTriangle, User, Clock, HelpCircle, RefreshCw } from 'lucide-react';

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
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [isAuthenticated, setIsAuthenticated] = useState(false);
    const [password, setPassword] = useState('');

    const handleLogin = (e) => {
        e.preventDefault();
        if (password === 'admin123') { // Simple hardcoded password
            setIsAuthenticated(true);
            fetchData();
        } else {
            alert('Invalid Password');
        }
    };

    const fetchData = () => {
        setLoading(true);
        const params = {
            TableName: tableName
        };

        dynamoDB.scan(params, (err, result) => {
            if (err) {
                console.error("DynamoDB Error:", err);
                setError(err.message);
                setLoading(false);
            } else {
                // Sort by timestamp
                const sortedItems = result.Items.sort((a, b) => {
                    const timeA = a.Timestamp > 10000000000 ? a.Timestamp : a.Timestamp * 1000;
                    const timeB = b.Timestamp > 10000000000 ? b.Timestamp : b.Timestamp * 1000;
                    return timeA - timeB;
                });
                setData(sortedItems);
                setLoading(false);
            }
        });
    };

    // Extract Concept from 'SnapshotID'
    const extractConcept = (snapshotId) => {
        if (!snapshotId) return "General";
        const parts = snapshotId.split('-');
        if (parts.length >= 3) {
            return parts[2].replace('.jpg', '');
        }
        return "General";
    };

    // Aggregate Data by Concept
    const conceptData = {};
    data.forEach(d => {
        const concept = extractConcept(d.SnapshotID);
        if (!conceptData[concept]) {
            conceptData[concept] = { totalConfusion: 0, count: 0 };
        }

        let confusion = 0;
        if (d.Emotion === 'CONFUSED') {
            confusion = parseFloat(d.Confidence);
        }
        conceptData[concept].totalConfusion += confusion;
        conceptData[concept].count += 1;
    });

    // Prepare Bar Chart for Concepts
    const concepts = Object.keys(conceptData);
    const conceptChartData = {
        labels: concepts,
        datasets: [{
            label: 'Avg Confusion %',
            data: concepts.map(c => Math.round(conceptData[c].totalConfusion / conceptData[c].count)),
            backgroundColor: 'rgba(96, 165, 250, 0.6)', /* Blue 400 */
            borderColor: '#3b82f6',
            borderWidth: 1
        }]
    };

    // Legacy Line Chart (Time Series)
    const chartData = {
        labels: data.map(d => {
            const date = d.Timestamp > 10000000000 ? new Date(d.Timestamp) : new Date(d.Timestamp * 1000);
            return date.toLocaleTimeString();
        }),
        datasets: [
            {
                label: 'Confusion Confidence',
                data: data.map(d => d.Emotion === 'CONFUSED' ? parseFloat(d.Confidence) : 0),
                borderColor: '#f59e0b', /* Amber 500 */
                backgroundColor: 'rgba(245, 158, 11, 0.2)',
                tension: 0.3,
                fill: true
            },
        ],
    };

    const options = {
        responsive: true,
        plugins: {
            legend: {
                position: 'top',
                labels: { color: '#94a3b8' }
            },
            title: {
                display: false,
            },
        },
        scales: {
            y: { ticks: { color: '#64748b' }, grid: { color: 'rgba(255,255,255,0.05)' } },
            x: { ticks: { color: '#64748b' }, grid: { color: 'rgba(255,255,255,0.05)' } }
        }
    };

    // Filter Alerts
    const alerts = data.reduce((acc, d) => {
        const faceCount = d.FacesFound;

        const timestamp = d.Timestamp > 10000000000
            ? new Date(d.Timestamp)
            : new Date(d.Timestamp * 1000);

        // Check for Face Count Anomalies
        if (faceCount !== 1) {
            acc.push({
                type: 'ANOMALY',
                message: `Anomaly: ${faceCount} faces detected.`,
                timestamp,
                priority: 'high'
            });
        }

        // Check for Confusion
        if (d.Emotion === 'CONFUSED' && parseFloat(d.Confidence) > 50) {
            const concept = extractConcept(d.SnapshotID);
            acc.push({
                type: 'CONFUSION',
                message: `High confusion (${Math.round(parseFloat(d.Confidence))}%) on concept: ${concept}.`,
                timestamp,
                priority: 'medium'
            });
        }

        return acc;
    }, []).sort((a, b) => b.timestamp - a.timestamp);


    if (!isAuthenticated) {
        return (
            <div className="full-screen-center animate-fade-in">
                <div className="glass-panel" style={{ width: '100%', maxWidth: '400px' }}>
                    <h2 className="text-gradient" style={{ textAlign: 'center' }}>Teacher Access</h2>
                    <p style={{ textAlign: 'center', marginBottom: '2rem' }}>Please verify your credentials.</p>
                    <form onSubmit={handleLogin} className="flex-column">
                        <input
                            type="password"
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            placeholder="Enter Password"
                        />
                        <button type="submit" className="btn-primary" style={{ width: '100%' }}>Access Dashboard</button>
                    </form>
                </div>
            </div>
        );
    }

    return (
        <div className="container animate-slide-up">
            <div className="glass-panel flex-between mb-4">
                <div>
                    <h2 style={{ margin: 0 }}>Exam Analytics</h2>
                    <p style={{ margin: 0, fontSize: '0.9rem' }}>Real-time student monitoring and insights.</p>
                </div>
                <button onClick={fetchData} className="btn-secondary" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    <RefreshCw size={16} /> Refresh Data
                </button>
            </div>

            {loading && (
                <div className="glass-panel" style={{ textAlign: 'center', padding: '4rem' }}>
                    <div className="animate-pulse">Loading analytics data...</div>
                </div>
            )}

            {error && <div className="glass-panel"><p style={{ color: 'var(--danger)' }}>Error: {error}</p></div>}

            {!loading && !error && data.length === 0 && (
                <div className="glass-panel" style={{ textAlign: 'center', padding: '3rem' }}>
                    <p>No exam data found. Students may not have started yet.</p>
                </div>
            )}

            {!loading && !error && data.length > 0 && (
                <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0, 1fr)', gap: '2rem' }}>
                    {/* Concept Breakdown Chart */}
                    <div className="glass-panel">
                        <h3 className="mb-4">Concept Confusion Analysis</h3>
                        <div style={{ height: '250px' }}>
                            <Bar
                                data={conceptChartData}
                                options={{
                                    ...options,
                                    responsive: true,
                                    maintainAspectRatio: false,
                                }}
                            />
                        </div>
                    </div>

                    <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: '2rem' }}>
                        <div className="glass-panel">
                            <h3 className="mb-4">Engagement Timeline</h3>
                            <Line options={options} data={chartData} />
                        </div>

                        <div className="glass-panel" style={{ display: 'flex', flexDirection: 'column' }}>
                            <h3 className="mb-4" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                                <AlertTriangle color="var(--warning)" /> Live Alerts
                            </h3>
                            {alerts.length === 0 ? (
                                <div style={{
                                    flex: 1,
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    color: 'var(--success)',
                                    textAlign: 'center'
                                }}>
                                    <p>All active sessions are normal.</p>
                                </div>
                            ) : (
                                <div style={{ flex: 1, overflowY: 'auto', paddingRight: '0.5rem' }}>
                                    {alerts.map((alert, idx) => (
                                        <div key={idx} style={{
                                            padding: '1rem',
                                            marginBottom: '0.8rem',
                                            background: alert.type === 'ANOMALY' ? 'rgba(239, 68, 68, 0.1)' : 'rgba(245, 158, 11, 0.1)',
                                            borderRadius: '8px',
                                            borderLeft: `4px solid ${alert.type === 'ANOMALY' ? 'var(--danger)' : 'var(--warning)'}`,
                                        }}>
                                            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontWeight: 'bold', fontSize: '0.8.5rem', marginBottom: '0.2rem', color: 'var(--text-primary)' }}>
                                                {alert.timestamp.toLocaleTimeString()}
                                            </div>
                                            <p style={{ margin: 0, fontSize: '0.9rem', color: 'var(--text-secondary)' }}>
                                                {alert.message}
                                            </p>
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
