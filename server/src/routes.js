import { Router } from 'express';
import { adminRoutes } from './modules/admin/admin.routes.js';
import { aiRoutes } from './modules/ai/ai.routes.js';
import { authRoutes } from './modules/auth/auth.routes.js';
import { blocksRoutes } from './modules/blocks/blocks.routes.js';
import { connectionsRoutes } from './modules/connections/connections.routes.js';
import { dashboardRoutes } from './modules/dashboard/dashboard.routes.js';
import { directoryRoutes } from './modules/directory/directory.routes.js';
import { groupsRoutes } from './modules/groups/groups.routes.js';
import { meRoutes } from './modules/me/me.routes.js';
import { messagesRoutes } from './modules/messages/messages.routes.js';
import { opportunitiesRoutes } from './modules/opportunities/opportunities.routes.js';
import { reportsRoutes } from './modules/reports/reports.routes.js';
import { usersRoutes } from './modules/users/users.routes.js';

export const apiRouter = Router();

apiRouter.use('/auth', authRoutes);
apiRouter.use('/me', meRoutes);
apiRouter.use('/users', usersRoutes);
apiRouter.use('/directory', directoryRoutes);
apiRouter.use('/connections', connectionsRoutes);
apiRouter.use('/blocks', blocksRoutes);
apiRouter.use('/groups', groupsRoutes);
apiRouter.use('/opportunities', opportunitiesRoutes);
apiRouter.use('/reports', reportsRoutes);
apiRouter.use('/dashboard', dashboardRoutes);
apiRouter.use('/ai', aiRoutes);
apiRouter.use('/admin', adminRoutes);
apiRouter.use(messagesRoutes); // /messages and /conversations
