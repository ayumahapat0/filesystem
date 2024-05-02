/**
 * Controllers used in User API
 * @fileoverview
 */

import { CookieOptions, Request, Response } from 'express';
import { $Enums, Prisma, PrismaClient } from '@prisma/client';
import * as jwt from 'jsonwebtoken';
import bcrypt from 'bcrypt';

import { prisma } from '../connectPrisma';
import { deleteFilesByOwner } from './file';
import { deleteDirsByOwner } from './directory';
import { directoryControllers } from './directory';
import { User } from '../utils/user';
import { errorHandler } from '../utils/errorHandler';
import { TOKEN, validateEmail } from '../utils/constants';
import { Role } from '../utils/constants';
import { JWT_SECRET } from '../utils/constants';
import { validatePassword } from '../utils/constants';

/**
 * Generate access token
 * @param userId: number
 * @param name: number
 * @param userRole: Role
 *
 * @return Signed access token
 */
export const generateAccessToken = (
  userId: number,
  name: string,
  userRole: string,
) => {
  console.log(`user role: ${userRole}`);
  return jwt.sign(
    { id: userId.toString(), name: name, role: userRole },
    JWT_SECRET as jwt.Secret,
    {
      expiresIn: TOKEN.Access.limit,
    },
  );
};

/**
 * Verify a signed token
 * @param token
 * @return Token content
 */
// const verifyToken = (token: string) => {
//   return jwt.verify(token, JWT_SECRET as jwt.Secret);
// };

/**
 * Process new user data
 * and use is to update user
 * @param user: User
 * @param res: Response
 *
 * @return updatedUser
 *
 */
const updateUser = async (user: User, res: Response) => {
  // Update user record in the database
  try {
    const updatedUser = await prisma.user.update({
      where: { id: user.id },
      data: {
        id: user.id,
        name: user.name,
        email: user.email,
        rootDirId: user.rootDirId,
      },
      // Omit password field from the returned user object
      select: {
        id: true,
        name: true,
        email: true,
        rootDirId: true,
        role: true,
        createdAt: true,
        updatedAt: true,
      },
    });
    return updatedUser;
  } catch (error: any) {
    errorHandler.handleError(error, res);
  }
};

/**
 * Create a new request for creating root directory
 * and use is to call addRootDirectory
 * @param user: User
 * @param req: Request
 * @param res: Response
 *
 * @return newRootDir
 *
 * @throws ForbiddenError
 *
 */
const createRootDir = async (user: User, req: Request, res: Response) => {
  const addRootDirRequest = Object.assign({}, req, {
    ...req,
    body: {
      name: 'root',
      path: '',
      ownerId: user.id,
    },
  }) as Request;
  try {
    const newRootDir = await directoryControllers.addRootDirectory(
      addRootDirRequest,
      res,
    );
    if (!newRootDir) {
      throw errorHandler.ForbiddenError('Root directory creation failed');
    }
    return newRootDir;
  } catch (error: any) {
    errorHandler.handleError(error, res);
  }
};

export const hashPassword = (password: string) => {
  return bcrypt.hashSync(password, 12);
};

export const userControllers = {
  //List of users
  getUsers: async (req: Request, res: Response) => {
    try {
      const users = await prisma.user.findMany();
      res.send({ user: users });
    } catch (error: any) {
      errorHandler.handleError(error, res);
    }
  },
  // Create and register a User
  // Register a user
  signUp: async (req: Request, res: Response) => {
    try {
      let user: Prisma.UserCreateInput;
      const { name, email, password } = req.body;

      // Validate the email
      const checkEmail = validateEmail(email);
      if (!checkEmail) {
        const message = 'Please input a valid email';
        throw errorHandler.ValidationError(message);
      }

      // Validate the password
      const checkPassword = validatePassword(password);
      if (!checkPassword) {
        const message =
          'Please input a password ' +
          'with the following requirements: ' +
          '8 or more characters, ' +
          'at least one uppercase letter, lowercase letter, and digit.';
        throw errorHandler.ValidationError(message);
      }
      const hashedPassword = hashPassword(password);
      user = {
        name: name,
        email: email,
        password: hashedPassword,
      };
      console.log(`email ${user.email}`);
      const newUser = await prisma.user.create({ data: user });
      // Generate new tokens
      const accessToken = generateAccessToken(
        newUser.id,
        newUser.name,
        newUser.role,
      );

      // Create a root directory for new user
      const newRootDir = await createRootDir(
        {
          id: newUser.id,
          name: newUser.name,
          email: newUser.email,
        },
        req,
        res,
      );
      const updatedUser = await updateUser(
        {
          id: newUser.id,
          name: newUser.name,
          email: newUser.email,
          rootDirId: newRootDir?.id,
        },
        res,
      );
      res.status(201).send({ authToken: accessToken, user: updatedUser });
    } catch (error: any) {
      console.log(`${error.code}`);
      if (error.code === 'P2002') {
        const message = `User with the same email already exists.`;
        error = errorHandler.DuplicationError(message);
      }
      errorHandler.handleError(error, res);
    }
  },

  // Authenticate a user using email/password
  loginWithPassword: async (req: Request, res: Response) => {
    const existUser = req.authenticatedUser;

    try {
      // const existUser = req.authenticatedUser;
      const { password, ...user } = existUser;

      const inputPassword: string = req.body.password;
      const result = await bcrypt.compare(inputPassword, password);

      if (result) {
        // Generate new tokens
        const accessToken = generateAccessToken(
          existUser.id,
          existUser.name,
          existUser.role,
        );
        res.json({
          message: `${existUser?.name} LOG IN successfully`,
          authToken: accessToken,
          user: user,
        });
        return;
      } else {
        throw errorHandler.UnauthorizedError('Incorrect password');
      }
    } catch (error: any) {
      errorHandler.handleError(error, res);
    }
  },

  // Update User information
  updateUserById: async (req: Request, res: Response) => {
    try {
      if (!req.body?.userId) {
        throw errorHandler.InvalidBodyParamError('userId');
      }
      // Extract updated user data from request body
      const { name, email, userId, rootDirId } = req.body;

      const existingUser = req.authenticatedUser;

      // Update user record in the database
      const updatedUser = await updateUser(
        {
          id: userId,
          name: name || existingUser.name, // Update name if provided, otherwise keep existing value
          email: email || existingUser.email, // Update email if provided, otherwise keep existing value
          rootDirId: rootDirId || existingUser.rootDirId,
        },
        res,
      );
      res.status(200).send({ user: updatedUser });
    } catch (error: any) {
      errorHandler.handleError(error, res);
    }
  },

  // Delete a user with the specified id and all related data
  // Only ADMIN user has authority to do so
  deleteUserById: async (req: Request, res: Response) => {
    try {
      if (!req.query?.userId) {
        throw errorHandler.InvalidQueryParamError('userId');
      }
      const userId = parseInt(req.query?.userId as string);
      const user = await prisma.user.delete({
        where: {
          id: userId,
        },
        // Omit password field from the returned user object
        select: {
          id: true,
          name: true,
          email: true,
          rootDirId: true,
          role: true,
        },
      });
      deleteFilesByOwner(userId, res);
      deleteDirsByOwner(userId, res);
      // TODO: Delete related records in Permission table

      res.status(200).send({
        message: `${user.name} and related records are deleted`,
        user: user,
      });
    } catch (error: any) {
      errorHandler.handleError(error, res);
    }
  },

  // logout user
  userLogout: async (req: Request, res: Response) => {
    try {
      res.json({
        message: `LOG OUT successfully`,
      });
    } catch (error: any) {
      errorHandler.handleError(error, res);
    }
  },
};
