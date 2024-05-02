/**
 * Middleware used in User API
 * @fileoverview
 */

import { Response, Request, NextFunction } from 'express';
import { Prisma, Role } from '@prisma/client';

import { prisma } from '../connectPrisma';
import { errorHandler } from '../utils/errorHandler';

// Define a custom property 'user' on the Request object
declare global {
  namespace Express {
    interface Request {
      authenticatedUser?: any; // Change 'any' to the type of your user object if possible
    }
  }
}

/**
 *
 * Validate Whether UserId exist in database
 * userId is stored in field 'userId' of req.body
 * @throw UserNotFoundError
 */

export const userExist = async (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  try {
    let user: Prisma.UserFindUniqueArgs;
    const userId = parseInt(req.authenticatedUser?.id);
    if (!userId) {
      throw errorHandler.UnauthorizedError('Middleware auth failed');
    }
    user = {
      where: { id: userId },
      select: {
        id: true,
        password: true,
        role: true,
      },
    };
    const existUser = await prisma.user.findUnique(user);
    if (!existUser) {
      throw errorHandler.UserNotFoundError(
        'User does not exist, fail to process request',
      );
    }
    req.authenticatedUser = existUser;
    next();
  } catch (error: any) {
    errorHandler.handleError(error, res);
  }
};

/**
 *
 * Validate Whether UserId exist in database
 * userId is stored in req.query.id
 * @throw UserNotFoundError
 */

export const userExistInQuery = async (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  try {
    let user: Prisma.UserFindUniqueArgs;
    const userId = parseInt(req.query.userId as string);
    user = { where: { id: userId } };
    if (!userId) {
      throw errorHandler.InvalidQueryParamError(
        'Middleware auth failed: userId not in request.query',
      );
    }
    const existUser = await prisma.user.findUnique(user);
    if (!existUser) {
      throw errorHandler.UserNotFoundError(
        `User with id ${userId} does not exist`,
      );
    }
    req.authenticatedUser = existUser;
    next();
  } catch (error: any) {
    errorHandler.handleError(error, res);
  }
};

/**
 *
 * Validate Whether email exist in database
 * before autheticate user login
 * @throw UserNotFoundError
 */

export const userExistByEmail = async (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  try {
    let user: Prisma.UserFindUniqueArgs;
    const { email } = req.body;
    user = {
      where: { email: email },
      select: {
        id: true,
        name: true,
        email: true,
        rootDirId: true,
        password: true,
        role: true,
      },
    };
    if (!email) {
      throw errorHandler.InvalidBodyParamError('email');
    }
    const existUser = await prisma.user.findUnique(user);
    if (!existUser) {
      throw errorHandler.UserNotFoundError(
        'User does not exist, please signup',
      );
    }
    req.authenticatedUser = existUser;
    next();
  } catch (error: any) {
    errorHandler.handleError(error, res);
  }
};

/**
 * Check administration access
 * @throw ForbiddenError
 */
export const userIsAdmin = (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  try {
    const { authenticatedUser } = req;
    if (!authenticatedUser || authenticatedUser.role !== Role.ADMIN) {
      const message =
        'Current user does not have access to specified resource.';
      throw errorHandler.ForbiddenError(message);
    }
    next();
  } catch (error: any) {
    errorHandler.handleError(error, res);
  }
};

/**
 * Check authorization for account deletion
 * @throw ForbiddenError
 * @throw UnauthorizedError
 */
export const canDeleteUser = (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  try {
    const { authenticatedUser } = req;
    if (!authenticatedUser) {
      const message =
        'Current user does not have access to specified resource.';
      throw errorHandler.ForbiddenError(message);
    }
    if (authenticatedUser.role === Role.ADMIN) {
      next();
    } else if (authenticatedUser.role == Role.USER) {
      if (!req.query?.userId) {
        throw errorHandler.InvalidQueryParamError('userId');
      }
      if (authenticatedUser.id === parseInt(req.query.userId as string)) {
        next();
      } else {
        console.log(authenticatedUser.id);
        console.log(typeof authenticatedUser.id);

        console.log(parseInt(req.query.userId as string));
        console.log(typeof parseInt(req.query.userId as string));

        throw errorHandler.UnauthorizedError(
          'Request User has no permission to delete this account',
        );
      }
    } else {
      throw errorHandler.ForbiddenError(
        'authenticated User has an invalid Role',
      );
    }
  } catch (error: any) {
    errorHandler.handleError(error, res);
  }
};
