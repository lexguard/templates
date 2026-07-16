import { Link, useParams } from "wouter";
import { findProjectBySlug, findVideoBySlug } from "../data/videos";
import { VideoPlayer } from "./VideoPlayer";

export function PlayPage() {
  const { projectSlug, videoSlug } = useParams<{
    projectSlug: string;
    videoSlug: string;
  }>();
  const project = findProjectBySlug(projectSlug);
  const video = project ? findVideoBySlug(project, videoSlug) : undefined;

  if (!project || !video) {
    return (
      <div className="max-w-4xl mx-auto px-6 py-20 text-center">
        <h1 className="text-4xl font-bold mb-4">404</h1>
        <p className="text-muted-foreground mb-6">Video not found.</p>
        <Link href="/" className="text-primary hover:underline">
          Go home
        </Link>
      </div>
    );
  }

  return (
    <div className="min-h-screen">
      <div className="max-w-6xl mx-auto px-4 md:px-8 py-4 md:py-8">
        <div className="mb-4 flex items-center gap-3">
          <Link
            href={`/${project.slug}/${video.slug}`}
            className="text-sm text-muted-foreground hover:underline"
          >
            ← {video.title}
          </Link>
        </div>
      </div>
      <VideoPlayer
        video={video}
        onClose={() => {
          window.location.href = `/${project.slug}/${video.slug}`;
        }}
      />
    </div>
  );
}
