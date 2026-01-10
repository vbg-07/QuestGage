import React, { useState, useEffect } from 'react';
import { questions } from '../data/questions';
import WebcamCapture from './WebcamCapture';
import { Clock, CheckCircle, ArrowRight, ArrowLeft } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

const Exam = () => {
    const navigate = useNavigate();
    const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
    const [answers, setAnswers] = useState({});
    const [timeLeft, setTimeLeft] = useState(600);
    const [examStarted, setExamStarted] = useState(false);
    const [isFinished, setIsFinished] = useState(false);

    const currentQuestion = questions[currentQuestionIndex];

    useEffect(() => {
        let timer;
        if (examStarted && !isFinished && timeLeft > 0) {
            timer = setInterval(() => {
                setTimeLeft((prev) => prev - 1);
            }, 1000);
        } else if (timeLeft === 0) {
            handleSubmit();
        }
        return () => clearInterval(timer);
    }, [examStarted, isFinished, timeLeft]);

    const handleOptionSelect = (optionIndex) => {
        setAnswers({
            ...answers,
            [currentQuestion.id]: optionIndex
        });
    };

    const handleNext = () => {
        if (currentQuestionIndex < questions.length - 1) {
            setCurrentQuestionIndex(prev => prev + 1);
        }
    };

    const handlePrev = () => {
        if (currentQuestionIndex > 0) {
            setCurrentQuestionIndex(prev => prev - 1);
        }
    };

    const handleSubmit = () => {
        setIsFinished(true);
        console.log("Exam Submitted", answers);
    };

    const formatTime = (seconds) => {
        const mins = Math.floor(seconds / 60);
        const secs = seconds % 60;
        return `${mins}:${secs < 10 ? '0' : ''}${secs}`;
    };

    if (!examStarted) {
        return (
            <div className="full-screen-center animate-fade-in">
                <div className="glass-panel" style={{ maxWidth: '600px', textAlign: 'center' }}>
                    <h1 className="text-gradient">Physics 101 Midterm</h1>
                    <p style={{ fontSize: '1.2rem', margin: '1.5rem 0' }}>
                        Duration: 10 Minutes • {questions.length} Questions
                    </p>

                    <div style={{
                        margin: '2rem 0',
                        padding: '1.5rem',
                        background: 'rgba(0,0,0,0.2)',
                        borderRadius: '12px',
                        textAlign: 'left'
                    }}>
                        <h3 className="mb-4">Instructions</h3>
                        <ul style={{ paddingLeft: '20px', color: 'var(--text-secondary)', lineHeight: '1.8' }}>
                            <li>Ensure your webcam is enabled and face is visible.</li>
                            <li>Do not leave the full-screen window.</li>
                            <li>Answer all questions before time runs out.</li>
                            <li>The system monitors emotional responses for analytics.</li>
                        </ul>
                    </div>

                    <button className="btn-primary" style={{ fontSize: '1.2rem', padding: '0.8em 2.5em' }} onClick={() => setExamStarted(true)}>
                        Start Exam Session
                    </button>
                    <p style={{ marginTop: '1rem', fontSize: '0.9rem', opacity: 0.6 }}>
                        By clicking start, you consent to being recorded.
                    </p>
                </div>
            </div>
        );
    }

    if (isFinished) {
        return (
            <div className="full-screen-center animate-fade-in">
                <div className="glass-panel" style={{ textAlign: 'center', padding: '3rem' }}>
                    <div style={{ marginBottom: '1.5rem' }}>
                        <CheckCircle size={80} color="var(--success)" style={{ margin: '0 auto' }} />
                    </div>
                    <h2 className="text-gradient">Exam Submitted!</h2>
                    <p>Your responses have been recorded successfully.</p>
                    <div className="mt-4">
                        <button className="btn-secondary" onClick={() => navigate('/')}>Return Home</button>
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div className="container animate-slide-up">
            {/* Header */}
            <div className="glass-panel flex-between mb-4" style={{ padding: '1rem 2rem' }}>
                <h3 style={{ margin: 0 }}>Physics 101</h3>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.8rem', fontSize: '1.2rem', fontWeight: 'bold' }}>
                    <Clock size={20} color={timeLeft < 60 ? 'var(--danger)' : 'var(--text-secondary)'} />
                    <span style={{ color: timeLeft < 60 ? 'var(--danger)' : 'var(--text-primary)' }}>
                        {formatTime(timeLeft)}
                    </span>
                </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0, 1fr) 300px', gap: '2rem', alignItems: 'start' }}>
                {/* Question Area */}
                <div className="glass-panel" style={{ minHeight: '500px', display: 'flex', flexDirection: 'column' }}>
                    <div className="flex-between mb-4">
                        <span style={{ color: 'var(--text-secondary)', textTransform: 'uppercase', fontSize: '0.8rem', letterSpacing: '1px' }}>
                            Question {currentQuestionIndex + 1} of {questions.length}
                        </span>
                        <span style={{ background: 'rgba(59, 130, 246, 0.2)', color: 'var(--primary)', padding: '2px 8px', borderRadius: '4px', fontSize: '0.8rem', fontWeight: 'bold' }}>
                            {currentQuestion.concept}
                        </span>
                    </div>

                    <h2 style={{ marginBottom: '2rem', fontWeight: '500' }}>{currentQuestion.question}</h2>

                    <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem', flex: 1 }}>
                        {currentQuestion.options.map((option, idx) => {
                            const isSelected = answers[currentQuestion.id] === idx;
                            return (
                                <button
                                    key={idx}
                                    onClick={() => handleOptionSelect(idx)}
                                    style={{
                                        textAlign: 'left',
                                        padding: '1.2rem',
                                        background: isSelected ? 'rgba(59, 130, 246, 0.15)' : 'rgba(255,255,255,0.03)',
                                        border: isSelected ? '1px solid var(--primary)' : '1px solid transparent',
                                        transition: 'all 0.2s',
                                        display: 'flex',
                                        alignItems: 'center'
                                    }}
                                >
                                    <span style={{
                                        width: '28px', height: '28px',
                                        borderRadius: '50%',
                                        background: isSelected ? 'var(--primary)' : 'rgba(255,255,255,0.1)',
                                        color: isSelected ? 'white' : 'var(--text-secondary)',
                                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                                        fontWeight: 'bold', fontSize: '0.9rem', marginRight: '1rem'
                                    }}>
                                        {String.fromCharCode(65 + idx)}
                                    </span>
                                    {option}
                                </button>
                            );
                        })}
                    </div>

                    <div className="flex-between" style={{ marginTop: '3rem', paddingTop: '1.5rem', borderTop: '1px solid var(--glass-border)' }}>
                        <button className="btn-secondary" onClick={handlePrev} disabled={currentQuestionIndex === 0} style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                            <ArrowLeft size={16} /> Previous
                        </button>

                        {currentQuestionIndex === questions.length - 1 ? (
                            <button className="btn-success" onClick={handleSubmit} style={{ padding: '0.8em 2em', fontWeight: 'bold' }}>
                                Submit Exam
                            </button>
                        ) : (
                            <button className="btn-primary" onClick={handleNext} style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                                Next Question <ArrowRight size={16} />
                            </button>
                        )}
                    </div>
                </div>

                {/* Sidebar / Progress */}
                <div className="glass-panel">
                    <h3 className="mb-4">Progress</h3>
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '0.8rem' }}>
                        {questions.map((q, idx) => (
                            <div
                                key={q.id}
                                style={{
                                    aspectRatio: '1',
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    borderRadius: '8px',
                                    background: currentQuestionIndex === idx ? 'var(--primary)' : (answers[q.id] !== undefined ? 'rgba(59, 130, 246, 0.3)' : 'rgba(255,255,255,0.05)'),
                                    color: currentQuestionIndex === idx ? 'white' : (answers[q.id] !== undefined ? 'var(--primary-hover)' : 'var(--text-secondary)'),
                                    cursor: 'pointer',
                                    fontWeight: 'bold',
                                    border: currentQuestionIndex === idx ? '2px solid white' : '1px solid transparent',
                                    transition: 'all 0.2s'
                                }}
                                onClick={() => setCurrentQuestionIndex(idx)}
                            >
                                {idx + 1}
                            </div>
                        ))}
                    </div>

                    <div style={{ marginTop: '2rem', padding: '1.5rem', background: 'rgba(0,0,0,0.2)', borderRadius: '12px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.5rem', color: 'var(--text-primary)' }}>
                            <span className="animate-pulse" style={{ width: '8px', height: '8px', background: 'var(--danger)', borderRadius: '50%' }}></span>
                            <strong>Live Proctoring</strong>
                        </div>
                        <p style={{ fontSize: '0.85rem', margin: 0 }}>
                            Your session is being analyzed for confusion and engagement metrics.
                        </p>
                    </div>
                </div>
            </div>

            <WebcamCapture currentConcept={currentQuestion.concept} />
        </div>
    );
};

export default Exam;
