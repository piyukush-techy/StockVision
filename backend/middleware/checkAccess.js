// middleware/checkAccess.js - Feature Access Control Middleware

/**
 * Simple feature access middleware
 * For development: allows all requests
 * 
 * Usage: checkAccess('feature_name', freeLimit)
 * Example: checkAccess('scanner', 10) means FREE users get 10 uses/month
 * 
 * When subscription system is ready, this will check:
 * - User's subscription tier (FREE, PRO, PREMIUM, ADMIN)
 * - Monthly usage limits per feature
 * - Return 403 if limit exceeded
 */

function checkAccess(featureName, freeLimit = 10) {
  return async (req, res, next) => {
    // For development: allow all requests
    // No subscription system yet, so skip all checks
    
    try {
      // TODO: When subscription system is enabled:
      // 1. Get sessionId from request
      // 2. Find or create subscription
      // 3. Check tier and limits
      // 4. Increment usage counter
      // 5. Return 403 if limit exceeded
      
      // For now: allow everything
      next();
      
    } catch (error) {
      console.error('Error in checkAccess middleware:', error);
      // On error, allow request to proceed (fail open)
      next();
    }
  };
}

// Export as default function
module.exports = checkAccess;
