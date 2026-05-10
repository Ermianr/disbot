import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { getHealth } from "../lib/api";

function IndexComponent() {
  const [status, setStatus] = useState<string>("loading");

  useEffect(() => {
    const apiUrl = import.meta.env.VITE_API_URL || "http://localhost:3000";
    getHealth(apiUrl)
      .then((data) => setStatus(data.status))
      .catch(() => setStatus("error"));
  }, []);

  return <div>API Status: {status}</div>;
}

export const Route = createFileRoute("/")({
  component: IndexComponent,
});
