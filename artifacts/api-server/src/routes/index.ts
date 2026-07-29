import { Router, type IRouter } from "express";
import authRoutes from "./auth.js";
import usersRoutes from "./users.js";
import investmentPlansRoutes from "./investment-plans.js";
import investmentsRoutes from "./investments.js";
import depositRequestsRoutes from "./deposit-requests.js";
import withdrawalRequestsRoutes from "./withdrawal-requests.js";
import transactionsRoutes from "./transactions.js";

const router: IRouter = Router();

router.use(authRoutes);
router.use(usersRoutes);
router.use(investmentPlansRoutes);
router.use(investmentsRoutes);
router.use(depositRequestsRoutes);
router.use(withdrawalRequestsRoutes);
router.use(transactionsRoutes);

export default router;
