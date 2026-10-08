import { Router, type IRouter } from "express";
import {
  BothostHealthCheckResponse,
  HealthCheckResponse,
} from "@workspace/api-zod";

const router: IRouter = Router();

router.get("/healthz", (_req, res) => {
  const data = HealthCheckResponse.parse({ status: "ok" });
  res.json(data);
});

router.get("/health", (_req, res) => {
  res.json(BothostHealthCheckResponse.parse({
    ok: true,
    service: "multi-tool-node-api",
  }));
});

export default router;
