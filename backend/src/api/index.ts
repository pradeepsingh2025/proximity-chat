import { Router } from "express";
import { login } from "./auth/login.ts";
import { signup } from "./auth/signup.ts";
import { refreshToken } from "./auth/refresh.ts";

import { logout } from "./auth/logout.ts";
import chatsRouter from "./chats/index.ts";

const router = Router();

router.post("/auth/login", login);
router.post("/auth/signup", signup);
router.post("/auth/refresh", refreshToken);
router.post("/auth/logout", logout);

router.use("/chats", chatsRouter);

export default router;
