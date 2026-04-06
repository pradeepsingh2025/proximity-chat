import "./db/connection.ts";
import express from "express";
import { createServer } from "http";
import { Server } from "socket.io";
import setupSocket from "./socket/socket.ts";
import cors from "cors";
import cookieParser from "cookie-parser";
import apiRouter from "./api/index.ts";

const app = express();

app.use(cors({
    origin: "http://localhost:5173",
    credentials: true,
}));
app.use(express.json());
app.use(cookieParser());

app.use("/api", apiRouter);

const server = createServer(app);
const io = new Server(server, {
    cors: {
        origin: "http://localhost:5173",
        methods: ["GET", "POST"],
        credentials: true
    }
});

setupSocket(io);

server.listen(3000, () => {
    console.log('Server is running on port 3000');
});