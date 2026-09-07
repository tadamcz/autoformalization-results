import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { RouterProvider, createHashRouter } from "react-router";
import "katex/dist/katex.min.css";
import "./styles/global.css";
import "./styles/print.css";
import { AboutPage } from "./routes/AboutPage";
import { EntryPage } from "./routes/EntryPage";
import { ListPage } from "./routes/ListPage";
import { NotFound } from "./routes/NotFound";
import { SharedDefPage, SharedDefsPage } from "./routes/SharedDefsPage";

const router = createHashRouter([
  { path: "/", element: <ListPage /> },
  { path: "/p/:id", element: <EntryPage /> },
  { path: "/defs", element: <SharedDefsPage /> },
  { path: "/defs/:id", element: <SharedDefPage /> },
  { path: "/about", element: <AboutPage /> },
  { path: "*", element: <NotFound /> },
]);

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <RouterProvider router={router} />
  </StrictMode>,
);
