import { Routes, Route } from "react-router-dom";
import Navbar from "./components/Navbar";
import FeedPage from "./pages/FeedPage";
import ProfilePage from "./pages/ProfilePage";
import MessagesPage from "./pages/MessagesPage";

function App() {
  return (
    <div className="min-h-screen bg-slate-100 text-slate-900">
      <Navbar />

      <Routes>
        <Route path="/" element={<FeedPage />} />
        <Route path="/profile" element={<ProfilePage />} />
        <Route path="/messages" element={<MessagesPage />} />
      </Routes>
    </div>
  );
}

export default App;