import rateLimit from 'express-rate-limit';


/** Strict limiter for auth endpoints */
export const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 10,
  message: {
    success: false,
    error: {
      code: 'RATE_LIMIT_EXCEEDED',
      message: 'Too many attempts. Please try again in 15 minutes.',
      details: null,
    },
  },
  standardHeaders: true,
  legacyHeaders: false,
  
});

/** Limiter for password reset */
export const passwordResetLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 5,
  message: {
    success: false,
    error: {
      code: 'RATE_LIMIT_EXCEEDED',
      message: 'Too many reset attempts. Please try again in 1 hour.',
      details: null,
    },
  },
  standardHeaders: true,
  legacyHeaders: false,

});

/** General API limiter */
export const generalLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  max: 200,
  standardHeaders: true,
  legacyHeaders: false,
 
});
