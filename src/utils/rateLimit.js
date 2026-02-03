/**
 * Rate limiting and optimization utilities
 */

/**
 * Creates a debounced function that delays invoking func until after wait ms
 * have elapsed since the last time the debounced function was invoked.
 */
export const debounce = (func, wait) => {
    let timeout;
    return function executedFunction(...args) {
        const later = () => {
            clearTimeout(timeout);
            func(...args);
        };
        clearTimeout(timeout);
        timeout = setTimeout(later, wait);
    };
};

/**
 * Creates a throttled function that only invokes func at most once per every wait ms.
 */
export const throttle = (func, wait) => {
    let inThrottle;
    return function executedFunction(...args) {
        if (!inThrottle) {
            func(...args);
            inThrottle = true;
            setTimeout(() => inThrottle = false, wait);
        }
    };
};

/**
 * Rate limiter class for tracking and limiting actions
 */
export class RateLimiter {
    constructor(maxAttempts, windowMs) {
        this.maxAttempts = maxAttempts;
        this.windowMs = windowMs;
        this.attempts = [];
    }

    /**
     * Check if action is allowed
     * @returns {boolean} true if allowed, false if rate limited
     */
    isAllowed() {
        const now = Date.now();
        // Remove old attempts outside the window
        this.attempts = this.attempts.filter(time => now - time < this.windowMs);

        if (this.attempts.length >= this.maxAttempts) {
            return false;
        }

        this.attempts.push(now);
        return true;
    }

    /**
     * Get remaining time until next allowed attempt (in seconds)
     */
    getWaitTime() {
        if (this.attempts.length === 0) return 0;
        const oldestAttempt = Math.min(...this.attempts);
        const waitTime = Math.ceil((this.windowMs - (Date.now() - oldestAttempt)) / 1000);
        return Math.max(0, waitTime);
    }

    /**
     * Reset the rate limiter
     */
    reset() {
        this.attempts = [];
    }
}

/**
 * Creates a function that can only be called once
 */
export const once = (func) => {
    let called = false;
    let result;
    return function executedFunction(...args) {
        if (!called) {
            called = true;
            result = func(...args);
        }
        return result;
    };
};

/**
 * Simple memoization for expensive computations
 */
export const memoize = (func) => {
    const cache = new Map();
    return function executedFunction(...args) {
        const key = JSON.stringify(args);
        if (cache.has(key)) {
            return cache.get(key);
        }
        const result = func(...args);
        cache.set(key, result);
        return result;
    };
};
