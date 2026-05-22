"use client";

import { useEffect } from "react";
import { io, Socket } from "socket.io-client";

let socket: Socket | null = null;

export function useExecutionStream(onEvent: (type: string, payload: any) => void) {
  useEffect(() => {
    const wsBase =
      process.env.NEXT_PUBLIC_WS_URL ||
      (typeof window !== "undefined"
        ? window.location.origin.replace(/^http/, "ws")
        : "ws://localhost");
    socket = io(`${wsBase}/runtime`, {
      transports: ["websocket"],
    });

    const statusHandler = (payload: any) => onEvent("execution:status", payload);
    const queuedHandler = (payload: any) => onEvent("execution:queued", payload);
    const logHandler = (payload: any) => onEvent("execution:log", payload);

    socket.on("execution:status", statusHandler);
    socket.on("execution:queued", queuedHandler);
    socket.on("execution:log", logHandler);

    socket.emit("execution:subscribe", {});

    return () => {
      socket?.off("execution:status", statusHandler);
      socket?.off("execution:queued", queuedHandler);
      socket?.off("execution:log", logHandler);
      socket?.disconnect();
    };
  }, [onEvent]);
}
