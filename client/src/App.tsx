import { Navigate, Route, Routes, useNavigate, useParams } from "react-router-dom";
import { generateRoomId } from "./lib/ids";
import { RoomPage } from "./pages/RoomPage";
import { useTheme } from "./theme/ThemeProvider";

/** Landing page: create or join a room. */
function Home() {
  const navigate = useNavigate();
  const { theme, toggle } = useTheme();

  const createRoom = () => navigate(`/room/${generateRoomId()}`);

  return (
    <div className="flex h-full flex-col items-center justify-center bg-slate-50 dark:bg-slate-900 px-4 text-center transition-theme">
      <button
        onClick={toggle}
        aria-label="Toggle theme"
        className="absolute right-4 top-4 rounded-lg p-2 text-slate-600 hover:bg-slate-200 dark:text-slate-300 dark:hover:bg-slate-800"
      >
        {theme === "dark" ? "☀️" : "🌙"}
      </button>

      <h1 className="mb-2 text-4xl font-extrabold text-slate-900 dark:text-white">
        <span className="text-blue-500">{"</>"}</span> CollabCode
      </h1>
      <p className="mb-8 max-w-md text-slate-500 dark:text-slate-400">
        Real-time collaborative code editor. Create a room and share the link to code
        together — edits, cursors, chat and output, all in sync.
      </p>
      <button
        onClick={createRoom}
        className="rounded-xl bg-blue-600 px-6 py-3 text-lg font-semibold text-white shadow-lg transition hover:bg-blue-700 focus:ring-2 focus:ring-blue-400"
      >
        Create a room
      </button>
    </div>
  );
}

/** Wrapper that reads the roomId param and renders the room. */
function RoomRoute() {
  const { roomId } = useParams<{ roomId: string }>();
  if (!roomId) return <Navigate to="/" replace />;
  return <RoomPage roomId={roomId} />;
}

export function App() {
  return (
    <Routes>
      <Route path="/" element={<Home />} />
      <Route path="/room/:roomId" element={<RoomRoute />} />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
