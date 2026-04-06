import { Router } from "express";
import { login } from "./auth/login.ts";
import { signup } from "./auth/signup.ts";
import { refreshToken } from "./auth/refresh.ts";

const router = Router();

router.post("/auth/login", login);
router.post("/auth/signup", signup);
router.post("/auth/refresh", refreshToken);

export default router;
