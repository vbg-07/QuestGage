import React, { useState, useEffect, useCallback, memo } from 'react';
import { questions } from '../data/questions';
import WebcamCapture from './WebcamCapture';
import { Clock, CheckCircle, ArrowRight, ArrowLeft, Timer, User } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import useQuestionTimers from '../lib/useQuestionTimers';
import { storeTimingData } from '../utils/aws-config';

/**
 * Memoized timer display component - only this re-renders when time updates
 * This prevents the entire exam component from re-rendering every second
 */
const QuestionTimerDisplay = memo(({ getTime, isActive }) => {
    const [displayTime, setDisplayTime] = useState(0);

    useEffect(() => {
        if (!isActive) return;

        // Update display every second
        const updateDisplay = () => {
            setDisplayTime(getTime());
        };

        updateDisplay(); // Initial update
        const intervalId = setInterval(updateDisplay, 1000);

        return () => clearInterval(intervalId);
    }, [getTime, isActive]);

    const formatTime = (seconds) => {
        const mins = Math.floor(seconds / 60);
        const secs = seconds % 60;
        return `${mins}:${secs < 10 ? '0' : ''}${secs}`;
    };

    return (
        <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: '0.5rem',
            padding: '0.5rem 1rem',
            background: 'rgba(139, 92, 246, 0.15)',
            borderRadius: '8px',
            border: '1px solid rgba(139, 92, 246, 0.3)'
        }}>
            <Timer size={16} color="var(--accent)" />
            <span style={{
                color: 'var(--accent)',
                fontWeight: 'bold',
                fontFamily: 'monospace',
                fontSize: '1rem'
            }}>
                {formatTime(displayTime)}
            </span>
        </div>
    );
});

QuestionTimerDisplay.displayName = 'QuestionTimerDisplay';

const Exam = () => {
    const navigate = useNavigate();
    const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
    const [answers, setAnswers] = useState({});
    const [timeLeft, setTimeLeft] = useState(600);
    const [examStarted, setExamStarted] = useState(false);
    const [isFinished, setIsFinished] = useState(false);
    const [isSubmitting, setIsSubmitting] = useState(false);

    // New state for student identification
    const [studentId, setStudentId] = useState('');
    const [studentIdEntered, setStudentIdEntered] = useState(false);

    // Initialize question timers
    const {
        startTimer,
        pauseTimer,
        stopAllTimers,
        getCurrentQuestionTime,
        getAllTimes,
        getTotalTime
    } = useQuestionTimers(questions.length);

    const currentQuestion = questions[currentQuestionIndex];

    // Overall exam countdown timer
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

    // Start timer for the first question when exam starts
    useEffect(() => {
        if (examStarted && !isFinished) {
            startTimer(0);
        }
    }, [examStarted, isFinished, startTimer]);

    const handleOptionSelect = (optionIndex) => {
        setAnswers({
            ...answers,
            [currentQuestion.id]: optionIndex
        });
    };

    const handleNext = useCallback(() => {
        if (currentQuestionIndex < questions.length - 1) {
            // Pause current question timer
            pauseTimer(currentQuestionIndex);

            const nextIndex = currentQuestionIndex + 1;
            setCurrentQuestionIndex(nextIndex);

            // Start timer for next question
            startTimer(nextIndex);
        }
    }, [currentQuestionIndex, pauseTimer, startTimer]);

    const handlePrev = useCallback(() => {
        if (currentQuestionIndex > 0) {
            // Pause current question timer
            pauseTimer(currentQuestionIndex);

            const prevIndex = currentQuestionIndex - 1;
            setCurrentQuestionIndex(prevIndex);

            // Resume timer for previous question
            startTimer(prevIndex);
        }
    }, [currentQuestionIndex, pauseTimer, startTimer]);

    const handleQuestionJump = useCallback((targetIndex) => {
        if (targetIndex !== currentQuestionIndex) {
            // Pause current question timer
            pauseTimer(currentQuestionIndex);

            setCurrentQuestionIndex(targetIndex);

            // Start timer for target question
            startTimer(targetIndex);
        }
    }, [currentQuestionIndex, pauseTimer, startTimer]);

    const handleSubmit = useCallback(async () => {
        // Guard against double submissions
        if (isSubmitting || isFinished) return;

        setIsSubmitting(true);

        // Stop all timers
        stopAllTimers();

        setIsFinished(true);

        // Get all timing data
        const questionTimes = getAllTimes();
        const totalTime = getTotalTime();

        console.log("Exam Submitted", { answers, questionTimes, totalTime });

        // Store timing data to DynamoDB
        try {
            await storeTimingData(studentId, questionTimes, totalTime);
            console.log("Timing data stored successfully");
        } catch (error) {
            console.error("Failed to store timing data:", error);
        } finally {
            setIsSubmitting(false);
        }
    }, [stopAllTimers, getAllTimes, getTotalTime, answers, studentId, isSubmitting, isFinished]);

    const formatTime = (seconds) => {
        const mins = Math.floor(seconds / 60);
        const secs = seconds % 60;
        return `${mins}:${secs < 10 ? '0' : ''}${secs}`;
    };

    // Student ID entry screen
    if (!studentIdEntered) {
        return (
            <div className="full-screen-center animate-fade-in">
                <div className="glass-panel" style={{
                    maxWidth: '480px',
                    width: '100%',
                    textAlign: 'center',
                    padding: '3rem 2.5rem'
                }}>
                    {/* Icon */}
                    <div style={{
                        width: '80px',
                        height: '80px',
                        margin: '0 auto 2rem',
                        background: 'linear-gradient(135deg, rgba(59, 130, 246, 0.2) 0%, rgba(139, 92, 246, 0.2) 100%)',
                        borderRadius: '50%',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        border: '2px solid rgba(59, 130, 246, 0.3)'
                    }}>
                        <User size={36} color="var(--primary)" />
                    </div>

                    {/* Title */}
                    <h1 className="text-gradient" style={{
                        marginBottom: '0.75rem',
                        fontSize: '1.75rem'
                    }}>
                        Student Identification
                    </h1>

                    {/* Subtitle */}
                    <p style={{
                        fontSize: '1rem',
                        margin: '0 0 2.5rem',
                        color: 'var(--text-secondary)',
                        lineHeight: '1.6'
                    }}>
                        Enter your student ID or name to begin the examination
                    </p>

                    {/* Form */}
                    <form onSubmit={(e) => {
                        e.preventDefault();
                        if (studentId.trim()) {
                            setStudentIdEntered(true);
                        }
                    }}>
                        <div style={{ marginBottom: '1.75rem' }}>
                            <input
                                type="text"
                                value={studentId}
                                onChange={(e) => setStudentId(e.target.value)}
                                placeholder="Enter your Student ID"
                                style={{
                                    width: '100%',
                                    padding: '1.1rem 1.25rem',
                                    fontSize: '1.05rem',
                                    background: 'rgba(255,255,255,0.05)',
                                    border: '2px solid rgba(255,255,255,0.1)',
                                    borderRadius: '12px',
                                    color: 'var(--text-primary)',
                                    outline: 'none',
                                    transition: 'border-color 0.2s, box-shadow 0.2s',
                                    boxSizing: 'border-box'
                                }}
                                onFocus={(e) => {
                                    e.target.style.borderColor = 'var(--primary)';
                                    e.target.style.boxShadow = '0 0 0 4px rgba(59, 130, 246, 0.15)';
                                }}
                                onBlur={(e) => {
                                    e.target.style.borderColor = 'rgba(255,255,255,0.1)';
                                    e.target.style.boxShadow = 'none';
                                }}
                                autoFocus
                            />
                        </div>

                        <button
                            type="submit"
                            className="btn-primary"
                            style={{
                                width: '100%',
                                fontSize: '1.05rem',
                                padding: '1rem 2rem',
                                borderRadius: '12px',
                                fontWeight: '600'
                            }}
                            disabled={!studentId.trim()}
                        >
                            Continue to Exam
                        </button>
                    </form>

                    {/* Footer note */}
                    <p style={{
                        marginTop: '2rem',
                        fontSize: '0.85rem',
                        color: 'var(--text-secondary)',
                        opacity: 0.7
                    }}>
                        Your ID will be used to track your exam progress and analytics.
                    </p>
                </div>
            </div>
        );
    }

    // Exam instructions screen
    if (!examStarted) {
        return (
            <div className="full-screen-center animate-fade-in">
                <div className="glass-panel" style={{ maxWidth: '600px', textAlign: 'center' }}>
                    <h1 className="text-gradient">Physics 101 Midterm</h1>
                    <p style={{ fontSize: '1rem', margin: '0.5rem 0 1.5rem', color: 'var(--text-secondary)' }}>
                        Welcome, <strong style={{ color: 'var(--primary)' }}>{studentId}</strong>
                    </p>
                    <p style={{ fontSize: '1.2rem', margin: '1rem 0' }}>
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
                            <li><strong>Time spent on each question is tracked for analysis.</strong></li>
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
                    <p>Your responses and timing data have been recorded successfully.</p>
                    <p style={{ color: 'var(--text-secondary)', marginTop: '0.5rem' }}>
                        Student: <strong>{studentId}</strong>
                    </p>
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
                <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                    <h3 style={{ margin: 0 }}>Physics 101</h3>
                    <span style={{
                        fontSize: '0.85rem',
                        color: 'var(--text-secondary)',
                        padding: '0.25rem 0.75rem',
                        background: 'rgba(255,255,255,0.05)',
                        borderRadius: '4px'
                    }}>
                        {studentId}
                    </span>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '1.5rem' }}>
                    {/* Question Timer */}
                    <QuestionTimerDisplay
                        getTime={getCurrentQuestionTime}
                        isActive={examStarted && !isFinished}
                    />

                    {/* Overall Exam Timer */}
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.8rem', fontSize: '1.2rem', fontWeight: 'bold' }}>
                        <Clock size={20} color={timeLeft < 60 ? 'var(--danger)' : 'var(--text-secondary)'} />
                        <span style={{ color: timeLeft < 60 ? 'var(--danger)' : 'var(--text-primary)' }}>
                            {formatTime(timeLeft)}
                        </span>
                    </div>
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
                            <button
                                className="btn-success"
                                onClick={handleSubmit}
                                disabled={isSubmitting}
                                style={{
                                    padding: '0.8em 2em',
                                    fontWeight: 'bold',
                                    opacity: isSubmitting ? 0.6 : 1,
                                    cursor: isSubmitting ? 'not-allowed' : 'pointer'
                                }}
                            >
                                {isSubmitting ? 'Submitting...' : 'Submit Exam'}
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
                                onClick={() => handleQuestionJump(idx)}
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

            <WebcamCapture currentConcept={currentQuestion.concept} studentId={studentId} />
        </div>
    );
};

export default Exam;
