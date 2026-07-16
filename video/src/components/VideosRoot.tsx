import { PBProvider } from "../lib/pb";
import VideoApp from "../app/VideoApp";

export default function VideosRoot() {
  return (
    <PBProvider>
      <VideoApp />
    </PBProvider>
  );
}
