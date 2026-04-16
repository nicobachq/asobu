import { createFileRoute } from "@tanstack/react-router";
import { AppLayout } from "@/components/AppLayout";
import { Heart, MessageCircle, Share2, MoreHorizontal, Image, Video } from "lucide-react";

export const Route = createFileRoute("/feed")({
  component: FeedPage,
});

function FeedPage() {
  const posts = [
    {
      id: 1, author: "Sarah Martinez", handle: "@sarahm", avatar: "SM",
      time: "2h ago", content: "Just finished an incredible training session with the team. New season, new goals! 🏆",
      likes: 42, comments: 8, sport: "Football",
    },
    {
      id: 2, author: "Marcus Thompson", handle: "@mthompson", avatar: "MT",
      time: "4h ago", content: "Proud to announce I've been selected for the U21 national squad. Hard work pays off. Thank you to everyone who believed in me.",
      likes: 156, comments: 32, sport: "Basketball",
    },
    {
      id: 3, author: "Elite FC Academy", handle: "@elitefcacademy", avatar: "EF",
      time: "6h ago", content: "Open tryouts this Saturday! Looking for talented U16 and U18 players. Check our calendar for details.",
      likes: 89, comments: 15, sport: "Football", isOrg: true,
    },
  ];

  return (
    <AppLayout>
      <div className="max-w-2xl mx-auto">
        <div className="mb-8">
          <h1 className="font-heading text-2xl font-bold text-foreground tracking-tight">Feed</h1>
          <p className="text-[13px] text-muted-foreground mt-1">Latest from your network</p>
        </div>

        {/* Create post */}
        <div className="rounded-2xl border border-border bg-card p-5 mb-6">
          <div className="flex gap-3">
            <div className="w-10 h-10 rounded-full avatar-gradient flex items-center justify-center text-[11px] font-semibold text-primary-foreground shrink-0">
              NB
            </div>
            <div className="flex-1">
              <div className="rounded-xl bg-muted/50 px-4 py-3 text-sm text-muted-foreground cursor-text hover:bg-muted/70 transition-colors">
                Share an update...
              </div>
              <div className="flex items-center gap-4 mt-3">
                <button className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors">
                  <Image className="w-4 h-4" /> Photo
                </button>
                <button className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors">
                  <Video className="w-4 h-4" /> Video
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Posts */}
        <div className="space-y-4">
          {posts.map((post) => (
            <article
              key={post.id}
              className="rounded-2xl border border-border bg-card p-5 card-hover"
            >
              <div className="flex items-start gap-3">
                <div className={`w-10 h-10 rounded-full flex items-center justify-center text-[11px] font-semibold shrink-0 ${
                  post.isOrg
                    ? "avatar-gradient-subtle border border-primary/20"
                    : "avatar-gradient text-primary-foreground"
                }`}>
                  {post.avatar}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="font-heading text-[13px] font-semibold text-foreground">{post.author}</span>
                    <span className="text-[11px] text-muted-foreground">{post.handle}</span>
                    <span className="text-[11px] text-muted-foreground">·</span>
                    <span className="text-[11px] text-muted-foreground">{post.time}</span>
                  </div>
                  <span className="inline-block mt-1.5 px-2 py-0.5 rounded text-[10px] font-medium bg-primary/8 text-primary">
                    {post.sport}
                  </span>
                  <p className="mt-3 text-[13px] text-foreground/85 leading-relaxed">{post.content}</p>
                  <div className="flex items-center gap-6 mt-4 pt-3 border-t border-border">
                    <button className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-warm transition-colors">
                      <Heart className="w-3.5 h-3.5" /> {post.likes}
                    </button>
                    <button className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors">
                      <MessageCircle className="w-3.5 h-3.5" /> {post.comments}
                    </button>
                    <button className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors">
                      <Share2 className="w-3.5 h-3.5" /> Share
                    </button>
                    <button className="ml-auto text-muted-foreground hover:text-foreground transition-colors">
                      <MoreHorizontal className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              </div>
            </article>
          ))}
        </div>
      </div>
    </AppLayout>
  );
}
