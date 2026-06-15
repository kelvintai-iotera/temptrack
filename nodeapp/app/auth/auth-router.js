import express from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import pkg from '@prisma/client';
import { getJwtSecret } from '../../config/jwt.js';
import { authMiddleware, adminMiddleware } from './auth-middleware.js';
import { AUTH_COOKIE_NAME, getAuthCookieOptions, getClearAuthCookieOptions } from './cookie-options.js';
import { loginRateLimiter } from './login-rate-limit.js';

const { PrismaClient } = pkg;
const prisma = new PrismaClient();
const router = express.Router();

const ALLOWED_ROLES = new Set(['admin', 'viewer']);

// @route   POST /auth/login
// @desc    Authenticate user & get token
router.post('/login', loginRateLimiter, async (req, res) => {
    const { username, password } = req.body;

    try {
        let user = await prisma.user.findUnique({ where: { username } });

        if (!user) {
            return res.status(400).json({ msg: 'Invalid Credentials' });
        }

        const isMatch = await bcrypt.compare(password, user.password);

        if (!isMatch) {
            return res.status(400).json({ msg: 'Invalid Credentials' });
        }

        const payload = {
            user: {
                id: user.id,
                username: user.username,
                role: user.role
            }
        };

        jwt.sign(
            payload,
            getJwtSecret(),
            { expiresIn: '7 days' },
            (err, token) => {
                if (err) throw err;
                res.cookie(AUTH_COOKIE_NAME, token, getAuthCookieOptions());
                res.json({ user: payload.user });
            }
        );
    } catch (err) {
        console.error(err.message);
        res.status(500).send('Server error');
    }
});

// @route   GET /auth/me
// @desc    Get logged in user details
router.get('/me', authMiddleware, async (req, res) => {
    try {
        const user = await prisma.user.findUnique({
            where: { id: req.user.id },
            select: { id: true, username: true, role: true, created_at: true }
        });
        res.json(user);
    } catch (err) {
        console.error(err.message);
        res.status(500).send('Server Error');
    }
});

// @route   POST /auth/logout
router.post('/logout', (req, res) => {
    res.clearCookie(AUTH_COOKIE_NAME, getClearAuthCookieOptions());
    res.json({ msg: 'Logged out successfully' });
});

// @route   POST /auth/change-password
// @desc    Change current user's password
router.post('/change-password', authMiddleware, async (req, res) => {
    const { currentPassword, newPassword } = req.body;

    if (typeof currentPassword !== 'string' || typeof newPassword !== 'string') {
        return res.status(400).json({ msg: 'Current and new password are required' });
    }
    if (newPassword.length < 8) {
        return res.status(400).json({ msg: 'New password must be at least 8 characters' });
    }
    if (currentPassword === newPassword) {
        return res.status(400).json({ msg: 'New password must differ from current password' });
    }

    try {
        const user = await prisma.user.findUnique({ where: { id: req.user.id } });
        if (!user) {
            return res.status(404).json({ msg: 'User not found' });
        }

        const isMatch = await bcrypt.compare(currentPassword, user.password);
        if (!isMatch) {
            return res.status(400).json({ msg: 'Current password is incorrect' });
        }

        const hashedPassword = await bcrypt.hash(newPassword, 10);
        await prisma.user.update({
            where: { id: req.user.id },
            data: { password: hashedPassword },
        });

        res.json({ msg: 'Password updated successfully' });
    } catch (err) {
        console.error(err.message);
        res.status(500).send('Server Error');
    }
});

// @route   GET /auth/users
// @desc    Get all users (Admin only)
router.get('/users', [authMiddleware, adminMiddleware], async (req, res) => {
    try {
        const users = await prisma.user.findMany({
            select: { id: true, username: true, role: true, created_at: true }
        });
        res.json(users);
    } catch (err) {
        console.error(err.message);
        res.status(500).send('Server Error');
    }
});

// @route   POST /auth/users
// @desc    Create a new user (Admin only)
router.post('/users', [authMiddleware, adminMiddleware], async (req, res) => {
    const { username, password, role } = req.body;
    const trimmedUsername = typeof username === 'string' ? username.trim() : '';
    const normalizedRole = ALLOWED_ROLES.has(role) ? role : 'viewer';

    if (trimmedUsername.length < 2) {
        return res.status(400).json({ msg: 'Username must be at least 2 characters' });
    }
    if (typeof password !== 'string' || password.length < 8) {
        return res.status(400).json({ msg: 'Password must be at least 8 characters' });
    }

    try {
        let user = await prisma.user.findUnique({ where: { username: trimmedUsername } });
        if (user) {
            return res.status(400).json({ msg: 'User already exists' });
        }

        const hashedPassword = await bcrypt.hash(password, 10);
        user = await prisma.user.create({
            data: {
                username: trimmedUsername,
                password: hashedPassword,
                role: normalizedRole
            },
            select: { id: true, username: true, role: true }
        });
        res.json(user);
    } catch (err) {
        console.error(err.message);
        res.status(500).send('Server Error');
    }
});

// @route   DELETE /auth/users/:id
// @desc    Delete a user (Admin only)
router.delete('/users/:id', [authMiddleware, adminMiddleware], async (req, res) => {
    try {
        if (req.params.id === req.user.id) {
            return res.status(400).json({ msg: 'Cannot delete yourself' });
        }
        await prisma.user.delete({ where: { id: req.params.id } });
        res.json({ msg: 'User removed' });
    } catch (err) {
        console.error(err.message);
        res.status(500).send('Server Error');
    }
});

export const authRouter = router;
