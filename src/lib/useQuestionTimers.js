import { useRef, useCallback, useEffect } from 'react';

/**
 * Custom hook for managing per-question timers efficiently using refs.
 * This design prevents re-renders when timer values update - only the
 * display component needs to re-render, not the entire exam.
 * 
 * @param {number} questionCount - Total number of questions
 * @returns {Object} Timer control functions
 */
const useQuestionTimers = (questionCount) => {
    // Store elapsed time for each question (in seconds)
    const questionTimes = useRef(
        Array.from({ length: questionCount }, () => 0)
    );

    // Track which question is currently being timed
    const activeQuestionIndex = useRef(null);

    // Store the interval ID for cleanup
    const intervalRef = useRef(null);

    // Track when the current question timer started (for accurate timing)
    const startTimeRef = useRef(null);

    // Track if all timers are stopped (exam ended)
    const isStoppedRef = useRef(false);

    /**
     * Start or resume timing for a specific question
     */
    const startTimer = useCallback((questionIndex) => {
        if (isStoppedRef.current) return;

        // Clear any existing interval
        if (intervalRef.current) {
            clearInterval(intervalRef.current);
        }

        activeQuestionIndex.current = questionIndex;
        startTimeRef.current = Date.now();

        // Start the interval - updates the ref every second
        intervalRef.current = setInterval(() => {
            if (activeQuestionIndex.current !== null && !isStoppedRef.current) {
                const elapsed = Math.floor((Date.now() - startTimeRef.current) / 1000);
                const baseTime = questionTimes.current[activeQuestionIndex.current] || 0;
                // Store accumulated time + current session time
                questionTimes.current[activeQuestionIndex.current] = baseTime;
            }
        }, 1000);
    }, []);

    /**
     * Pause the timer for the current question
     * Called when navigating away from a question
     */
    const pauseTimer = useCallback((questionIndex) => {
        if (intervalRef.current) {
            clearInterval(intervalRef.current);
            intervalRef.current = null;
        }

        // Calculate and save the elapsed time for this session
        if (startTimeRef.current !== null && questionIndex !== null) {
            const elapsed = Math.floor((Date.now() - startTimeRef.current) / 1000);
            questionTimes.current[questionIndex] =
                (questionTimes.current[questionIndex] || 0) + elapsed;
        }

        startTimeRef.current = null;
    }, []);

    /**
     * Stop all timers - called when exam ends
     */
    const stopAllTimers = useCallback(() => {
        isStoppedRef.current = true;

        // Pause the active timer to save its final time
        if (activeQuestionIndex.current !== null) {
            pauseTimer(activeQuestionIndex.current);
        }

        activeQuestionIndex.current = null;
    }, [pauseTimer]);

    /**
     * Get the current elapsed time for a specific question
     * This calculates real-time if the question is active
     */
    const getQuestionTime = useCallback((questionIndex) => {
        const baseTime = questionTimes.current[questionIndex] || 0;

        // If this is the active question, add the current session time
        if (activeQuestionIndex.current === questionIndex && startTimeRef.current !== null) {
            const currentSession = Math.floor((Date.now() - startTimeRef.current) / 1000);
            return baseTime + currentSession;
        }

        return baseTime;
    }, []);

    /**
     * Get the current active question's time (for UI display)
     * Returns a function that can be called to get the latest time
     */
    const getCurrentQuestionTime = useCallback(() => {
        if (activeQuestionIndex.current === null) return 0;
        return getQuestionTime(activeQuestionIndex.current);
    }, [getQuestionTime]);

    /**
     * Get all question times as an object (for submission)
     */
    const getAllTimes = useCallback(() => {
        const times = {};
        questionTimes.current.forEach((time, index) => {
            // If this is the active question, include current session
            if (activeQuestionIndex.current === index && startTimeRef.current !== null) {
                const currentSession = Math.floor((Date.now() - startTimeRef.current) / 1000);
                times[index + 1] = time + currentSession;
            } else {
                times[index + 1] = time;
            }
        });
        return times;
    }, []);

    /**
     * Get total exam time
     */
    const getTotalTime = useCallback(() => {
        return Object.values(getAllTimes()).reduce((sum, time) => sum + time, 0);
    }, [getAllTimes]);

    // Cleanup on unmount
    useEffect(() => {
        return () => {
            if (intervalRef.current) {
                clearInterval(intervalRef.current);
            }
        };
    }, []);

    return {
        startTimer,
        pauseTimer,
        stopAllTimers,
        getQuestionTime,
        getCurrentQuestionTime,
        getAllTimes,
        getTotalTime
    };
};

export default useQuestionTimers;
