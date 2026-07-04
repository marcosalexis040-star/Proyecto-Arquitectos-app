import { Router } from "express";
import { generateSpec } from "../controllers/spec.controller.js";

const router = Router();

router.post("/generate-spec", generateSpec);

export default router;
