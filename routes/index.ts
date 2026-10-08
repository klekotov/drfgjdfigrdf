import { Router, type IRouter } from "express";
import healthRouter from "./health";
import cookieCheckerRouter from "./cookie-checker";

const router: IRouter = Router();

router.use(healthRouter);
router.use(cookieCheckerRouter);

export default router;
