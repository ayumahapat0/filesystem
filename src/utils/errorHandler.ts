/**
 * Error Types Definitions and Error Handler
 * @fileoverview
 */
import { Response } from 'express';

// Error enum
const ERROR = {
  ValidationError: 'ValidationError',
  InvalidBodyParamError: 'InvalidBodyParamError',
  InvalidQueryParamError: 'InvalidQueryParamError',
  UnauthorizedError: 'UnauthorizedError',
  ForbiddenError: 'ForbiddenError',
  UserNotFoundError: 'UserNotFoundError',
  RecordNotFoundError: 'RecordNotFoundError',
  InvalidOperationError: 'InvalidOperationError',
  DuplicationError: 'DuplicationError',
  TokenExpiredError: 'TokenExpiredError',
  // TokenExpiredError: 'TokenExpiredError',
};

export interface Error {
  name: string;
  status: number;
  message: string;
  param?: string;
}

export const errorHandler = {
  /**
   * Custom error with the same
   * name as mySQL ValidationError
   * Thrown when input field is invalid
   * @param message with error details
   * @return ValidationError
   */
  ValidationError: (message: string) => {
    return { name: ERROR.ValidationError, status: 400, message };
  },

  /**
   * Thrown when input parameter is invalid
   * @return InvalidBodyParamError
   */
  InvalidBodyParamError: (param: string) => {
    const message: string = `${param} is invalid or missing in the body`;
    return { name: ERROR.InvalidBodyParamError, status: 400, message };
  },

  /**
   * Thrown when input parameter is invalid
   * @return InvalidQueryParamError
   */
  InvalidQueryParamError: (param: string) => {
    const message: string = `${param} is invalid or missing in the query`;
    return { name: ERROR.InvalidQueryParamError, status: 400, message };
  },

  /**
   * Thrown when a document with duplicate
   * value on a unique field is inserted
   * @param message Message with error details
   * @return DuplicationError
   */
  DuplicationError: (message: string) => {
    return { name: ERROR.DuplicationError, status: 409, message };
  },

  /**
   * Thrown when a request is unauthorized
   * @param message Message with error details
   * @return ForbiddenError
   */
  ForbiddenError: (message: string) => {
    return { name: ERROR.ForbiddenError, status: 403, message };
  },

  /**
   * Thrown when a User is not found
   * by using the param on an API route
   * @param message Message with error details
   * @return UserNotFoundError
   */
  UserNotFoundError: (message: string) => {
    return { name: ERROR.UserNotFoundError, status: 404, message };
  },

  /**
   * Thrown when a db record is not found
   * by using the param on an API route
   * @param message Message with error details
   * @return UserNotFoundError
   */
  RecordNotFoundError: (message: string) => {
    return { name: ERROR.RecordNotFoundError, status: 404, message };
  },

  /**
   * Thrown when a authorization fail
   * by using the param on an API route
   * @param message Message with error details
   * @return UnauthorizedError
   */
  UnauthorizedError: (message: string) => {
    return { name: ERROR.UnauthorizedError, status: 401, message };
  },

  /**
   *
   * Thrown when a TokenExpiredError fail
   * by using the param on an API route
   * @param message Message with error details
   * @return TokenExpiredError
   */
  TokenExpiredError: (message: string) => {
    return { name: ERROR.TokenExpiredError, status: 401, message };
  },

  handleError: (error: Error, res: Response) => {
    console.log(error);
    if (Object.values(ERROR).includes(error.name)) {
      res.status(error.status);
      res.json({
        error: error.name,
        status: error.status,
        message: error.message,
      });
    } else {
      res.status(500);
      res.json({
        error: 'UNKNOWN ERROR',
        status: 500,
        message: `unknownError: ${error}`,
      });
    }
  },
};
