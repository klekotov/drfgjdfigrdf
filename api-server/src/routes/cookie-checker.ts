import { Router, type IRouter, type Response } from "express";
import {
  CheckCookieFullBody,
  CheckCookieFullResponse,
  CheckCookiesFullBody,
  CheckCookiesFullResponse,
  RefreshCookieBody,
  RefreshCookieResponse,
  RefreshCookiesBody,
  RefreshCookiesResponse,
  ValidateCookieBody,
  ValidateCookieResponse,
  ValidateCookiesBody,
  ValidateCookiesResponse,
} from "@workspace/api-zod";
import {
  checkCookieFull,
  checkSingleCookie,
  checkCookiesBasic,
  checkCookiesBatch,
  refreshCookie,
  refreshCookiesBatch,
} from "../lib/cookie-checker";

const router: IRouter = Router();

router.use((_req, res, next) => {
  res.setHeader("Cache-Control", "no-store");
  next();
});

function invalidBody(res: Response): void {
  res.status(400).json({ ok: false, error: "Invalid request body" });
}

router.post("/validate", async (req, res): Promise<void> => {
  const body = ValidateCookieBody.safeParse(req.body);
  if (!body.success) {
    invalidBody(res);
    return;
  }

  res.json(ValidateCookieResponse.parse(
    await checkSingleCookie(body.data.cookie),
  ));
});

router.post("/validate-batch", async (req, res): Promise<void> => {
  const body = ValidateCookiesBody.safeParse(req.body);
  if (!body.success) {
    invalidBody(res);
    return;
  }

  res.json(ValidateCookiesResponse.parse(
    await checkCookiesBasic(body.data.cookies),
  ));
});

router.post("/refresh", async (req, res): Promise<void> => {
  const body = RefreshCookieBody.safeParse(req.body);
  if (!body.success) {
    invalidBody(res);
    return;
  }

  res.json(RefreshCookieResponse.parse(
    await refreshCookie(body.data.cookie),
  ));
});

router.post("/refresh-batch", async (req, res): Promise<void> => {
  const body = RefreshCookiesBody.safeParse(req.body);
  if (!body.success) {
    invalidBody(res);
    return;
  }

  res.json(RefreshCookiesResponse.parse(
    await refreshCookiesBatch(body.data.cookies),
  ));
});

router.post("/check-full", async (req, res): Promise<void> => {
  const body = CheckCookieFullBody.safeParse(req.body);
  if (!body.success) {
    invalidBody(res);
    return;
  }

  res.json(CheckCookieFullResponse.parse(
    await checkCookieFull(
      body.data.cookie,
      body.data.gameIds ?? [],
      body.data.gameChecks ?? [],
    ),
  ));
});

router.post("/check-full-batch", async (req, res): Promise<void> => {
  const body = CheckCookiesFullBody.safeParse(req.body);
  if (!body.success) {
    invalidBody(res);
    return;
  }

  res.json(CheckCookiesFullResponse.parse(
    await checkCookiesBatch(
      body.data.cookies,
      body.data.gameIds ?? [],
      body.data.gameChecks ?? [],
    ),
  ));
});

export default router;