// utils/LoggingUtility.ts

/**
 * Centralized logging utility for the PopLove app
 * Provides consistent logging with module names, timestamps, and severity levels
 * Can be configured to send logs to a remote service in the future
 */

// Log levels
export enum LogLevel {
    DEBUG = 'DEBUG',
    INFO = 'INFO',
    WARN = 'WARN',
    ERROR = 'ERROR'
  }
  
  // Interface for log event
  interface LogEvent {
    timestamp: string;
    level: LogLevel;
    module: string;
    message: string;
    data?: any;
  }
  
  // Configure whether to show debug logs in development
  const SHOW_DEBUG_LOGS = true;
  
  // In-memory log storage for viewing recent logs if needed
  let recentLogs: LogEvent[] = [];
  const MAX_RECENT_LOGS = 100;
  
  /**
   * Main logging function
   */
  export const logEvent = (
    level: LogLevel,
    module: string,
    message: string,
    data?: any
  ): void => {
    // Skip debug logs based on configuration
    if (level === LogLevel.DEBUG && !SHOW_DEBUG_LOGS) {
      return;
    }
  
    const timestamp = new Date().toISOString();
    const logEvent: LogEvent = {
      timestamp,
      level,
      module,
      message,
      data
    };
  
    // Store log in memory
    recentLogs.unshift(logEvent);
    if (recentLogs.length > MAX_RECENT_LOGS) {
      recentLogs.pop();
    }
  
    // Format the log message
    let formattedMessage = `[${timestamp}] [${level}] [${module}] ${message}`;
    
    // Determine which console method to use based on level
    switch (level) {
      case LogLevel.DEBUG:
        console.log(formattedMessage, data ? data : '');
        break;
      case LogLevel.INFO:
        console.info(formattedMessage, data ? data : '');
        break;
      case LogLevel.WARN:
        console.warn(formattedMessage, data ? data : '');
        break;
      case LogLevel.ERROR:
        console.error(formattedMessage, data ? data : '');
        break;
    }
  
    // Future enhancement: send logs to a remote service
    // sendToRemoteLoggingService(logEvent);
  };
  
  // Convenience methods for different log levels
  export const logDebug = (module: string, message: string, data?: any): void => {
    logEvent(LogLevel.DEBUG, module, message, data);
  };
  
  export const logInfo = (module: string, message: string, data?: any): void => {
    logEvent(LogLevel.INFO, module, message, data);
  };
  
  export const logWarn = (module: string, message: string, data?: any): void => {
    logEvent(LogLevel.WARN, module, message, data);
  };
  
  export const logError = (module: string, message: string, data?: any): void => {
    logEvent(LogLevel.ERROR, module, message, data);
  };
  
  /**
   * Get recent logs (for a debug view if needed)
   */
  export const getRecentLogs = (): LogEvent[] => {
    return [...recentLogs];
  };
  
  /**
   * Clear recent logs
   */
  export const clearRecentLogs = (): void => {
    recentLogs = [];
  };
  
  /**
   * Function that times the execution of async functions and logs the duration
   */
  export const withTiming = async <T>(
    module: string,
    functionName: string,
    fn: () => Promise<T>
  ): Promise<T> => {
    const startTime = Date.now();
    try {
      logDebug(module, `⏱️ Starting: ${functionName}`);
      const result = await fn();
      const duration = Date.now() - startTime;
      logDebug(module, `⏱️ Completed: ${functionName} in ${duration}ms`);
      return result;
    } catch (error) {
      const duration = Date.now() - startTime;
      logError(module, `⏱️ Failed: ${functionName} after ${duration}ms`, error);
      throw error;
    }
  };
  
  /**
   * Create a logger for a specific module for convenience
   */
  export const createLogger = (module: string) => {
    return {
      debug: (message: string, data?: any) => logDebug(module, message, data),
      info: (message: string, data?: any) => logInfo(module, message, data),
      warn: (message: string, data?: any) => logWarn(module, message, data),
      error: (message: string, data?: any) => logError(module, message, data),
      withTiming: <T>(functionName: string, fn: () => Promise<T>) => 
        withTiming(module, functionName, fn)
    };
  };
  
  export default {
    logDebug,
    logInfo,
    logWarn,
    logError,
    getRecentLogs,
    clearRecentLogs,
    withTiming,
    createLogger
  };