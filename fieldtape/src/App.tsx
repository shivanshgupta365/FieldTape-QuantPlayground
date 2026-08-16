import { Navigate, Route, Routes } from "react-router-dom";
import { lazy, Suspense } from "react";
import { AppShell } from "./components/AppShell";
import { EntryGate } from "./components/EntryGate";

const LandingPage = lazy(() => import("./pages/LandingPage").then((module) => ({ default: module.LandingPage })));
const PlayPage = lazy(() => import("./pages/PlayPage").then((module) => ({ default: module.PlayPage })));
const WatchPage = lazy(() => import("./pages/WatchPage").then((module) => ({ default: module.WatchPage })));
const LabIndexPage = lazy(() => import("./pages/LabIndexPage").then((module) => ({ default: module.LabIndexPage })));
const LearnPage = lazy(() => import("./pages/LearnPage").then((module) => ({ default: module.LearnPage })));
const FieldcraftPage = lazy(() => import("./pages/FieldcraftPage").then((module) => ({ default: module.FieldcraftPage })));
const LabModulePage = lazy(() => import("./pages/LabModulePage").then((module) => ({ default: module.LabModulePage })));
const ResearchPage = lazy(() => import("./pages/ResearchPage").then((module) => ({ default: module.ResearchPage })));
const DailyPage = lazy(() => import("./pages/DailyPage").then((module) => ({ default: module.DailyPage })));
const LeaderboardPage = lazy(() => import("./pages/LeaderboardPage").then((module) => ({ default: module.LeaderboardPage })));
const ProfilePage = lazy(() => import("./pages/ProfilePage").then((module) => ({ default: module.ProfilePage })));
const HowToPlayPage = lazy(() => import("./pages/HowToPlayPage").then((m) => ({ default: m.HowToPlayPage })));
const VillagePage = lazy(() => import("./pages/VillagePage").then((m) => ({ default: m.VillagePage })));
const StoryPage = lazy(() => import("./pages/StoryPage").then((module) => ({ default: module.StoryPage })));
const JoinPage = lazy(() => import("./pages/JoinPage").then((module) => ({ default: module.JoinPage })));

/* Dev-only. import.meta.env.DEV is statically false in a production build, so
   Rollup drops both the route and the chunk entirely. Verified by check:public. */
const CapturePage = import.meta.env.DEV
  ? lazy(() => import("./pages/CapturePage").then((module) => ({ default: module.CapturePage })))
  : null;

function LoadingTape() {
  return <div className="loading-tape" role="status"><span>ALPSTEAD</span><i /><small>loading deterministic state…</small></div>;
}

export function App() {
  return (
    <Suspense fallback={<LoadingTape />}><Routes>
      <Route path="/" element={<LandingPage />} />
      <Route path="/join" element={<JoinPage />} />
      <Route element={<AppShell />}>
        <Route path="/leaderboard" element={<LeaderboardPage />} />
        <Route path="/learn" element={<LearnPage />} />
        <Route path="/fieldcraft" element={<FieldcraftPage />} />
      </Route>
      <Route element={<EntryGate><AppShell /></EntryGate>}>
        <Route path="/play" element={<PlayPage />} />
        <Route path="/how-to-play" element={<HowToPlayPage />} />
        <Route path="/village" element={<VillagePage />} />
        <Route path="/watch" element={<WatchPage />} />
        <Route path="/lab" element={<LabIndexPage />} />
        <Route path="/lab/:moduleId" element={<LabModulePage />} />
        <Route path="/research" element={<ResearchPage />} />
        <Route path="/daily" element={<DailyPage />} />
        <Route path="/profile" element={<ProfilePage />} />
        <Route path="/story" element={<StoryPage />} />
      </Route>
      {CapturePage && <Route path="/capture" element={<CapturePage />} />}
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes></Suspense>
  );
}
