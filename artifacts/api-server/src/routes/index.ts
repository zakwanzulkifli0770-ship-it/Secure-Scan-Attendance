import { Router, type IRouter } from "express";
import healthRouter from "./health";
import authRouter from "./auth";
import employeesRouter from "./employees";
import qrRouter from "./qr";
import attendanceRouter from "./attendance";
import adminRouter from "./admin";
import uploadsRouter from "./uploads";

const router: IRouter = Router();

router.use(healthRouter);
router.use(authRouter);
router.use(employeesRouter);
router.use(qrRouter);
router.use(attendanceRouter);
router.use(adminRouter);
router.use(uploadsRouter);

export default router;
